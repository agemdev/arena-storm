-- M8 fase 8c: cobrança automática das licenças pelo Asaas
-- O Asaas avisa (webhook) → public.asaas_evento confere o código secreto → renova a licença sozinha.

alter table public.licencas
  add column if not exists cpf_cnpj text,
  add column if not exists email text,
  add column if not exists celular text,
  add column if not exists cobranca_id text,        -- cobrança em aberto no Asaas
  add column if not exists cobranca_vence date,
  add column if not exists link_pagamento text;     -- fatura (Pix/boleto/cartão) para o botão "Pagar agora"

-- Mesmo pagamento do Asaas nunca renova duas vezes
create unique index if not exists licenca_pagamentos_ref_unica on public.licenca_pagamentos (referencia) where origem = 'asaas';

-- Configurações secretas do sistema (schema privado: não aparece na API)
create table if not exists privado.config_sistema (
  chave text primary key,
  valor text not null,
  atualizado_em timestamptz not null default now()
);
revoke all on privado.config_sistema from public, anon, authenticated;

-- Dono gera o código do webhook (mostrado uma vez; no banco fica só o "resumo" sha256)
create or replace function public.gerar_token_asaas() returns text
language plpgsql security definer set search_path = '' as $$
declare v_token text := encode(extensions.gen_random_bytes(24), 'hex');
begin
  if not privado.sou_dono() then raise exception 'Só o dono do sistema.'; end if;
  insert into privado.config_sistema (chave, valor) values ('asaas_token_sha256', encode(extensions.digest(v_token, 'sha256'), 'hex'))
    on conflict (chave) do update set valor = excluded.valor, atualizado_em = now();
  return v_token;
end $$;
revoke all on function public.gerar_token_asaas() from public, anon;
grant execute on function public.gerar_token_asaas() to authenticated;

create or replace function public.token_asaas_definido() returns boolean
language sql stable security definer set search_path = '' as $$
  select privado.sou_dono() and exists (select 1 from privado.config_sistema where chave = 'asaas_token_sha256');
$$;
revoke all on function public.token_asaas_definido() from public, anon;
grant execute on function public.token_asaas_definido() to authenticated;

-- Aviso do Asaas (chamado pelo site em /api/asaas, sem login). Devolve o que foi feito.
create or replace function public.asaas_evento(p_token text, p_evento text, p_pagamento jsonb)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_hash text;
  l record;
  v_meses int;
  v_depois date;
  v_pag_id text := p_pagamento ->> 'id';
begin
  select valor into v_hash from privado.config_sistema where chave = 'asaas_token_sha256';
  if v_hash is null or p_token is null or encode(extensions.digest(p_token, 'sha256'), 'hex') <> v_hash then
    raise exception 'token inválido' using errcode = '28000';
  end if;
  if v_pag_id is null then return 'sem cobrança'; end if;

  -- Qual arena: pela assinatura; senão pela referência (id da arena)
  select * into l from public.licencas
   where (asaas_assinatura_id is not null and asaas_assinatura_id = p_pagamento ->> 'subscription')
      or arena_id::text = coalesce(p_pagamento ->> 'externalReference', '-')
   limit 1 for update;
  if not found then return 'arena não encontrada'; end if;

  if p_evento in ('PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED') then
    if exists (select 1 from public.licenca_pagamentos where origem = 'asaas' and referencia = v_pag_id) then
      return 'já registrado';
    end if;
    v_meses := case l.plano when 'mensal' then 1 when 'trimestral' then 3 when 'semestral' then 6 when 'anual' then 12 else 1 end;
    v_depois := (greatest(coalesce(l.vence_em, privado.hoje()), privado.hoje()) + make_interval(months => v_meses))::date;
    insert into public.licenca_pagamentos (arena_id, plano, meses, valor, pago_em, vence_antes, vence_depois, origem, referencia, obs)
      values (l.arena_id, l.plano, v_meses, coalesce((p_pagamento ->> 'value')::numeric, 0),
              coalesce((p_pagamento ->> 'clientPaymentDate')::date, (p_pagamento ->> 'paymentDate')::date, privado.hoje()),
              l.vence_em, v_depois, 'asaas', v_pag_id, p_pagamento ->> 'billingType');
    update public.licencas set vence_em = v_depois, atualizado_em = now(),
      cobranca_id = null, cobranca_vence = null, link_pagamento = null
     where arena_id = l.arena_id;
    return 'renovada até ' || v_depois;
  elsif p_evento in ('PAYMENT_CREATED', 'PAYMENT_UPDATED', 'PAYMENT_OVERDUE', 'PAYMENT_RESTORED') then
    update public.licencas set cobranca_id = v_pag_id, cobranca_vence = (p_pagamento ->> 'dueDate')::date,
      link_pagamento = p_pagamento ->> 'invoiceUrl', atualizado_em = now()
     where arena_id = l.arena_id;
    return 'cobrança em aberto';
  elsif p_evento in ('PAYMENT_DELETED', 'PAYMENT_REFUNDED') then
    update public.licencas set cobranca_id = null, cobranca_vence = null, link_pagamento = null,
      obs = case when p_evento = 'PAYMENT_REFUNDED' then concat_ws(' · ', obs, 'Estorno no Asaas ' || v_pag_id) else obs end
     where arena_id = l.arena_id and (cobranca_id = v_pag_id or p_evento = 'PAYMENT_REFUNDED');
    return 'cobrança removida';
  end if;
  return 'ignorado';
end $$;
revoke all on function public.asaas_evento(text, text, jsonb) from public;
grant execute on function public.asaas_evento(text, text, jsonb) to anon, authenticated;

-- Situação da licença + link para pagar (painel da arena)
drop function if exists public.licenca_situacao(uuid);
create function public.licenca_situacao(p_arena uuid)
returns table (plano text, vence_em date, situacao text, dias int, link_pagamento text)
language sql stable security definer set search_path = '' as $$
  select l.plano, l.vence_em, privado.situacao_licenca(l.vence_em), (l.vence_em - privado.hoje())::int, l.link_pagamento
  from public.licencas l
  where l.arena_id = p_arena and (p_arena in (select privado.minhas_arenas()) or privado.sou_dono());
$$;
revoke all on function public.licenca_situacao(uuid) from public, anon;
grant execute on function public.licenca_situacao(uuid) to authenticated;

-- Lista do dono: + dados de cobrança
drop function if exists public.arenas_do_sistema();
create function public.arenas_do_sistema()
returns table (id uuid, nome text, slug text, whatsapp text, plano text, valor numeric, vence_em date, situacao text, dias int,
               responsavel text, contato text, obs text, admins text, criado_em timestamptz,
               cpf_cnpj text, email text, celular text, asaas_assinatura_id text, cobranca_vence date, link_pagamento text)
language sql stable security definer set search_path = '' as $$
  select a.id, a.nome, a.slug, a.whatsapp, l.plano, l.valor, l.vence_em, privado.situacao_licenca(l.vence_em), (l.vence_em - privado.hoje())::int,
         l.responsavel, l.contato, l.obs,
         (select string_agg(u.email, ', ' order by u.email) from public.membros m join auth.users u on u.id = m.user_id where m.arena_id = a.id),
         a.criado_em, l.cpf_cnpj, l.email, l.celular, l.asaas_assinatura_id, l.cobranca_vence, l.link_pagamento
  from public.arenas a left join public.licencas l on l.arena_id = a.id
  where privado.sou_dono()
  order by l.vence_em nulls last, a.nome;
$$;
revoke all on function public.arenas_do_sistema() from public, anon;
grant execute on function public.arenas_do_sistema() to authenticated;
