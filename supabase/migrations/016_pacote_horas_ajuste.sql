-- Pacote de horas (saldo de TEMPO separado dos minutos de bônus) + ajuste manual de saldo

-- 1) Minutos de bônus: o admin pode ajustar à mão (com motivo). Débitos de uso continuam automáticos.
drop policy "admin dá promoção" on public.minutos_lancamentos;
create policy "admin lança promoção ou ajuste" on public.minutos_lancamentos for insert to authenticated
  with check (
    arena_id in (select privado.minhas_arenas())
    and pagamento_id is null and atendimento_id is null
    and length(trim(coalesce(obs, ''))) >= 3
    and ((motivo = 'promocao' and minutos between 1 and 10000) or (motivo = 'ajuste' and minutos between -100000 and 100000))
  );

-- 2) Plano que é pacote: quantos minutos de jogo ele dá (ex.: Passaporte 5h = 300)
alter table public.planos add column pacote_minutos integer check (pacote_minutos > 0);
update public.planos set pacote_minutos = 300 where nome ilike 'passaporte 5h%' and pacote_minutos is null;

-- 3) Extrato do pacote de horas (ledger: nunca editar saldo direto)
create table public.pacote_lancamentos (
  id uuid primary key default gen_random_uuid(),
  arena_id uuid not null references public.arenas (id) on delete cascade,
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  minutos integer not null check (minutos <> 0), -- minutos de jogo: + compra / - uso
  motivo text not null check (motivo in ('compra', 'uso', 'estorno', 'ajuste')),
  plano_id uuid references public.planos (id) on delete set null,
  pagamento_id uuid references public.pagamentos (id) on delete set null,
  atendimento_id uuid references public.atendimentos (id) on delete set null,
  obs text,
  criado_em timestamptz not null default now()
);
create index pacote_cliente_idx on public.pacote_lancamentos (cliente_id);
alter table public.pacote_lancamentos enable row level security;
create policy "admin lê" on public.pacote_lancamentos for select to authenticated
  using (arena_id in (select privado.minhas_arenas()));
-- O admin lança compra, estorno de compra e ajuste (o uso é sempre automático)
create policy "admin lança compra ou ajuste" on public.pacote_lancamentos for insert to authenticated
  with check (
    arena_id in (select privado.minhas_arenas())
    and pagamento_id is null
    and (
      (motivo = 'compra' and minutos > 0)
      or (motivo = 'estorno' and minutos < 0)
      or (motivo = 'ajuste' and length(trim(coalesce(obs, ''))) >= 3)
    )
  );

create view public.pacote_saldos with (security_invoker = true) as
  select arena_id, cliente_id, sum(minutos)::integer as saldo
  from public.pacote_lancamentos group by arena_id, cliente_id;

-- 4) Pagamento com pacote: forma "pacote" + quantos minutos de jogo cobriu
alter table public.pagamentos drop constraint pagamentos_forma_check;
alter table public.pagamentos
  add constraint pagamentos_forma_check check (forma in ('dinheiro', 'pix', 'cartao', 'minutos', 'pacote')),
  add column minutos_pacote integer check (minutos_pacote > 0),
  add constraint pagamentos_pacote_minutos check (forma <> 'pacote' or minutos_pacote is not null);

-- 5) Atendimento marcado para usar o pacote de alguém
alter table public.atendimentos add column pacote_de uuid references public.clientes (id) on delete set null;

-- 6) Gatilho dos pagamentos: minutos de bônus e pacote
create or replace function privado.pagamento_minutos() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_cliente uuid;
  v_pagador uuid;
  v_saldo integer;
  v_min integer;
