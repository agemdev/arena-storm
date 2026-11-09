-- Perfil da arena é público (site mostra nome, logo, endereço e contatos).
-- ATENÇÃO: não criar colunas privadas em "arenas"; dados sigilosos vão em outra tabela.
-- Já aplicado no Supabase (via conector) em 09/11/2026.
create policy "perfil público" on public.arenas for select to anon using (true);
