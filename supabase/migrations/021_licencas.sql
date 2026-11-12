-- M8 fase 8a: várias arenas com licença (mensal/trimestral/semestral/anual)
-- Regras: aviso 4 dias antes · 5 dias de tolerância · depois só consulta · após 3 meses pode apagar (dono confirma)

-- Endereço do site da arena (subdomínio na fase 8b). Público: só o "apelido".
alter table public.arenas add column if not exists slug text;
alter table public.arenas drop constraint if exists arenas_slug_formato,
  add constraint arenas_slug_formato check (slug is null or slug ~ '^[a-z0-9]([a-z0-9-]{1,38}[a-z0-9])$');
create unique index if not exists arenas_slug_unico on public.arenas (slug);

-- Donos do sistema (quem vende as licenças)
create table if not exists public.donos_sistema (
  user_id uuid primary key references auth.users on delete cascade,
  criado_em timestamptz not null default now()
);
alter table public.donos_sistema enable row level security;
drop policy if exists "dono vê a si mesmo" on public.donos_sistema;
create policy "dono vê a si mesmo" on public.donos_sistema for select to authenticated using (user_id = (select auth.uid()));

create or replace function privado.sou_dono() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.donos_sistema where user_id = (select auth.uid()));
$$;

-- Hoje no fuso da arena
create or replace function privado.hoje() returns date
language sql stable set search_path = '' as $$ select (now() at time zone 'America/Fortaleza')::date $$;

