-- M3: Agenda (reserva, corujão, campeonato, aniversário).
-- Cada agendamento prende máquinas específicas; o banco impede choque de horário.

create extension if not exists btree_gist with schema extensions;

create table public.agendamentos (
  id uuid primary key default gen_random_uuid(),
  arena_id uuid not null references public.arenas (id) on delete cascade,
  tipo text not null default 'reserva' check (tipo in ('reserva', 'corujao', 'campeonato', 'aniversario')),
  nome text not null check (length(trim(nome)) >= 1), -- cliente, ou título do campeonato
  cliente_id uuid references public.clientes (id) on delete set null,
  whatsapp text,
  inicio timestamptz not null,
  fim timestamptz not null,
  valor numeric(10, 2) not null default 0 check (valor >= 0), -- valor combinado (informativo)
  plano_id uuid references public.planos (id) on delete set null, -- pacote de festa
  situacao text not null default 'agendado'
    check (situacao in ('agendado', 'confirmado', 'realizado', 'faltou', 'cancelado')),
  observacao text,
  criado_em timestamptz not null default now(),
  check (fim > inicio)
);
create index agendamentos_periodo_idx on public.agendamentos (arena_id, inicio);

-- Máquinas presas por agendamento (cópia do horário para a trava de choque)
create table public.agendamento_maquinas (
  agendamento_id uuid not null references public.agendamentos (id) on delete cascade,
  equipamento_id uuid not null references public.equipamentos (id) on delete cascade,
  arena_id uuid not null references public.arenas (id) on delete cascade,
  inicio timestamptz not null,
  fim timestamptz not null,
  ativo boolean not null default true, -- false quando cancelado/faltou/realizado
  primary key (agendamento_id, equipamento_id),
  -- Trava: a mesma máquina não pode ter duas reservas ativas no mesmo horário
  constraint agendamento_sem_choque exclude using gist (
    equipamento_id with =,
    tstzrange(inicio, fim) with &&
  ) where (ativo)
);
create index agendamento_maquinas_equip_idx on public.agendamento_maquinas (equipamento_id, inicio);

-- Mantém horário e "ativo" das máquinas iguais ao agendamento
create or replace function privado.agendamento_sincroniza()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_table_name = 'agendamentos' then
    update public.agendamento_maquinas
      set inicio = new.inicio, fim = new.fim, ativo = new.situacao in ('agendado', 'confirmado')
      where agendamento_id = new.id;
  else
    select a.inicio, a.fim, a.situacao in ('agendado', 'confirmado'), a.arena_id
      into new.inicio, new.fim, new.ativo, new.arena_id
      from public.agendamentos a where a.id = new.agendamento_id;
  end if;
  return new;
end $$;

create trigger agendamentos_sincroniza after update of inicio, fim, situacao on public.agendamentos
  for each row execute function privado.agendamento_sincroniza();
create trigger agendamento_maquinas_copia before insert on public.agendamento_maquinas
  for each row execute function privado.agendamento_sincroniza();

-- RLS: só o admin da arena
alter table public.agendamentos enable row level security;
alter table public.agendamento_maquinas enable row level security;

do $$
declare t text;
begin
  foreach t in array array['agendamentos', 'agendamento_maquinas'] loop
    execute format('create policy "admin lê" on public.%I for select to authenticated using (arena_id in (select privado.minhas_arenas()))', t);
    execute format('create policy "admin insere" on public.%I for insert to authenticated with check (arena_id in (select privado.minhas_arenas()))', t);
    execute format('create policy "admin edita" on public.%I for update to authenticated using (arena_id in (select privado.minhas_arenas())) with check (arena_id in (select privado.minhas_arenas()))', t);
    execute format('create policy "admin apaga" on public.%I for delete to authenticated using (arena_id in (select privado.minhas_arenas()))', t);
  end loop;
end $$;
