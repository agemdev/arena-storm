-- Backup de uma arena (dono): devolve as linhas de uma tabela em JSON (antes de apagar ou se o cliente pedir)
create or replace function public.backup_arena(p_arena uuid, p_tabela text)
returns setof jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not privado.sou_dono() then raise exception 'Só o dono do sistema faz backup.'; end if;
  if p_tabela not in ('clientes', 'atendimentos', 'consumos', 'pagamentos', 'minutos_lancamentos', 'pacote_lancamentos', 'produtos', 'equipamentos', 'agendamentos', 'planos') then
    raise exception 'Tabela não permitida.';
  end if;
  return query execute format('select to_jsonb(t) from public.%I t where t.arena_id = $1 order by 1', p_tabela) using p_arena;
end $$;
revoke all on function public.backup_arena(uuid, text) from public, anon;
grant execute on function public.backup_arena(uuid, text) to authenticated;

-- Lista de arenas com licença e admins (dono)
create or replace function public.arenas_do_sistema()
returns table (id uuid, nome text, slug text, whatsapp text, plano text, valor numeric, vence_em date, situacao text, dias int, responsavel text, contato text, obs text, admins text, criado_em timestamptz)
language sql stable security definer set search_path = '' as $$
  select a.id, a.nome, a.slug, a.whatsapp, l.plano, l.valor, l.vence_em, privado.situacao_licenca(l.vence_em), (l.vence_em - privado.hoje())::int,
         l.responsavel, l.contato, l.obs,
         (select string_agg(u.email, ', ' order by u.email) from public.membros m join auth.users u on u.id = m.user_id where m.arena_id = a.id),
         a.criado_em
  from public.arenas a left join public.licencas l on l.arena_id = a.id
  where privado.sou_dono()
  order by l.vence_em nulls last, a.nome;
$$;
revoke all on function public.arenas_do_sistema() from public, anon;
grant execute on function public.arenas_do_sistema() to authenticated;
