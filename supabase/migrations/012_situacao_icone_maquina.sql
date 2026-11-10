-- M5 ajustes: situação especial da máquina (sem cobrança) e ícone escolhido
alter table public.equipamentos
  add column situacao text not null default 'normal'
    check (situacao in ('normal', 'manutencao', 'funcionario', 'sem_cobranca')),
  add column situacao_obs text,
  add column situacao_desde timestamptz,
  add column icone text; -- nome do ícone da lista ou um emoji (vazio = ícone do tipo)
