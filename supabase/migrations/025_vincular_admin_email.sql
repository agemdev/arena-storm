-- Dono liga um login JÁ EXISTENTE (criado no painel do Supabase) a uma arena, só pelo e-mail
create or replace function public.vincular_admin_email(p_arena uuid, p_email text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid;
begin
  if not privado.sou_dono() then raise exception 'Só o dono do sistema vincula admins.'; end if;
  select id into v_user from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if v_user is null then raise exception 'Nenhum login com esse e-mail. Crie no Supabase (Authentication → Add user) ou informe uma senha aqui.'; end if;
  insert into public.membros (user_id, arena_id, papel) values (v_user, p_arena, 'admin') on conflict do nothing;
end $$;
revoke all on function public.vincular_admin_email(uuid, text) from public, anon;
grant execute on function public.vincular_admin_email(uuid, text) to authenticated;
