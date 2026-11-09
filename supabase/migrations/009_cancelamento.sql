-- M4: cancelar atendimento (fica no histórico, riscado e zerado)
alter table public.atendimentos
  add column cancelado_em timestamptz,
  add column cancelado_motivo text;
