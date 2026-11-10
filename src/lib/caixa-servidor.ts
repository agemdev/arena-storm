import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { pcLigado } from "@/lib/agentes";
import { calcularUso, hhmm, hojeISO, SELECT_ATENDIMENTO, somarDias, totais, type AtendimentoLinha, type ComSaldo } from "@/lib/caixa";

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

export type SituacaoMaquina = "normal" | "manutencao" | "funcionario" | "sem_cobranca";

export type MaquinaEstado = {
  id: string;
  nome: string;
  tipo: string;
  mapa_x: number | null;
  mapa_y: number | null;
  emUso: boolean;
  icone: string | null;
  situacao: SituacaoMaquina;
  situacaoObs: string | null;
  situacaoDesde: string | null;
  aReceber: { id: string; nome: string; falta: number } | null; // tempo acabou e ainda não pagou
  ligado: "ligado" | "desligado" | "desativado" | null; // null = sem programa instalado (ex.: PS5)
  reserva?: string; // "20:00"
  tv?: string; // nome de quem está usando a TV dividida
  atendimento: { id: string; nome: string; inicio: string; fim_previsto: string | null; valor_hora: number } | null;
};

// Situação de cada máquina agora: em uso (com o atendimento), reserva próxima e TV dividida
export async function estadoMaquinas(supabase: SupabaseClient) {
  const [equips, abertos, reservas, fechados, agentes, cfg] = await Promise.all([
    supabase
      .from("equipamentos")
      .select("id, nome, tipo, mapa_x, mapa_y, compartilha_com, icone, situacao, situacao_obs, situacao_desde")
      .eq("ativo", true)
      .order("ordem"),
    supabase
      .from("atendimentos")
      .select("id, nome, equipamento_id, inicio, fim_previsto, valor_hora")
      .is("fim", null)
      .is("cancelado_em", null)
      .not("inicio", "is", null),
    reservasProximas(supabase),
    // Encerrados dos últimos dias com máquina: os que ainda faltam receber deixam a máquina vermelha
    supabase
      .from("atendimentos")
      .select(SELECT_ATENDIMENTO)
      .not("fim", "is", null)
      .is("cancelado_em", null)
      .not("equipamento_id", "is", null)
      .gte("data", somarDias(hojeISO(), -2))
      .order("fim", { ascending: false }),
    supabase.from("agentes").select("equipamento_id, online, estado").not("equipamento_id", "is", null),
    supabase.from("agente_config").select("hub_contato").maybeSingle(),
  ]);
  const hub = cfg.data?.hub_contato ?? null;
  const porAgente = new Map((agentes.data ?? []).map((g) => [g.equipamento_id as string, g]));
  const lista = equips.data ?? [];
  const pendentes = new Map<string, { id: string; nome: string; falta: number }>();
  for (const f of (fechados.data ?? []) as unknown as AtendimentoLinha[]) {
    const t = totais(f);
    if (t.falta > 0 && !t.fiado && !pendentes.has(f.equipamento_id!)) pendentes.set(f.equipamento_id!, { id: f.id, nome: f.nome, falta: t.falta });
  }
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
      icone: e.icone,
      situacao: e.situacao as SituacaoMaquina,
      situacaoObs: e.situacao_obs,
      situacaoDesde: e.situacao_desde,
      aReceber: pendentes.get(e.id) ?? null,
      ligado: (() => {
        const g = porAgente.get(e.id);
        if (!g) return null;
        if (g.estado === "desativado") return "desativado";
        return pcLigado(g.online, hub) ? "ligado" : "desligado";
      })(),
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

// Clientes com saldo de minutos (maior primeiro)
export async function clientesComSaldo(supabase: SupabaseClient): Promise<ComSaldo[]> {
  const { data: saldos } = await supabase.from("minutos_saldos").select("cliente_id, saldo").gt("saldo", 0);
  const ids = (saldos ?? []).map((s) => s.cliente_id);
  if (!ids.length) return [];
  const { data: nomes } = await supabase.from("clientes").select("id, nome").in("id", ids);
  const nome = new Map((nomes ?? []).map((c) => [c.id, c.nome]));
  return (saldos ?? [])
    .map((s) => ({ id: s.cliente_id as string, nome: nome.get(s.cliente_id) ?? "?", saldo: Number(s.saldo) }))
    .sort((x, y) => y.saldo - x.saldo);
}

// Clientes com saldo no pacote de horas (saldo em minutos de jogo)
export async function clientesComPacote(supabase: SupabaseClient): Promise<ComSaldo[]> {
  const { data: saldos } = await supabase.from("pacote_saldos").select("cliente_id, saldo").gt("saldo", 0);
  const ids = (saldos ?? []).map((s) => s.cliente_id);
  if (!ids.length) return [];
  const { data: nomes } = await supabase.from("clientes").select("id, nome").in("id", ids);
  const nome = new Map((nomes ?? []).map((c) => [c.id, c.nome]));
  return (saldos ?? [])
    .map((s) => ({ id: s.cliente_id as string, nome: nome.get(s.cliente_id) ?? "?", saldo: Number(s.saldo) }))
    .sort((x, y) => y.saldo - x.saldo);
}

export type FiadoAberto = { id: string; data: string; nome: string; clienteId: string; falta: number; total: number; fiadoEm: string };

// Fiados em aberto (de um cliente ou de todos), do mais antigo para o mais novo
export async function fiadosAbertos(supabase: SupabaseClient, clienteIds?: string[]): Promise<FiadoAberto[]> {
  let q = supabase
    .from("atendimentos")
    .select(SELECT_ATENDIMENTO)
    .not("fiado_em", "is", null)
    .is("cancelado_em", null)
    .order("data")
    .order("criado_em");
  if (clienteIds) q = q.in("cliente_id", clienteIds);
  const { data } = await q;
  return ((data ?? []) as unknown as AtendimentoLinha[])
    .map((a) => ({ a, t: totais(a) }))
    .filter(({ t }) => t.fiado)
    .map(({ a, t }) => ({ id: a.id, data: a.data, nome: a.nome, clienteId: a.cliente_id!, falta: t.falta, total: t.total, fiadoEm: a.fiado_em! }));
}
