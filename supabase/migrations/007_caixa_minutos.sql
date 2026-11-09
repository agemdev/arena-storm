-- M4: Caixa (atendimentos, consumo, pagamentos) + Banco de Minutos (ledger).
-- Já aplicado no Supabase (via conector) em 09/11/2026.

-- 1) Equipamentos (PCs, consoles...) e produtos (lanches, bebidas)
create table public.equipamentos (
  id uuid primary key default gen_random_uuid(),
  arena_id uuid not null references public.arenas (id) on delete cascade,
  nome text not null check (length(trim(nome)) >= 1),
  tipo text not null default 'pc' check (tipo in ('pc', 'console', 'simulador', 'vr', 'outro')),
  ativo boolean not null default true,
  ordem smallint not null default 0,
  unique (arena_id, nome)
);

create table public.produtos (
  id uuid primary key default gen_random_uuid(),
  arena_id uuid not null references public.arenas (id) on delete cascade,
  nome text not null check (length(trim(nome)) >= 2),
  preco numeric(10, 2) not null check (preco >= 0),
  ativo boolean not null default true,
  ordem smallint not null default 0
);

-- 2) Atendimentos: cada linha da planilha (uso de máquina e/ou consumo)
create table public.atendimentos (
  id uuid primary key default gen_random_uuid(),
  arena_id uuid not null references public.arenas (id) on delete cascade,
  data date not null default (now() at time zone 'America/Fortaleza')::date, -- dia do caixa
  cliente_id uuid references public.clientes (id),
  nome text not null check (length(trim(nome)) >= 1), -- nome do cliente ou "avulso"
  equipamento_id uuid references public.equipamentos (id),
  inicio timestamptz,
  fim timestamptz,
  valor_hora numeric(10, 2) not null default 0 check (valor_hora >= 0),
  valor_uso numeric(10, 2) not null default 0 check (valor_uso >= 0),
  observacao text,
  criado_por uuid default auth.uid() references auth.users (id),
  criado_em timestamptz not null default now()
);
create index atendimentos_dia_idx on public.atendimentos (arena_id, data);
create index atendimentos_cliente_idx on public.atendimentos (cliente_id);
-- Uma máquina não pode ter dois atendimentos abertos ao mesmo tempo
create unique index atendimentos_equip_em_uso on public.atendimentos (equipamento_id)
  where fim is null and equipamento_id is not null;

create table public.consumos (
  id uuid primary key default gen_random_uuid(),
  arena_id uuid not null references public.arenas (id) on delete cascade,
  atendimento_id uuid not null references public.atendimentos (id) on delete cascade,
  produto_id uuid references public.produtos (id),
  descricao text not null,
  quantidade smallint not null default 1 check (quantidade > 0),
  valor_unit numeric(10, 2) not null check (valor_unit >= 0),
  total numeric(10, 2) generated always as (quantidade * valor_unit) stored,
  criado_em timestamptz not null default now()
);
create index consumos_atendimento_idx on public.consumos (atendimento_id);

create table public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  arena_id uuid not null references public.arenas (id) on delete cascade,
  atendimento_id uuid not null references public.atendimentos (id) on delete cascade,
  forma text not null check (forma in ('dinheiro', 'pix', 'cartao', 'minutos')),
  valor numeric(10, 2) not null check (valor > 0),
  criado_em timestamptz not null default now()
);
create index pagamentos_atendimento_idx on public.pagamentos (atendimento_id);

-- 3) Banco de Minutos: extrato (só soma lançamentos; nunca edita saldo). R$ 1 = 1 min.
create table public.minutos_lancamentos (
  id uuid primary key default gen_random_uuid(),
  arena_id uuid not null references public.arenas (id) on delete cascade,
  cliente_id uuid not null references public.clientes (id),
  minutos integer not null check (minutos <> 0), -- + crédito / - débito
  motivo text not null check (motivo in ('bonus', 'uso', 'estorno', 'ajuste')),
  pagamento_id uuid references public.pagamentos (id) on delete set null,
  atendimento_id uuid references public.atendimentos (id) on delete set null,
  criado_em timestamptz not null default now()
);
create index minutos_cliente_idx on public.minutos_lancamentos (cliente_id);

