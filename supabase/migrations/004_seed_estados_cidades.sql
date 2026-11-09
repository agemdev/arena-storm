-- Estados e cidades + perfil inicial. Já aplicado no Supabase (via conector) em 09/11/2026.
-- Carrega direto da API oficial do IBGE (extensão http usada só aqui e removida no fim)
create extension if not exists http with schema extensions;

insert into public.estados (uf, nome, ibge_id)
select e->>'sigla', e->>'nome', (e->>'id')::smallint
from jsonb_array_elements(
  (select content::jsonb from extensions.http_get('https://servicodados.ibge.gov.br/api/v1/localidades/estados'))
) e;

insert into public.cidades (id, nome, uf)
select distinct on ((m->>'municipio-id')::int) (m->>'municipio-id')::int, m->>'municipio-nome', m->>'UF-sigla'
from jsonb_array_elements(
  (select content::jsonb from extensions.http_get('https://servicodados.ibge.gov.br/api/v1/localidades/municipios?view=nivelado'))
) m;

drop extension http;

-- Perfil inicial da Arena Storm (Tianguá-CE = 2313401)
update public.arenas set
  cidade_id = 2313401, cep = '62320021', logradouro = 'Rua Manoel Estevão', numero = '210',
  complemento = 'Sala A', bairro = 'Centro', whatsapp = '5588992320187', instagram = 'arena.storm'
where nome = 'Arena Storm';

-- Clientes já cadastrados sem cidade → cidade da arena
update public.clientes c set cidade_id = a.cidade_id
from public.arenas a where c.arena_id = a.id and c.cidade_id is null;
