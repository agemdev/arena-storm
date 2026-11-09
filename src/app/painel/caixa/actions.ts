"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirAdmin } from "@/lib/auth";
import {
  calcularUso,
  FORMAS,
  hojeISO,
  lerValor,
  paraTimestamp,
  SELECT_ATENDIMENTO,
  totais,
  type AtendimentoLinha,
} from "@/lib/caixa";
import { encerrarVencidos } from "@/lib/caixa-servidor";

export type Resultado = { ok: boolean; msg: string; n?: number; abrir?: string } | null;

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATA = /^\d{4}-\d{2}-\d{2}$/;
const atualizar = () => revalidatePath("/painel/caixa", "layout");

// Novo atendimento. "equipamento_id": id da máquina, "livre" (tempo sem máquina fixa) ou vazio (só consumo)
export async function abrirAtendimento(_: Resultado, form: FormData): Promise<Resultado> {
  const { supabase, arenaId } = await exigirAdmin();

  const data = DATA.test(String(form.get("data"))) ? String(form.get("data")) : hojeISO();
  const clienteId = String(form.get("cliente_id") ?? "") || null;
  const nome = String(form.get("nome") ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
  const modo = String(form.get("equipamento_id") ?? "");
  const comTempo = modo !== "";
  const equipamentoId = comTempo && modo !== "livre" ? modo : null;
  const hIni = String(form.get("inicio") ?? "");
  const hPrev = String(form.get("fim_previsto") ?? "");
  const valorHora = lerValor(String(form.get("valor_hora") ?? "0"));

  if (!nome) return { ok: false, msg: "Digite o nome do cliente." };
  if (comTempo && !HORA.test(hIni)) return { ok: false, msg: "Informe a hora de início." };
  if (hPrev && !HORA.test(hPrev)) return { ok: false, msg: "Hora de fim inválida." };
  if (!(valorHora >= 0)) return { ok: false, msg: "Valor/hora inválido." };

  const inicio = comTempo ? paraTimestamp(data, hIni) : null;
  const { data: novo, error } = await supabase
    .from("atendimentos")
    .insert({
      arena_id: arenaId,
      data,
      cliente_id: clienteId,
      nome,
      equipamento_id: equipamentoId,
      inicio,
      fim_previsto: comTempo && hPrev ? paraTimestamp(data, hPrev, inicio!) : null,
      valor_hora: comTempo ? valorHora : 0,
    })
    .select("id")
    .single();

  if (error?.code === "23505") return { ok: false, msg: "Essa máquina já está em uso. Encerre o atendimento dela primeiro." };
  if (error) return { ok: false, msg: "Erro ao abrir atendimento." };

  atualizar();
  // Só consumo → abre a janela dele para lançar os produtos
  return { ok: true, msg: `${nome} iniciado!`, n: Date.now(), abrir: comTempo ? undefined : `/painel/caixa?data=${data}&abrir=${novo.id}` };
}

// Encerrar agora: fim = agora e calcula o valor do uso
export async function encerrarAtendimento(form: FormData) {
  const { supabase } = await exigirAdmin();
  const id = String(form.get("id"));
  const { data: a } = await supabase.from("atendimentos").select("inicio, fim, valor_hora").eq("id", id).is("cancelado_em", null).single();
  if (!a || a.fim || !a.inicio) return;
  const fim = new Date().toISOString();
  const { valor } = calcularUso(a.inicio, fim, Number(a.valor_hora));
  await supabase.from("atendimentos").update({ fim, valor_uso: valor }).eq("id", id);
  atualizar();
}

// Cliente vai continuar: soma minutos ao fim previsto ("livre" = sem hora para acabar)
export async function estenderTempo(form: FormData) {
  const { supabase } = await exigirAdmin();
  const id = String(form.get("id"));
  const extra = String(form.get("minutos"));
  const { data: a } = await supabase.from("atendimentos").select("fim, fim_previsto").eq("id", id).is("cancelado_em", null).single();
  if (!a || a.fim) return;
  let fimPrevisto: string | null = null;
  if (extra !== "livre") {
    const base = Math.max(Date.now(), a.fim_previsto ? new Date(a.fim_previsto).getTime() : 0);
    fimPrevisto = new Date(base + (Number(extra) || 30) * 60000).toISOString();
  }
  await supabase.from("atendimentos").update({ fim_previsto: fimPrevisto }).eq("id", id);
  atualizar();
}

// Reabre o tempo de um atendimento encerrado por engano
export async function reabrirTempo(form: FormData) {
  const { supabase } = await exigirAdmin();
  await supabase
    .from("atendimentos")
    .update({ fim: null, fim_previsto: null, valor_uso: 0 })
    .eq("id", String(form.get("id")))
    .is("cancelado_em", null)
    .not("inicio", "is", null);
  atualizar();
}

// Usado pelos alertas: encerra quem passou do tempo e lista quem está com hora para acabar
export async function situacaoTempos() {
  const { supabase } = await exigirAdmin();
  const encerrados = await encerrarVencidos(supabase);
  if (encerrados.length) atualizar();
  const { data } = await supabase
    .from("atendimentos")
    .select("id, nome, fim_previsto, equipamentos(nome)")
    .is("fim", null)
    .not("fim_previsto", "is", null)
    .order("fim_previsto");
  const emUso = (data ?? []).map((a) => ({
    id: a.id,
    nome: a.nome,
    fimPrevisto: a.fim_previsto as string,
    equipamento: (a.equipamentos as unknown as { nome: string } | null)?.nome ?? "Livre",
  }));
  return { encerrados, emUso };
}

// Corrigir dados: máquina, início, fim previsto (em uso) ou fim (encerrado) e observação.
// O valor do uso é sempre recalculado pelos horários.
export async function salvarAtendimento(_: Resultado, form: FormData): Promise<Resultado> {
  const { supabase } = await exigirAdmin();
  const id = String(form.get("id"));
  const { data: a } = await supabase.from("atendimentos").select("data, inicio, fim").eq("id", id).single();
  if (!a) return { ok: false, msg: "Atendimento não encontrado." };

  const nome = String(form.get("nome") ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
  const modo = String(form.get("equipamento_id") ?? "");
  const comTempo = modo !== "";
  const equipamentoId = comTempo && modo !== "livre" ? modo : null;
  const hIni = String(form.get("inicio") ?? "");
  const hPrev = String(form.get("fim_previsto") ?? "");
  const hFim = String(form.get("fim") ?? "");
  const valorHora = lerValor(String(form.get("valor_hora") ?? "0"));

  if (!nome) return { ok: false, msg: "Digite o nome." };
  if (comTempo && !HORA.test(hIni)) return { ok: false, msg: "Informe a hora de início." };
  if ((hPrev && !HORA.test(hPrev)) || (hFim && !HORA.test(hFim))) return { ok: false, msg: "Hora inválida." };
  if (!(valorHora >= 0)) return { ok: false, msg: "Valor/hora inválido." };

  const inicio = comTempo ? paraTimestamp(a.data, hIni) : null;
  // Já encerrado: mantém encerrado (campo fim). Em uso: só muda o previsto.
  const fim = comTempo && a.fim && hFim ? paraTimestamp(a.data, hFim, inicio!) : null;
  const fimPrevisto = comTempo && !fim && hPrev ? paraTimestamp(a.data, hPrev, inicio!) : null;
  const valorUso = fim ? calcularUso(inicio, fim, valorHora).valor : 0;

  const { error } = await supabase
    .from("atendimentos")
    .update({
      nome,
      equipamento_id: equipamentoId,
      inicio,
      fim: comTempo ? fim : null,
      fim_previsto: fimPrevisto,
      valor_hora: comTempo ? valorHora : 0,
      valor_uso: valorUso,
      observacao: String(form.get("observacao") ?? "").trim().slice(0, 300) || null,
    })
    .eq("id", id);

  if (error?.code === "23505") return { ok: false, msg: "Essa máquina já está em uso em outro atendimento." };
  if (error) return { ok: false, msg: "Erro ao salvar." };
  atualizar();
  return { ok: true, msg: "Salvo!" };
}

// Valor final diferente do calculado: menor = desconto; maior = acréscimo (precisa de motivo)
export async function ajustarValor(_: Resultado, form: FormData): Promise<Resultado> {
  const { supabase } = await exigirAdmin();
  const id = String(form.get("id"));
  const { data } = await supabase.from("atendimentos").select(SELECT_ATENDIMENTO).eq("id", id).single();
  if (!data) return { ok: false, msg: "Atendimento não encontrado." };
  const t = totais(data as unknown as AtendimentoLinha);
  if (t.emUso) return { ok: false, msg: "Encerre o tempo antes de ajustar o valor final." };

  if (form.get("acao") === "remover") {
    await supabase.from("atendimentos").update({ ajuste: 0, ajuste_motivo: null }).eq("id", id);
    atualizar();
    return { ok: true, msg: "Ajuste removido." };
  }

  const final = lerValor(String(form.get("valor_final") ?? ""));
  const motivo = String(form.get("motivo") ?? "").trim().slice(0, 200);
  if (!(final >= 0)) return { ok: false, msg: "Digite o valor final." };
  const ajuste = Math.round((final - (t.valorUso + t.consumo)) * 100) / 100;
  if (ajuste > 0 && motivo.length < 3) return { ok: false, msg: "Valor maior que o calculado: escreva o motivo." };

  const { error } = await supabase
    .from("atendimentos")
    .update({ ajuste, ajuste_motivo: ajuste === 0 ? null : motivo || "Desconto" })
    .eq("id", id);
  if (error) return { ok: false, msg: "Erro ao salvar ajuste." };
  atualizar();
  return { ok: true, msg: ajuste < 0 ? "Desconto aplicado." : ajuste > 0 ? "Acréscimo aplicado." : "Valor mantido." };
}

// Adiciona produto ao consumo
export async function adicionarConsumo(form: FormData) {
  const { supabase, arenaId } = await exigirAdmin();
  const atendimentoId = String(form.get("atendimento_id"));
  const quantidade = Math.max(1, Math.min(50, Number(form.get("quantidade")) || 1));
  const { data: p } = await supabase.from("produtos").select("id, nome, preco").eq("id", String(form.get("produto_id"))).single();
  if (!p) return;
  await supabase.from("consumos").insert({
    arena_id: arenaId,
    atendimento_id: atendimentoId,
    produto_id: p.id,
    descricao: p.nome,
    quantidade,
    valor_unit: p.preco,
  });
  atualizar();
}

export async function removerConsumo(form: FormData) {
  const { supabase } = await exigirAdmin();
  await supabase.from("consumos").delete().eq("id", String(form.get("id")));
  atualizar();
}

// Recebe um pagamento (pode dividir em várias formas)
export async function receber(_: Resultado, form: FormData): Promise<Resultado> {
  const { supabase, arenaId } = await exigirAdmin();
  const forma = String(form.get("forma"));
  const valor = lerValor(String(form.get("valor") ?? ""));
  if (!(forma in FORMAS)) return { ok: false, msg: "Escolha a forma de pagamento." };
  if (!(valor > 0)) return { ok: false, msg: "Digite o valor recebido." };

  const { data: at } = await supabase.from("atendimentos").select("cancelado_em").eq("id", String(form.get("atendimento_id"))).single();
  if (at?.cancelado_em) return { ok: false, msg: "Atendimento cancelado: desfaça o cancelamento antes de receber." };

  const { error } = await supabase
    .from("pagamentos")
    .insert({ arena_id: arenaId, atendimento_id: String(form.get("atendimento_id")), forma, valor });
  if (error?.message.includes("insuficiente")) return { ok: false, msg: error.message };
  if (error?.message.includes("cliente cadastrado")) return { ok: false, msg: "Pagar com minutos só para cliente cadastrado." };
  if (error) return { ok: false, msg: "Erro ao registrar pagamento." };

  atualizar();
  return { ok: true, msg: "Pagamento registrado!" };
}

// Estorna (apaga) um pagamento. Os minutos são estornados automaticamente.
export async function estornarPagamento(form: FormData) {
  const { supabase } = await exigirAdmin();
  await supabase.from("pagamentos").delete().eq("id", String(form.get("id")));
  atualizar();
}

// Exclui o atendimento inteiro (lançado por engano)
export async function excluirAtendimento(form: FormData) {
  const { supabase } = await exigirAdmin();
  const { data: a } = await supabase.from("atendimentos").select("data").eq("id", String(form.get("id"))).single();
  await supabase.from("atendimentos").delete().eq("id", String(form.get("id")));
  atualizar();
  redirect(`/painel/caixa?data=${a?.data ?? hojeISO()}`);
}

// Cancelar a qualquer momento: para o tempo, estorna pagamentos e zera o valor (fica no histórico)
export async function cancelarAtendimento(_: Resultado, form: FormData): Promise<Resultado> {
  const { supabase } = await exigirAdmin();
  const id = String(form.get("id"));
  const { data: a } = await supabase.from("atendimentos").select("inicio, fim, valor_hora, cancelado_em").eq("id", id).single();
  if (!a) return { ok: false, msg: "Atendimento não encontrado." };
  if (a.cancelado_em) return { ok: true, msg: "Já estava cancelado." };

  // Pagamentos voltam (minutos são devolvidos automaticamente)
  const { error: errPag } = await supabase.from("pagamentos").delete().eq("atendimento_id", id);
  if (errPag) return { ok: false, msg: "Erro ao estornar pagamentos." };

  const agora = new Date().toISOString();
  const fim = a.inicio && !a.fim ? agora : a.fim; // em uso → para agora (libera a máquina)
  const { error } = await supabase
    .from("atendimentos")
    .update({
      cancelado_em: agora,
      cancelado_motivo: String(form.get("motivo") ?? "").trim().slice(0, 200) || null,
      fim,
      fim_previsto: null,
      valor_uso: a.inicio ? calcularUso(a.inicio, fim, Number(a.valor_hora)).valor : 0,
    })
    .eq("id", id);
  if (error) return { ok: false, msg: "Erro ao cancelar." };
  atualizar();
  return { ok: true, msg: "Cancelado." };
}

// Desfaz o cancelamento (o tempo continua encerrado; receba de novo se preciso)
export async function desfazerCancelamento(form: FormData) {
  const { supabase } = await exigirAdmin();
  await supabase.from("atendimentos").update({ cancelado_em: null, cancelado_motivo: null }).eq("id", String(form.get("id")));
  atualizar();
}
