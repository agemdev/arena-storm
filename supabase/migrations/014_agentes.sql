-- M6: programa dos PCs (agentes), IP dos consoles e senha mestre

-- IP fixo do equipamento na rede da arena (ping dos consoles — fase 6c)
alter table public.equipamentos add column ip inet;

-- Cada PC com o programa instalado
create table public.agentes (
  id uuid primary key default gen_random_uuid(),
  arena_id uuid not null references public.arenas (id) on delete cascade,
  equipamento_id uuid unique references public.equipamentos (id) on delete set null,
  nome_pc text not null, -- nome do Windows (ex.: DESKTOP-PC10)
  versao text,
  online boolean not null default false, -- o Servidor marca ao ligar/desligar
  estado text not null default 'ativo' check (estado in ('ativo', 'desativado')),
  ultimo_contato timestamptz,
  criado_em timestamptz not null default now()
);
create index agentes_arena_idx on public.agentes (arena_id);

-- Configuração privada do programa (uma linha por arena)
create table public.agente_config (
  arena_id uuid primary key references public.arenas (id) on delete cascade,
  senha_mestre_hash text not null, -- bcrypt (nunca a senha em texto)
  senha_mudada_em timestamptz not null default now(),
  hub_contato timestamptz -- último "estou vivo" do PC Servidor
);

alter table public.agentes enable row level security;
alter table public.agente_config enable row level security;

do $$
declare t text;
begin
  foreach t in array array['agentes', 'agente_config'] loop
    execute format('create policy "admin lê" on public.%I for select to authenticated using (arena_id in (select privado.minhas_arenas()))', t);
    execute format('create policy "admin insere" on public.%I for insert to authenticated with check (arena_id in (select privado.minhas_arenas()))', t);
    execute format('create policy "admin edita" on public.%I for update to authenticated using (arena_id in (select privado.minhas_arenas())) with check (arena_id in (select privado.minhas_arenas()))', t);
    execute format('create policy "admin apaga" on public.%I for delete to authenticated using (arena_id in (select privado.minhas_arenas()))', t);
  end loop;
end $$;

-- Senha padrão 102030 (o operador troca no painel)
insert into public.agente_config (arena_id, senha_mestre_hash)
select id, extensions.crypt('102030', extensions.gen_salt('bf', 10)) from public.arenas
on conflict do nothing;

-- Trocar a senha mestre pelo painel (mínimo 6 caracteres). Guarda só o hash.
create or replace function public.definir_senha_mestre(p_arena uuid, p_senha text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_arena not in (select privado.minhas_arenas()) then
    raise exception 'sem permissão';
  end if;
  if length(coalesce(p_senha, '')) < 6 then
    raise exception 'A senha precisa de pelo menos 6 caracteres.';
  end if;
  insert into public.agente_config (arena_id, senha_mestre_hash, senha_mudada_em)
  values (p_arena, extensions.crypt(p_senha, extensions.gen_salt('bf', 10)), now())
  on conflict (arena_id) do update set senha_mestre_hash = excluded.senha_mestre_hash, senha_mudada_em = now();
end $$;
revoke execute on function public.definir_senha_mestre(uuid, text) from public, anon;
grant execute on function public.definir_senha_mestre(uuid, text) to authenticated;

-- Ao vivo: mapa mostra ligado/desligado
alter publication supabase_realtime add table public.agentes;

-- 014b: não precisa de privilégio especial (o RLS do admin já permite)
alter function public.definir_senha_mestre(uuid, text) security invoker;
