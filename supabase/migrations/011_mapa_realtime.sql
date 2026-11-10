-- M5: posição das máquinas no mapa + atualização ao vivo (Realtime)

alter table public.equipamentos
  add column mapa_x smallint check (mapa_x between 1 and 20), -- coluna no mapa (vazio = fora do mapa)
  add column mapa_y smallint check (mapa_y between 1 and 12), -- linha no mapa
  add column compartilha_com uuid references public.equipamentos (id) on delete set null; -- ex.: Switch divide a TV com o PS5 04

-- Posições do diagrama da Arena Storm
update public.equipamentos e set mapa_x = p.x, mapa_y = p.y
from (values
  ('Simulador', 1, 1),
  ('PC 10', 6, 1), ('PC 08', 7, 1), ('PC 06', 8, 1), ('PC 04', 9, 1), ('PC 02', 10, 1),
  ('PC 09', 6, 2), ('PC 07', 7, 2), ('PC 05', 8, 2), ('PC 03', 9, 2), ('PC 01', 10, 2),
  ('Switch', 6, 4), ('PS5 04', 7, 4), ('PS5 03', 8, 4), ('PS5 02', 9, 4), ('PS5 01', 10, 4)
) as p (nome, x, y)
where e.nome = p.nome;

update public.equipamentos s set compartilha_com = p.id
from public.equipamentos p
where s.nome = 'Switch' and p.nome = 'PS5 04' and p.arena_id = s.arena_id;

-- Ao vivo: o painel recebe aviso quando o Caixa, a Agenda ou as máquinas mudam (respeita o RLS)
alter publication supabase_realtime add table public.atendimentos, public.agendamento_maquinas, public.equipamentos;
