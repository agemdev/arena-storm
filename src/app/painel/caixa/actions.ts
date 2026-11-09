"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirAdmin } from "@/lib/auth";
import { calcularUso, FORMAS, hojeISO, lerValor, paraTimestamp } from "@/lib/caixa";

export type Resultado = { ok: boolean; msg: string; n?: number } | null;

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATA = /^\d{4}-\d{2}-\d{2}$/;
const atualizar = () => revalidatePath("/painel/caixa", "layout");

// Novo atendimento (máquina e/ou consumo)
export async function abrirAtendimento(_: Resultado, form: FormData): Promise<Resultado> {
  const { supabase, arenaId } = await exigirAdmin();

  const data = DATA.test(String(form.get("data"))) ? String(form.get("data")) : hojeISO();
  const clienteId = String(form.get("cliente_id") ?? "") || null;
  const nome = String(form.get("nome") ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
  const equipamentoId = String(form.get("equipamento_id") ?? "") || null;
  const hora = String(form.get("inicio") ?? "");
  const valorHora = lerValor(String(form.get("valor_hora") ?? "0"));

  if (!nome) return { ok: false, msg: "Digite o nome do cliente." };
  if (equipamentoId && !HORA.test(hora)) return { ok: false, msg: "Informe a hora de início." };
  if (!(valorHora >= 0)) return { ok: false, msg: "Valor/hora inválido." };

  const { data: novo, error } = await supabase
    .from("atendimentos")
    .insert({
      arena_id: arenaId,
      data,
      cliente_id: clienteId,
      nome,
      equipamento_id: equipamentoId,
      inicio: equipamentoId ? paraTimestamp(data, hora) : null,
      valor_hora: equipamentoId ? valorHora : 0,
    })
    .select("id")
    .single();

  if (error?.code === "23505") return { ok: false, msg: "Essa máquina já está em uso. Encerre o atendimento dela primeiro." };
  if (error) return { ok: false, msg: "Erro ao abrir atendimento." };

  atualizar();
  // Só consumo → vai direto para lançar os produtos
  if (!equipamentoId) redirect(`/painel/caixa/${novo.id}`);
  return { ok: true, msg: `${nome} iniciado!`, n: Date.now() };
}

// Encerrar agora: fim = agora e calcula o valor do uso
export async function encerrarAtendimento(form: FormData) {
  const { supabase } = await exigirAdmin();
  const id = String(form.get("id"));
  const { data: a } = await supabase.from("atendimentos").select("inicio, fim, valor_hora").eq("id", id).single();
  if (!a || a.fim || !a.inicio) return;
  const fim = new Date().toISOString();
  const { valor } = calcularUso(a.inicio, fim, Number(a.valor_hora));
  await supabase.from("atendimentos").update({ fim, valor_uso: valor }).eq("id", id);
  atualizar();
}

// Editar horários, valores, máquina e observação
export async function salvarAtendimento(_: Resultado, form: FormData): Promise<Resultado> {
  const { supabase } = await exigirAdmin();
  const id = String(form.get("id"));
  const { data: a } = await supabase.from("atendimentos").select("data").eq("id", id).single();
  if (!a) return { ok: false, msg: "Atendimento não encontrado." };

  const nome = String(form.get("nome") ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
  const equipamentoId = String(form.get("equipamento_id") ?? "") || null;
  const hIni = String(form.get("inicio") ?? "");
  const hFim = String(form.get("fim") ?? "");
  const valorHora = lerValor(String(form.get("valor_hora") ?? "0"));
  const valorUso = lerValor(String(form.get("valor_uso") ?? "0"));

  if (!nome) return { ok: false, msg: "Digite o nome." };
  if (equipamentoId && !HORA.test(hIni)) return { ok: false, msg: "Informe a hora de início." };
  if (hFim && !HORA.test(hFim)) return { ok: false, msg: "Hora de fim inválida." };
  if (!(valorHora >= 0) || !(valorUso >= 0)) return { ok: false, msg: "Valores inválidos." };

  const inicio = equipamentoId ? paraTimestamp(a.data, hIni) : null;
  const fim = equipamentoId && hFim ? paraTimestamp(a.data, hFim, inicio!) : null;

  const { error } = await supabase
    .from("atendimentos")
    .update({
      nome,
      equipamento_id: equipamentoId,
      inicio,
      fim,
      valor_hora: equipamentoId ? valorHora : 0,
      valor_uso: equipamentoId && fim ? valorUso : 0,
      observacao: String(form.get("observacao") ?? "").trim().slice(0, 300) || null,
    })
    .eq("id", id);

  if (error?.code === "23505") return { ok: false, msg: "Essa máquina já está em uso em outro atendimento." };
  if (error) return { ok: false, msg: "Erro ao salvar." };
  atualizar();
  return { ok: true, msg: "Salvo!" };
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
