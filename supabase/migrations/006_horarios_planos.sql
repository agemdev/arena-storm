-- Configurações do site: horários de funcionamento e tabela de preços (planos/festas).
-- Já aplicado no Supabase (via conector) em 09/11/2026.

-- 1) Horários: uma linha por dia da semana (0 = domingo ... 6 = sábado)
create table public.horarios (
  arena_id uuid not null references public.arenas (id) on delete cascade,
  dia smallint not null check (dia between 0 and 6),
  fechado boolean not null default false,
  abre time,
  fecha time, -- se menor que "abre", passa da meia-noite
  primary key (arena_id, dia),
  check (fechado or (abre is not null and fecha is not null))
);

-- 2) Planos e pacotes exibidos no site (não é o caixa; o caixa vem no M4)
create table public.planos (
  id uuid primary key default gen_random_uuid(),
  arena_id uuid not null references public.arenas (id) on delete cascade,
  categoria text not null default 'plano' check (categoria in ('plano', 'festa')),
  nome text not null check (length(trim(nome)) >= 2),
  preco numeric(10, 2) not null check (preco >= 0),
  unidade text, -- ex: "/hora", "/noite"
  descricao text, -- usado nas festas: "Até 10 pessoas · 3 horas"
  itens text[] not null default '{}', -- vantagens do plano (uma por linha)
  destaque boolean not null default false,
  ativo boolean not null default true,
  ordem smallint not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index planos_arena_idx on public.planos (arena_id, categoria, ordem);
create trigger planos_atualizado_em before update on public.planos
  for each row execute function public.tocar_atualizado_em();

-- RLS: site lê (público); admin da arena edita
alter table public.horarios enable row level security;
alter table public.planos enable row level security;

create policy "horários: público lê" on public.horarios for select to anon, authenticated using (true);
create policy "horários: admin insere" on public.horarios for insert to authenticated
  with check (arena_id in (select privado.minhas_arenas()));
create policy "horários: admin edita" on public.horarios for update to authenticated
  using (arena_id in (select privado.minhas_arenas()))
  with check (arena_id in (select privado.minhas_arenas()));

create policy "planos: público lê ativos" on public.planos for select to anon using (ativo);
create policy "planos: admin lê" on public.planos for select to authenticated
  using (ativo or arena_id in (select privado.minhas_arenas()));
create policy "planos: admin insere" on public.planos for insert to authenticated
  with check (arena_id in (select privado.minhas_arenas()));
create policy "planos: admin edita" on public.planos for update to authenticated
  using (arena_id in (select privado.minhas_arenas()))
  with check (arena_id in (select privado.minhas_arenas()));
create policy "planos: admin apaga" on public.planos for delete to authenticated
  using (arena_id in (select privado.minhas_arenas()));

-- 3) Valores atuais da Arena Storm (os que estavam fixos no código)
insert into public.horarios (arena_id, dia, abre, fecha)
select a.id, d.dia, d.abre::time, d.fecha::time
from public.arenas a,
  (values (0, '14:00', '23:00'), (1, '09:00', '22:00'), (2, '09:00', '22:00'), (3, '09:00', '22:00'),
          (4, '09:00', '22:00'), (5, '09:00', '22:00'), (6, '09:00', '23:00')) as d (dia, abre, fecha)
where a.nome = 'Arena Storm';

insert into public.planos (arena_id, categoria, nome, preco, unidade, descricao, itens, destaque, ordem)
select a.id, p.categoria, p.nome, p.preco, p.unidade, p.descricao, p.itens, p.destaque, p.ordem
from public.arenas a,
  (values
    ('plano', 'Hora Avulsa', 12.00, '/hora', null, array['Qualquer setup disponível', 'Periféricos inclusos', 'Monitores 180Hz'], false, 1),
    ('plano', 'Passaporte 5h', 50.00, '/5 horas', null, array['5 horas de jogo', 'Prioridade na escolha do setup', 'Participação em sorteios'], true, 2),
    ('plano', 'Corujão', 70.00, '/noite', null, array['Das 22h às 6h', 'Arena inteira', 'Lanches da madrugada'], false, 3),
    ('plano', 'Realidade Virtual', 10.00, '/30 min', null, array['Óculos VR standalone', 'Sessão de 30 minutos', 'Jogos imersivos'], false, 4),
    ('festa', 'Aniversário P', 699.00, null, 'Até 10 pessoas · 3 horas', array[]::text[], false, 1),
    ('festa', 'Aniversário G', 999.00, null, 'Até 15 pessoas · 3 horas + bônus', array[]::text[], false, 2)
  ) as p (categoria, nome, preco, unidade, descricao, itens, destaque, ordem)
where a.nome = 'Arena Storm';