-- Licença de cada arena (vence_em vazio = sem vencimento, ex.: cortesia)
create table if not exists public.licencas (
  arena_id uuid primary key references public.arenas on delete cascade,
  plano text not null default 'mensal' check (plano in ('mensal', 'trimestral', 'semestral', 'anual', 'cortesia')),
  valor numeric(10, 2) not null default 0 check (valor >= 0),
  vence_em date,
  responsavel text,
  contato text,
  obs text,
  asaas_cliente_id text,
  asaas_assinatura_id text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
alter table public.licencas enable row level security;
drop policy if exists "arena vê a própria licença" on public.licencas;
create policy "arena vê a própria licença" on public.licencas for select to authenticated
  using (arena_id in (select privado.minhas_arenas()) or (select privado.sou_dono()));
drop policy if exists "dono gerencia licenças" on public.licencas;
create policy "dono gerencia licenças" on public.licencas for all to authenticated
  using ((select privado.sou_dono())) with check ((select privado.sou_dono()));

-- Pagamentos das licenças (histórico)
create table if not exists public.licenca_pagamentos (
  id uuid primary key default gen_random_uuid(),
  arena_id uuid not null references public.arenas on delete cascade,
  plano text not null,
  meses smallint not null check (meses between 1 and 36),
  valor numeric(10, 2) not null check (valor >= 0),
  pago_em date not null default privado.hoje(),
  vence_antes date,
  vence_depois date not null,
  origem text not null default 'manual' check (origem in ('manual', 'asaas')),
  referencia text,
  obs text,
  criado_em timestamptz not null default now()
);
create index if not exists licenca_pagamentos_arena on public.licenca_pagamentos (arena_id, pago_em desc);
alter table public.licenca_pagamentos enable row level security;
drop policy if exists "arena vê seus pagamentos" on public.licenca_pagamentos;
create policy "arena vê seus pagamentos" on public.licenca_pagamentos for select to authenticated
  using (arena_id in (select privado.minhas_arenas()) or (select privado.sou_dono()));
-- Escrita só pelas funções abaixo (sem policy de insert/update/delete)

-- Situação: ativa · avisar (≤4 dias) · tolerancia (até 5 dias vencida) · consulta (só leitura) · apagar (3 meses em só leitura)
create or replace function privado.situacao_licenca(p_vence date) returns text
language sql stable set search_path = '' as $$
  select case
    when p_vence is null then 'ativa'
    when privado.hoje() <= p_vence - 5 then 'ativa'
    when privado.hoje() <= p_vence then 'avisar'
    when privado.hoje() <= p_vence + 5 then 'tolerancia'
    when privado.hoje() <= p_vence + 5 + 90 then 'consulta'
    else 'apagar'
  end
$$;

-- Arenas onde o usuário pode LANÇAR (licença em dia ou na tolerância)
create or replace function privado.arenas_escrita() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select m.arena_id from public.membros m
  left join public.licencas l on l.arena_id = m.arena_id
  where m.user_id = (select auth.uid())
    and privado.situacao_licenca(l.vence_em) in ('ativa', 'avisar', 'tolerancia')
$$;

-- Toda regra de gravar/editar/apagar passa a exigir licença em dia (leitura continua liberada)
do $$
declare p record; v_using text; v_check text;
begin
  for p in
    select tablename, policyname, qual, with_check from pg_policies
    where schemaname = 'public' and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
      and coalesce(qual, '') || coalesce(with_check, '') like '%privado.minhas_arenas()%'
  loop
    v_using := replace(p.qual, 'privado.minhas_arenas()', 'privado.arenas_escrita()');
    v_check := replace(p.with_check, 'privado.minhas_arenas()', 'privado.arenas_escrita()');
    execute format('alter policy %I on public.%I %s %s', p.policyname, p.tablename,
      case when v_using is not null then format('using (%s)', v_using) else '' end,
      case when v_check is not null then format('with check (%s)', v_check) else '' end);
  end loop;
end $$;

-- Pagamento de licença: soma os meses a partir do vencimento (ou de hoje, se já venceu)
create or replace function public.registrar_pagamento_licenca(p_arena uuid, p_plano text, p_valor numeric, p_pago_em date default null, p_obs text default null)
returns date language plpgsql security definer set search_path = '' as $$
declare v_meses int; v_antes date; v_depois date;
begin
  if not privado.sou_dono() then raise exception 'Só o dono do sistema registra pagamentos.'; end if;
  v_meses := case p_plano when 'mensal' then 1 when 'trimestral' then 3 when 'semestral' then 6 when 'anual' then 12 end;
  if v_meses is null then raise exception 'Plano inválido.'; end if;
  select vence_em into v_antes from public.licencas where arena_id = p_arena for update;
  if not found then raise exception 'Arena sem licença.'; end if;
  v_depois := (greatest(coalesce(v_antes, privado.hoje()), privado.hoje()) + make_interval(months => v_meses))::date;
  insert into public.licenca_pagamentos (arena_id, plano, meses, valor, pago_em, vence_antes, vence_depois, obs)
    values (p_arena, p_plano, v_meses, coalesce(p_valor, 0), coalesce(p_pago_em, privado.hoje()), v_antes, v_depois, nullif(trim(p_obs), ''));
  update public.licencas set plano = p_plano, valor = coalesce(p_valor, valor), vence_em = v_depois, atualizado_em = now() where arena_id = p_arena;
  return v_depois;
end $$;
revoke all on function public.registrar_pagamento_licenca(uuid, text, numeric, date, text) from public, anon;
grant execute on function public.registrar_pagamento_licenca(uuid, text, numeric, date, text) to authenticated;

-- Nova arena (dono): arena + licença + horários + configuração do programa dos PCs
create or replace function public.criar_arena(p_nome text, p_slug text, p_whatsapp text, p_plano text, p_valor numeric, p_vence_em date, p_responsavel text default null, p_contato text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not privado.sou_dono() then raise exception 'Só o dono do sistema cria arenas.'; end if;
  insert into public.arenas (nome, slug, whatsapp) values (trim(p_nome), nullif(lower(trim(p_slug)), ''), nullif(p_whatsapp, '')) returning id into v_id;
  insert into public.licencas (arena_id, plano, valor, vence_em, responsavel, contato)
    values (v_id, p_plano, coalesce(p_valor, 0), p_vence_em, nullif(trim(p_responsavel), ''), nullif(trim(p_contato), ''));
  insert into public.horarios (arena_id, dia, fechado, abre, fecha)
    select v_id, d, false, '14:00', '23:00' from generate_series(0, 6) d;
  insert into public.agente_config (arena_id, senha_mestre_hash) values (v_id, extensions.crypt('102030', extensions.gen_salt('bf'))); -- senha mestre padrão
  return v_id;
end $$;
revoke all on function public.criar_arena(text, text, text, text, numeric, date, text, text) from public, anon;
grant execute on function public.criar_arena(text, text, text, text, numeric, date, text, text) to authenticated;

-- Liga um login (admin) a uma arena (dono)
create or replace function public.vincular_admin(p_arena uuid, p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not privado.sou_dono() then raise exception 'Só o dono do sistema vincula admins.'; end if;
  insert into public.membros (user_id, arena_id, papel) values (p_user, p_arena, 'admin') on conflict do nothing;
end $$;
revoke all on function public.vincular_admin(uuid, uuid) from public, anon;
grant execute on function public.vincular_admin(uuid, uuid) to authenticated;

-- Apagar arena (dono): só se estiver em "apagar" e com o nome digitado certo. Apaga tudo (cascata).
create or replace function public.apagar_arena(p_arena uuid, p_confirma_nome text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_nome text; v_vence date;
begin
  if not privado.sou_dono() then raise exception 'Só o dono do sistema apaga arenas.'; end if;
  select a.nome, l.vence_em into v_nome, v_vence from public.arenas a left join public.licencas l on l.arena_id = a.id where a.id = p_arena;
  if v_nome is null then raise exception 'Arena não encontrada.'; end if;
  if privado.situacao_licenca(v_vence) <> 'apagar' then raise exception 'Só dá para apagar 3 meses depois de a licença ficar só para consulta.'; end if;
  if trim(p_confirma_nome) <> v_nome then raise exception 'Nome digitado não confere.'; end if;
  delete from public.arenas where id = p_arena;
end $$;
revoke all on function public.apagar_arena(uuid, text) from public, anon;
grant execute on function public.apagar_arena(uuid, text) to authenticated;

-- Licença atual + situação (painel da arena e do dono)
create or replace function public.licenca_situacao(p_arena uuid)
returns table (plano text, vence_em date, situacao text, dias int)
language sql stable security definer set search_path = '' as $$
  select l.plano, l.vence_em, privado.situacao_licenca(l.vence_em), (l.vence_em - privado.hoje())::int
  from public.licencas l
  where l.arena_id = p_arena and (p_arena in (select privado.minhas_arenas()) or privado.sou_dono());
$$;
revoke all on function public.licenca_situacao(uuid) from public, anon;
grant execute on function public.licenca_situacao(uuid) to authenticated;

-- Arena Storm (a primeira): cortesia, sem vencimento, endereço "arenastorm"
update public.arenas set slug = 'arenastorm' where id = 'bef31925-8dea-4578-9e4c-3de3e956796c' and slug is null;
insert into public.licencas (arena_id, plano, vence_em, obs)
  values ('bef31925-8dea-4578-9e4c-3de3e956796c', 'cortesia', null, 'Arena do dono do sistema')
  on conflict (arena_id) do nothing;
-- Dono do sistema: o admin da Arena Storm
insert into public.donos_sistema (user_id) values ('9ebdf0d5-0b95-466c-9b3b-8c64258f3c5b') on conflict do nothing;
