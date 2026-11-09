-- M2: arenas, membros (admins) e clientes
-- Como usar: Supabase → SQL Editor → New query → colar tudo → Run.

-- 1) Arenas (cada arena do SaaS)
create table public.arenas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  criado_em timestamptz not null default now()
);

-- 2) Membros: liga um login (auth.users) a uma arena
create table public.membros (
  user_id uuid not null references auth.users (id) on delete cascade,
  arena_id uuid not null references public.arenas (id) on delete cascade,
  papel text not null default 'admin' check (papel in ('admin')),
  criado_em timestamptz not null default now(),
  primary key (user_id, arena_id)
);

-- 3) Clientes: cadastro do balcão. WhatsApp só com números (ex: 5588999998888)
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  arena_id uuid not null references public.arenas (id) on delete cascade,
  nome text not null check (length(trim(nome)) >= 2),
  whatsapp text not null check (whatsapp ~ '^[0-9]{12,13}$'),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (arena_id, whatsapp)
);
create index clientes_arena_nome_idx on public.clientes (arena_id, nome);

-- Atualiza "atualizado_em" sozinho ao editar
create function public.tocar_atualizado_em() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.atualizado_em = now();
  return new;
end $$;
create trigger clientes_atualizado_em before update on public.clientes
  for each row execute function public.tocar_atualizado_em();

-- Arenas do usuário logado (security definer evita loop no RLS)
create function public.minhas_arenas() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select arena_id from public.membros where user_id = (select auth.uid())
$$;
revoke execute on function public.minhas_arenas() from public, anon;
grant execute on function public.minhas_arenas() to authenticated;

-- RLS: cada admin só vê a própria arena
alter table public.arenas enable row level security;
alter table public.membros enable row level security;
alter table public.clientes enable row level security;

create policy "ver minha arena" on public.arenas for select to authenticated
  using (id in (select public.minhas_arenas()));

create policy "ver meu vínculo" on public.membros for select to authenticated
  using (user_id = (select auth.uid()));

create policy "ver clientes" on public.clientes for select to authenticated
  using (arena_id in (select public.minhas_arenas()));
create policy "cadastrar clientes" on public.clientes for insert to authenticated
  with check (arena_id in (select public.minhas_arenas()));
create policy "editar clientes" on public.clientes for update to authenticated
  using (arena_id in (select public.minhas_arenas()))
  with check (arena_id in (select public.minhas_arenas()));
-- Sem exclusão por enquanto: cliente terá histórico (caixa, minutos).

-- 4) Cria a Arena Storm
insert into public.arenas (nome) values ('Arena Storm');
