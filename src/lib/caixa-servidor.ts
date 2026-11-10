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

export type MaquinaEstado = {
  id: string;
  nome: string;
  tipo: string;
  mapa_x: number | null;
  mapa_y: number | null;
  emUso: boolean;
  reserva?: string; // "20:00"
  tv?: string; // nome de quem está usando a TV dividida
  atendimento: { id: string; nome: string; inicio: string; fim_previsto: string | null; valor_hora: number } | null;
};

// Situação de cada máquina agora: em uso (com o atendimento), reserva próxima e TV dividida
export async function estadoMaquinas(supabase: SupabaseClient) {
  const [equips, abertos, reservas] = await Promise.all([
    supabase.from("equipamentos").select("id, nome, tipo, mapa_x, mapa_y, compartilha_com").eq("ativo", true).order("ordem"),
    supabase
      .from("atendimentos")
      .select("id, nome, equipamento_id, inicio, fim_previsto, valor_hora")
      .is("fim", null)
      .is("cancelado_em", null)
      .not("inicio", "is", null),
    reservasProximas(supabase),
  ]);
  const lista = equips.data ?? [];
  const abertosLista = abertos.data ?? [];
  const porMaquina = new Map(abertosLista.filter((a) => a.equipamento_id).map((a) => [a.equipamento_id as string, a]));
  const nome = (id: string) => lista.find((e) => e.id === id)?.nome ?? "";

  const maquinas: MaquinaEstado[] = lista.map((e) => {
    // TV dividida vale nos dois sentidos (Switch ↔ PS5 04)
    const parceiro = e.compartilha_com ?? lista.find((x) => x.compartilha_com === e.id)?.id ?? null;
    const a = porMaquina.get(e.id);
    return {
      id: e.id,
      nome: e.nome,
      tipo: e.tipo,
      mapa_x: e.mapa_x,
      mapa_y: e.mapa_y,
      emUso: !!a,
      reserva: reservas.get(e.id),
      tv: parceiro && porMaquina.has(parceiro) ? nome(parceiro) : undefined,
      atendimento: a ? { id: a.id, nome: a.nome, inicio: a.inicio as string, fim_previsto: a.fim_previsto, valor_hora: Number(a.valor_hora) } : null,
    };
  });
  // Atendimentos em tempo livre (sem máquina fixa)
  const semMaquina = abertosLista
    .filter((a) => !a.equipamento_id)
    .map((a) => ({ id: a.id, nome: a.nome, inicio: a.inicio as string, fim_previsto: a.fim_previsto, valor_hora: Number(a.valor_hora) }));
  return { maquinas, semMaquina };
}
