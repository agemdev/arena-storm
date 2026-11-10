import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { calcularUso, hhmm } from "@/lib/caixa";

// Encerra os atendimentos cujo tempo combinado já acabou.
// O fim fica exatamente no horário previsto (mesmo que ninguém estivesse com o painel aberto).
export async function encerrarVencidos(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("atendimentos")
    .select("id, nome, inicio, fim_previsto, valor_hora, equipamentos(nome)")
    .is("fim", null)
    .not("inicio", "is", null)
    .lte("fim_previsto", new Date().toISOString());

  for (const a of data ?? []) {
    const { valor } = calcularUso(a.inicio, a.fim_previsto, Number(a.valor_hora));
    await supabase.from("atendimentos").update({ fim: a.fim_previsto, valor_uso: valor }).eq("id", a.id).is("fim", null);
  }
  return (data ?? []).map((a) => ({
    id: a.id,
    nome: a.nome,
    equipamento: (a.equipamentos as unknown as { nome: string } | null)?.nome ?? "Livre",
  }));
}

// Reservas da Agenda nas próximas 3 horas: máquina → "20:00"
export async function reservasProximas(supabase: SupabaseClient) {
  const agora = Date.now();
  const { data } = await supabase
    .from("agendamento_maquinas")
    .select("equipamento_id, inicio")
    .eq("ativo", true)
    .gt("fim", new Date(agora).toISOString())
    .lt("inicio", new Date(agora + 3 * 3600_000).toISOString())
    .order("inicio");
  const mapa = new Map<string, string>();
  for (const r of data ?? []) if (!mapa.has(r.equipamento_id)) mapa.set(r.equipamento_id, hhmm(r.inicio));
  return mapa;
}
