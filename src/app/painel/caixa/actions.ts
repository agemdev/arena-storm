"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirAdmin } from "@/lib/auth";
import {
  calcularUso,
  faltaParaPagar,
  FORMAS,
  hojeISO,
  lerValor,
  paraTimestamp,
  SELECT_ATENDIMENTO,
  totais,
  type AtendimentoLinha,
} from "@/lib/caixa";
import { encerrarVencidos, fiadosAbertos } from "@/lib/caixa-servidor";

export type Resultado = { ok: boolean; msg: string; n?: number; abrir?: string } | null;

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATA = /^\d{4}-\d{2}-\d{2}$/;
const atualizar = () => revalidatePath("/painel", "layout");
const uuidOuNulo = (v: FormDataEntryValue | null) => (/^[0-9a-f-]{36}$/.test(String(v ?? "")) ? String(v) : null);

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
  const minutosDe = uuidOuNulo(form.get("minutos_de"));

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
      minutos_de: comTempo ? minutosDe : null,
      pacote_de: comTempo ? uuidOuNulo(form.get("pacote_de")) : null,
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
  const { data: a } = await supabase.from("atendimentos").select("data, inicio, fim, fiado_em").eq("id", id).single();
  if (!a) return { ok: false, msg: "Atendimento não encontrado." };

  const nome = String(form.get("nome") ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
  const clienteId = uuidOuNulo(form.get("cliente_id")); // vazio = avulso
  if (a.fiado_em && !clienteId) return { ok: false, msg: "Está no fiado: tire do fiado antes de deixar avulso." };
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
      cliente_id: clienteId,
      equipamento_id: equipamentoId,
      inicio,
      fim: comTempo ? fim : null,
      fim_previsto: fimPrevisto,
      valor_hora: comTempo ? valorHora : 0,
      valor_uso: valorUso,
      minutos_de: comTempo ? uuidOuNulo(form.get("minutos_de")) : null,
      pacote_de: comTempo ? uuidOuNulo(form.get("pacote_de")) : null,
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
  // Produto digitado na hora (não cadastrado): nome + valor livres
  if (!form.get("produto_id")) {
    const descricao = String(form.get("descricao") ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
    const valor = lerValor(String(form.get("valor") ?? ""));
    if (descricao.length < 2 || !(valor > 0)) return;
    await supabase.from("consumos").insert({ arena_id: arenaId, atendimento_id: atendimentoId, produto_id: null, descricao, quantidade, valor_unit: valor });
    atualizar();
    return;
  }
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

  const { data: at } = await supabase.from("atendimentos").select("cancelado_em, valor_hora").eq("id", String(form.get("atendimento_id"))).single();
  if (at?.cancelado_em) return { ok: false, msg: "Atendimento cancelado: desfaça o cancelamento antes de receber." };
  // Pacote de horas: o valor vira minutos de jogo pelo preço/hora do atendimento
  const valorHora = Number(at?.valor_hora ?? 0);
  if (forma === "pacote" && !(valorHora > 0)) return { ok: false, msg: "Pacote de horas só paga tempo de uso (atendimento sem preço/hora)." };
  const minutosPacote = forma === "pacote" ? Math.ceil((valor * 60) / valorHora - 0.0001) : null;

  const { error } = await supabase
    .from("pagamentos")
    .insert({
      arena_id: arenaId,
      atendimento_id: String(form.get("atendimento_id")),
      forma,
      valor,
      cliente_minutos_id: forma === "minutos" || forma === "pacote" ? uuidOuNulo(form.get("cliente_minutos_id")) : null, // de quem sai o saldo
      minutos_pacote: minutosPacote,
    });
  if (error?.message.includes("insuficiente")) return { ok: false, msg: error.message };
  if (error?.message.includes("escolha de qual cliente")) return { ok: false, msg: "Escolha de qual cliente sai o saldo." };
  if (error) return { ok: false, msg: "Erro ao registrar pagamento." };

  // Pagamento dividido: o que faltou depois dos minutos/pacote vai em dinheiro, Pix ou cartão
  const resto = String(form.get("resto_forma") ?? "");
  if ((forma === "minutos" || forma === "pacote") && ["dinheiro", "pix", "cartao"].includes(resto)) {
    const { data } = await supabase.from("atendimentos").select(SELECT_ATENDIMENTO).eq("id", String(form.get("atendimento_id"))).single();
    const falta = data ? faltaParaPagar(data as unknown as AtendimentoLinha) : 0;
    if (falta > 0) {
      const { error: e2 } = await supabase
        .from("pagamentos")
        .insert({ arena_id: arenaId, atendimento_id: String(form.get("atendimento_id")), forma: resto, valor: falta });
      if (e2) return { ok: false, msg: "Minutos registrados, mas deu erro no resto. Receba o resto de novo." };
      atualizar();
      return { ok: true, msg: `Pago: ${valor.toFixed(2).replace(".", ",")} em ${FORMAS[forma as keyof typeof FORMAS]} + ${falta.toFixed(2).replace(".", ",")} em ${FORMAS[resto as keyof typeof FORMAS]}.` };
    }
  }

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
  const { data: a } = await supabase.from("atendimentos").select("data, cancelado_em").eq("id", String(form.get("id"))).single();
  if (!a?.cancelado_em) await estornarCompraPacote(supabase, String(form.get("id")), -1);
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

  await estornarCompraPacote(supabase, id, -1);
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
  await estornarCompraPacote(supabase, String(form.get("id")), 1);
  await supabase.from("atendimentos").update({ cancelado_em: null, cancelado_motivo: null }).eq("id", String(form.get("id")));
  atualizar();
}

// Venda de pacote cancelada/excluída: tira as horas que ela deu (sinal -1) ou devolve ao desfazer (+1)
async function estornarCompraPacote(supabase: Awaited<ReturnType<typeof exigirAdmin>>["supabase"], atendimentoId: string, sinal: 1 | -1) {
  const { data } = await supabase.from("pacote_lancamentos").select("arena_id, cliente_id, minutos, motivo, plano_id").eq("atendimento_id", atendimentoId);
  const compras = (data ?? []).filter((l) => l.motivo === "compra");
  if (!compras.length) return;
  const creditado = (data ?? []).filter((l) => l.motivo === "compra" || l.motivo === "estorno").reduce((s, l) => s + l.minutos, 0);
  const c = compras[0];
  // Cancelar: tira o que ainda está creditado · Desfazer: devolve a compra original (se estava estornada)
  if (sinal === -1 && creditado > 0)
    await supabase.from("pacote_lancamentos").insert({ arena_id: c.arena_id, cliente_id: c.cliente_id, minutos: -creditado, motivo: "estorno", plano_id: c.plano_id, atendimento_id: atendimentoId, obs: "Venda do pacote cancelada" });
  if (sinal === 1 && creditado <= 0)
    await supabase.from("pacote_lancamentos").insert({ arena_id: c.arena_id, cliente_id: c.cliente_id, minutos: c.minutos, motivo: "compra", plano_id: c.plano_id, atendimento_id: atendimentoId, obs: "Cancelamento desfeito" });
}

// Fiado: pendura o que falta na conta do cliente cadastrado (sai do "a receber" do dia)
export async function colocarFiado(form: FormData) {
  const { supabase } = await exigirAdmin();
  const id = String(form.get("id"));
  const { data } = await supabase.from("atendimentos").select(SELECT_ATENDIMENTO).eq("id", id).single();
  if (!data) return;
  const a = data as unknown as AtendimentoLinha;
  const t = totais(a);
  if (!a.cliente_id || t.emUso || t.cancelado || t.falta <= 0) return;
  await supabase.from("atendimentos").update({ fiado_em: new Date().toISOString() }).eq("id", id);
  atualizar();
}

export async function tirarFiado(form: FormData) {
  const { supabase } = await exigirAdmin();
  await supabase.from("atendimentos").update({ fiado_em: null }).eq("id", String(form.get("id")));
  atualizar();
}

// Receber fiado: paga do mais antigo para o mais novo (pode ser parte da dívida)
export async function receberFiado(_: Resultado, form: FormData): Promise<Resultado> {
  const { supabase, arenaId } = await exigirAdmin();
  const clienteId = String(form.get("cliente_id"));
  const forma = String(form.get("forma"));
  let resta = lerValor(String(form.get("valor") ?? ""));
  if (!["dinheiro", "pix", "cartao"].includes(forma)) return { ok: false, msg: "Escolha dinheiro, Pix ou cartão." };
  if (!(resta > 0)) return { ok: false, msg: "Digite o valor recebido." };

  const abertos = await fiadosAbertos(supabase, [clienteId]);
  const divida = Math.round(abertos.reduce((s, f) => s + f.falta, 0) * 100) / 100;
  if (!abertos.length) return { ok: false, msg: "Este cliente não tem fiado em aberto." };
  if (resta > divida + 0.001) return { ok: false, msg: `Valor maior que a dívida (${divida.toFixed(2).replace(".", ",")}).` };

  for (const f of abertos) {
    if (resta <= 0) break;
    const valor = Math.round(Math.min(resta, f.falta) * 100) / 100;
    const { error } = await supabase.from("pagamentos").insert({ arena_id: arenaId, atendimento_id: f.id, forma, valor });
    if (error) return { ok: false, msg: "Erro ao registrar o pagamento." };
    resta = Math.round((resta - valor) * 100) / 100;
  }
  atualizar();
  const sobra = Math.round((divida - lerValor(String(form.get("valor")))) * 100) / 100;
  return { ok: true, msg: sobra > 0 ? `Recebido! Ainda falta ${sobra.toFixed(2).replace(".", ",")}.` : "Fiado quitado!", n: Date.now() };
}
