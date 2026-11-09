-- Caixa: horário previsto para acabar (ex: "quero 1h") e ajuste do valor final.
-- Já aplicado no Supabase (via conector) em 09/11/2026.

alter table public.atendimentos
  add column fim_previsto timestamptz, -- quando o tempo combinado acaba (vazio = tempo livre)
  add column ajuste numeric(10, 2) not null default 0, -- negativo = desconto; positivo = acréscimo
  add column ajuste_motivo text,
  add constraint atendimentos_ajuste_motivo check (ajuste <= 0 or length(trim(coalesce(ajuste_motivo, ''))) >= 3);

-- Busca rápida dos atendimentos em uso com hora para acabar (alertas)
create index atendimentos_em_uso_idx on public.atendimentos (arena_id, fim_previsto) where fim is null;