-- Saldo por cliente (respeita o RLS de quem consulta)
create view public.minutos_saldos with (security_invoker = true) as
  select cliente_id, sum(minutos)::integer as saldo
  from public.minutos_lancamentos group by cliente_id;

-- Pagamento → lança minutos automaticamente. Excluir pagamento → estorna.
create function privado.pagamento_minutos() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_cliente uuid;
  v_saldo integer;
  v_min integer;
begin
  if tg_op = 'INSERT' then
    select cliente_id into v_cliente from public.atendimentos where id = new.atendimento_id;
    if new.forma = 'minutos' then
      if v_cliente is null then
        raise exception 'Pagamento com minutos só para cliente cadastrado';
      end if;
      v_min := ceil(new.valor)::integer;
      select coalesce(sum(minutos), 0) into v_saldo from public.minutos_lancamentos where cliente_id = v_cliente;
      if v_saldo < v_min then
        raise exception 'Saldo de minutos insuficiente (saldo: %)', v_saldo;
      end if;
      insert into public.minutos_lancamentos (arena_id, cliente_id, minutos, motivo, pagamento_id, atendimento_id)
      values (new.arena_id, v_cliente, -v_min, 'uso', new.id, new.atendimento_id);
    elsif v_cliente is not null and floor(new.valor) >= 1 then
      insert into public.minutos_lancamentos (arena_id, cliente_id, minutos, motivo, pagamento_id, atendimento_id)
      values (new.arena_id, v_cliente, floor(new.valor)::integer, 'bonus', new.id, new.atendimento_id);
    end if;
    return new;
  end if;

  -- DELETE: lança o contrário do que esse pagamento gerou
  insert into public.minutos_lancamentos (arena_id, cliente_id, minutos, motivo)
  select arena_id, cliente_id, -minutos, 'estorno'
  from public.minutos_lancamentos where pagamento_id = old.id;
  return old;
end $$;
revoke execute on function privado.pagamento_minutos() from public, anon, authenticated;

create trigger pagamentos_minutos_ins after insert on public.pagamentos
  for each row execute function privado.pagamento_minutos();
create trigger pagamentos_minutos_del before delete on public.pagamentos
  for each row execute function privado.pagamento_minutos();

-- 4) RLS: só o admin da arena
alter table public.equipamentos enable row level security;
alter table public.produtos enable row level security;
alter table public.atendimentos enable row level security;
alter table public.consumos enable row level security;
alter table public.pagamentos enable row level security;
alter table public.minutos_lancamentos enable row level security;

do $$
declare t text;
begin
  foreach t in array array['equipamentos', 'produtos', 'atendimentos', 'consumos', 'pagamentos'] loop
    execute format('create policy "admin lê" on public.%I for select to authenticated using (arena_id in (select privado.minhas_arenas()))', t);
    execute format('create policy "admin insere" on public.%I for insert to authenticated with check (arena_id in (select privado.minhas_arenas()))', t);
    execute format('create policy "admin edita" on public.%I for update to authenticated using (arena_id in (select privado.minhas_arenas())) with check (arena_id in (select privado.minhas_arenas()))', t);
    execute format('create policy "admin apaga" on public.%I for delete to authenticated using (arena_id in (select privado.minhas_arenas()))', t);
  end loop;
end $$;

-- Extrato de minutos: admin só lê (lançamentos são feitos pelo sistema)
create policy "admin lê" on public.minutos_lancamentos for select to authenticated
  using (arena_id in (select privado.minhas_arenas()));

-- 5) Equipamentos atuais da Arena Storm
insert into public.equipamentos (arena_id, nome, tipo, ordem)
select a.id, e.nome, e.tipo, e.ordem
from public.arenas a,
  (values ('PC 01', 'pc', 1), ('PC 02', 'pc', 2), ('PC 03', 'pc', 3), ('PC 04', 'pc', 4), ('PC 05', 'pc', 5),
          ('PC 06', 'pc', 6), ('PC 07', 'pc', 7), ('PC 08', 'pc', 8), ('PC 09', 'pc', 9), ('PC 10', 'pc', 10),
          ('PS5 01', 'console', 11), ('PS5 02', 'console', 12), ('PS5 03', 'console', 13), ('PS5 04', 'console', 14),
          ('Switch', 'console', 15), ('Simulador', 'simulador', 16), ('VR', 'vr', 17)) as e (nome, tipo, ordem)
where a.nome = 'Arena Storm';
