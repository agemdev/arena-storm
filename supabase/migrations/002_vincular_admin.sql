-- Liga o login do admin à Arena Storm.
-- Antes: Supabase → Authentication → Users → Add user (e-mail + senha, marcar "Auto Confirm").
-- Depois: troque o e-mail abaixo e rode no SQL Editor.

insert into public.membros (user_id, arena_id)
select u.id, a.id
from auth.users u, public.arenas a
where u.email = 'SEU_EMAIL_AQUI'
  and a.nome = 'Arena Storm';
