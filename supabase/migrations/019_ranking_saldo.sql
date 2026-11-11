-- M7: ranking de horas jogadas + consulta de saldo pelo site (sem login)

-- Base: minutos jogados por cliente cadastrado (sem cancelados, só encerrados)
create or replace function privado.ranking(p_arena uuid, p_desde date, p_limite int)
returns table (cliente_id uuid, nome text, minutos int)
language sql stable security definer set search_path = '' as $$
  select c.id, c.nome, sum(greatest(0, round(extract(epoch from (a.fim - a.inicio)) / 60)))::int as minutos
  from public.atendimentos a
  join public.clientes c on c.id = a.cliente_id
  where a.arena_id = p_arena
    and a.cancelado_em is null and a.inicio is not null and a.fim is not null
    and (p_desde is null or a.data >= p_desde)
  group by c.id, c.nome
  having sum(extract(epoch from (a.fim - a.inicio))) > 0
  order by minutos desc, c.nome
  limit least(greatest(p_limite, 1), 100);
$$;
revoke all on function privado.ranking(uuid, date, int) from public, anon, authenticated;

-- Site: top 10 com primeiro nome + inicial ("Pedro W."). p_periodo: 'mes' ou 'sempre'
create or replace function public.ranking_publico(p_arena uuid, p_periodo text default 'mes')
returns table (posicao int, nome text, minutos int)
language sql stable security definer set search_path = '' as $$
  select (row_number() over (order by r.minutos desc, r.nome))::int,
         split_part(r.nome, ' ', 1) || coalesce(nullif(' ' || left(split_part(r.nome, ' ', 2), 1) || '.', ' .'), ''),
         r.minutos
  from privado.ranking(
    p_arena,
    case when p_periodo = 'sempre' then null else date_trunc('month', now() at time zone 'America/Fortaleza')::date end,
    10) r;
$$;
grant execute on function public.ranking_publico(uuid, text) to anon, authenticated;

-- Painel: nomes completos (só quem é da arena)
create or replace function public.ranking_painel(p_arena uuid, p_desde date default null, p_limite int default 50)
returns table (cliente_id uuid, nome text, minutos int)
language sql stable security definer set search_path = '' as $$
  select r.* from privado.ranking(p_arena, p_desde, p_limite) r
  where p_arena in (select privado.minhas_arenas());
$$;
revoke all on function public.ranking_painel(uuid, date, int) from public, anon;
grant execute on function public.ranking_painel(uuid, date, int) to authenticated;

-- Site: cliente digita o WhatsApp → primeiro nome, minutos, pacote (min) e horas no mês
create or replace function public.consulta_saldo(p_arena uuid, p_whatsapp text)
returns table (nome text, minutos int, pacote int, minutos_mes int)
language sql stable security definer set search_path = '' as $$
  with w as (
    select case when length(d) in (10, 11) then '55' || d else d end as num
    from (select regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g') as d) x
  ), c as (
    select cl.id, cl.nome from public.clientes cl, w
    where cl.arena_id = p_arena and cl.whatsapp = w.num
    limit 1
  )
  select split_part(c.nome, ' ', 1),
         coalesce((select sum(m.minutos) from public.minutos_lancamentos m where m.cliente_id = c.id), 0)::int,
         coalesce((select sum(p.minutos) from public.pacote_lancamentos p where p.cliente_id = c.id), 0)::int,
         coalesce((select sum(greatest(0, round(extract(epoch from (a.fim - a.inicio)) / 60))) from public.atendimentos a
                   where a.cliente_id = c.id and a.cancelado_em is null and a.inicio is not null and a.fim is not null
                     and a.data >= date_trunc('month', now() at time zone 'America/Fortaleza')::date), 0)::int
  from c;
$$;
grant execute on function public.consulta_saldo(uuid, text) to anon, authenticated;
