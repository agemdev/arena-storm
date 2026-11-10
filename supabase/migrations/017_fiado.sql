-- Fiado: o atendimento fica na conta do cliente (paga depois, em qualquer dia)
alter table public.atendimentos
  add column fiado_em timestamptz,
  add constraint atendimentos_fiado_cadastrado check (fiado_em is null or cliente_id is not null);

-- Fiados em aberto por cliente (consulta rápida)
create index atendimentos_fiado_idx on public.atendimentos (cliente_id) where fiado_em is not null and cancelado_em is null;

-- Caixa do dia pelo dia em que o dinheiro entrou
create index pagamentos_dia_idx on public.pagamentos (arena_id, criado_em);
