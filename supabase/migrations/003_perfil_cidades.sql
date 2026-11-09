-- M2 (ajustes): estados/cidades, descrição do cliente, perfil da arena e logotipo.
-- Já aplicado no Supabase (via conector) em 09/11/2026.

-- 1) Estados e cidades (dados públicos do IBGE, iguais para todas as arenas → sem arena_id, leitura liberada)
create table public.estados (
  uf char(2) primary key,
  nome text not null,
  ibge_id smallint not null unique
);
create table public.cidades (
  id integer primary key, -- código IBGE do município
  nome text not null,
  uf char(2) not null references public.estados (uf)
);
create index cidades_uf_nome_idx on public.cidades (uf, nome);

alter table public.estados enable row level security;
alter table public.cidades enable row level security;
create policy "ler estados" on public.estados for select to anon, authenticated using (true);
create policy "ler cidades" on public.cidades for select to anon, authenticated using (true);

-- 2) Cliente: descrição opcional + cidade
alter table public.clientes
  add column descricao text check (descricao is null or length(descricao) <= 500),
  add column cidade_id integer references public.cidades (id);
create index clientes_cidade_idx on public.clientes (cidade_id);

-- 3) Perfil da arena
alter table public.arenas
  add column cnpj text,
  add column telefone text,
  add column whatsapp text,
  add column email text,
  add column instagram text,
  add column cep text,
  add column logradouro text,
  add column numero text,
  add column complemento text,
  add column bairro text,
  add column cidade_id integer references public.cidades (id), -- cidade padrão dos clientes
  add column logo_path text,
  add column atualizado_em timestamptz not null default now();
create index arenas_cidade_idx on public.arenas (cidade_id);

create trigger arenas_atualizado_em before update on public.arenas
  for each row execute function public.tocar_atualizado_em();

create policy "editar minha arena" on public.arenas for update to authenticated
  using (id in (select privado.minhas_arenas()))
  with check (id in (select privado.minhas_arenas()));

-- 4) Logotipos: pasta por arena ({arena_id}/logo.png). Leitura pública, escrita só do admin.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 1048576, array['image/png', 'image/jpeg', 'image/webp']);

create policy "logo: ver da minha arena" on storage.objects for select to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] in (select privado.minhas_arenas()::text));
create policy "logo: enviar" on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] in (select privado.minhas_arenas()::text));
create policy "logo: trocar" on storage.objects for update to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] in (select privado.minhas_arenas()::text));
create policy "logo: apagar" on storage.objects for delete to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] in (select privado.minhas_arenas()::text));