begin
  if tg_op = 'INSERT' then
    select cliente_id into v_cliente from public.atendimentos where id = new.atendimento_id;
    v_pagador := coalesce(new.cliente_minutos_id, v_cliente);
    if new.forma = 'minutos' then
      if v_pagador is null then
        raise exception 'Pagamento com minutos: escolha de qual cliente sai o saldo';
      end if;
      v_min := ceil(new.valor)::integer;
      select coalesce(sum(minutos), 0) into v_saldo from public.minutos_lancamentos where cliente_id = v_pagador;
      if v_saldo < v_min then
        raise exception 'Saldo de minutos insuficiente (saldo: %)', v_saldo;
      end if;
      insert into public.minutos_lancamentos (arena_id, cliente_id, minutos, motivo, pagamento_id, atendimento_id)
      values (new.arena_id, v_pagador, -v_min, 'uso', new.id, new.atendimento_id);
    elsif new.forma = 'pacote' then
      if v_pagador is null then
        raise exception 'Pagamento com pacote: escolha de qual cliente sai o pacote';
      end if;
      select coalesce(sum(minutos), 0) into v_saldo from public.pacote_lancamentos where cliente_id = v_pagador;
      if v_saldo < new.minutos_pacote then
        raise exception 'Saldo do pacote insuficiente (saldo: % min)', v_saldo;
      end if;
      insert into public.pacote_lancamentos (arena_id, cliente_id, minutos, motivo, pagamento_id, atendimento_id)
      values (new.arena_id, v_pagador, -new.minutos_pacote, 'uso', new.id, new.atendimento_id);
    elsif v_cliente is not null and floor(new.valor) >= 1 then
      insert into public.minutos_lancamentos (arena_id, cliente_id, minutos, motivo, pagamento_id, atendimento_id)
      values (new.arena_id, v_cliente, floor(new.valor)::integer, 'bonus', new.id, new.atendimento_id);
    end if;
    return new;
  end if;

  -- DELETE (estorno): devolve o que esse pagamento gerou, nos dois saldos
  insert into public.minutos_lancamentos (arena_id, cliente_id, minutos, motivo)
  select arena_id, cliente_id, -minutos, 'estorno' from public.minutos_lancamentos where pagamento_id = old.id;
  insert into public.pacote_lancamentos (arena_id, cliente_id, minutos, motivo)
  select arena_id, cliente_id, -minutos, 'estorno' from public.pacote_lancamentos where pagamento_id = old.id;
  return old;
end $$;

-- 7) Ao encerrar: primeiro o pacote (tempo jogado), depois os minutos de bônus (o que sobrar em R$)
create or replace function privado.atendimento_desconta_minutos() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_total numeric;
  v_pago numeric;
  v_saldo integer;
  v_valor numeric;
  v_jogado integer;
  v_cobre integer;
begin
  if new.cancelado_em is not null or (new.minutos_de is null and new.pacote_de is null) then
    return new;
  end if;
  select new.valor_uso + new.ajuste + coalesce((select sum(total) from public.consumos where atendimento_id = new.id), 0)
    into v_total;

  -- Pacote de horas: cobre o tempo jogado (até o saldo dar)
  if new.pacote_de is not null and new.inicio is not null and new.valor_hora > 0 then
    v_jogado := greatest(0, round(extract(epoch from (new.fim - new.inicio)) / 60))::integer;
    select coalesce(sum(minutos), 0) into v_saldo from public.pacote_lancamentos where cliente_id = new.pacote_de;
    v_cobre := least(v_jogado, v_saldo);
    select coalesce(sum(valor), 0) into v_pago from public.pagamentos where atendimento_id = new.id;
    v_valor := least(round(v_cobre * new.valor_hora / 60, 2), greatest(v_total, 0) - v_pago);
    if v_cobre > 0 and v_valor > 0 then
      insert into public.pagamentos (arena_id, atendimento_id, forma, valor, cliente_minutos_id, minutos_pacote)
      values (new.arena_id, new.id, 'pacote', v_valor, new.pacote_de, v_cobre);
    end if;
  end if;

  -- Minutos de bônus: o que ainda faltar (R$ 1 = 1 min)
  if new.minutos_de is not null then
    select coalesce(sum(valor), 0) into v_pago from public.pagamentos where atendimento_id = new.id;
    select coalesce(sum(minutos), 0) into v_saldo from public.minutos_lancamentos where cliente_id = new.minutos_de;
    v_valor := least(greatest(v_total, 0) - v_pago, v_saldo);
    if v_valor > 0 then
      insert into public.pagamentos (arena_id, atendimento_id, forma, valor, cliente_minutos_id)
      values (new.arena_id, new.id, 'minutos', v_valor, new.minutos_de);
    end if;
  end if;
  return new;
end $$;
