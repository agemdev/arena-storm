"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirAdmin } from "@/lib/auth";
import { hojeISO, lerValor, paraTimestamp } from "@/lib/caixa";
import { diaDaAgenda, SITUACOES, TIPOS_AGENDA, type TipoAgenda } from "@/lib/agenda";
import { normalizarWhats } from "@/lib/whatsapp";

export type Resultado = { ok: boolean; msg: string; n?: number } | null;

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATA = /^\d{4}-\d{2}-\d{2}$/;
const atualizar = () => {
  revalidatePath("/painel/agenda", "layout");
  revalidatePath("/painel", "layout");
};

// Criar ou editar agendamento (com as máquinas escolhidas)
export async function salvarAgendamento(_: Resultado, form: FormData): Promise<Resultado> {
  const { supabase, arenaId } = await exigirAdmin();
  const id = String(form.get("id") ?? "") || null;
  const tipo = String(form.get("tipo")) as TipoAgenda;
  const nome = String(form.get("nome") ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
  const clienteId = String(form.get("cliente_id") ?? "") || null;
  const whatsTexto = String(form.get("whatsapp") ?? "").trim();
  const whatsapp = whatsTexto ? normalizarWhats(whatsTexto) : null;
  const data = String(form.get("data") ?? "");
  const hIni = String(form.get("inicio") ?? "");
  const hFim = String(form.get("fim") ?? "");
  const valor = lerValor(String(form.get("valor") ?? "0") || "0");
  const planoId = String(form.get("plano_id") ?? "") || null;
  const maquinas = form.getAll("maquinas").map(String).filter(Boolean);

  if (!(tipo in TIPOS_AGENDA)) return { ok: false, msg: "Escolha o tipo." };
  if (!nome) return { ok: false, msg: tipo === "campeonato" ? "Digite o nome do campeonato." : "Digite o nome do cliente." };
  if (whatsTexto && !whatsapp) return { ok: false, msg: "WhatsApp inválido." };
  if (!DATA.test(data)) return { ok: false, msg: "Escolha o dia." };
  if (!HORA.test(hIni) || !HORA.test(hFim)) return { ok: false, msg: "Informe início e fim." };
  if (!(valor >= 0)) return { ok: false, msg: "Valor inválido." };
  if (!maquinas.length) return { ok: false, msg: "Escolha pelo menos uma máquina." };

  // Antes das 6h = madrugada do dia seguinte (ex.: corujão 22h → 06h)
  let inicio = paraTimestamp(data, hIni);
  if (hIni < "06:00") inicio = paraTimestamp(data, hIni, paraTimestamp(data, "23:59"));
  const fim = paraTimestamp(data, hFim, inicio);
  if (fim === inicio) return { ok: false, msg: "O fim precisa ser depois do início." };

  const dados = {
    arena_id: arenaId,
    tipo,
    nome,
    cliente_id: clienteId,
    whatsapp,
    inicio,
    fim,
    valor,
    plano_id: tipo === "aniversario" ? planoId : null,
    observacao: String(form.get("observacao") ?? "").trim().slice(0, 500) || null,
  };

  if (id) {
    // Troca as máquinas: tira as que saíram, muda o horário, põe as novas
    const { data: atuais } = await supabase.from("agendamento_maquinas").select("equipamento_id").eq("agendamento_id", id);
    const tinha = new Set((atuais ?? []).map((m) => m.equipamento_id));
    const sair = [...tinha].filter((m) => !maquinas.includes(m));
    if (sair.length) await supabase.from("agendamento_maquinas").delete().eq("agendamento_id", id).in("equipamento_id", sair);
    const { error } = await supabase.from("agendamentos").update(dados).eq("id", id);
    if (error) return erro(error);
    const entrar = maquinas.filter((m) => !tinha.has(m));
    if (entrar.length) {
      const { error: e2 } = await supabase
        .from("agendamento_maquinas")
        .insert(entrar.map((m) => ({ agendamento_id: id, equipamento_id: m, arena_id: arenaId, inicio, fim })));
      if (e2) return erro(e2);
    }
  } else {
    const { data: novo, error } = await supabase.from("agendamentos").insert(dados).select("id").single();
    if (error) return erro(error);
    const { error: e2 } = await supabase
      .from("agendamento_maquinas")
      .insert(maquinas.map((m) => ({ agendamento_id: novo.id, equipamento_id: m, arena_id: arenaId, inicio, fim })));
    if (e2) {
      await supabase.from("agendamentos").delete().eq("id", novo.id); // desfaz
      return erro(e2);
    }
  }

  atualizar();
  return { ok: true, msg: id ? "Agendamento salvo!" : "Agendado!", n: Date.now() };
}

function erro(e: { code?: string; message: string }): Resultado {
  if (e.code === "23P01") return { ok: false, msg: "Alguma máquina escolhida já está reservada nesse horário." };
  if (e.code === "23514") return { ok: false, msg: "Confira os horários: o fim precisa ser depois do início." };
  return { ok: false, msg: "Erro ao salvar o agendamento." };
}

// Confirmar, faltou, cancelar, reativar
export async function mudarSituacao(form: FormData) {
  const { supabase } = await exigirAdmin();
  const situacao = String(form.get("situacao"));
  if (!(situacao in SITUACOES) || situacao === "realizado") return;
  const { error } = await supabase.from("agendamentos").update({ situacao }).eq("id", String(form.get("id")));
  // Reativar pode bater em outra reserva feita depois
  if (error?.code === "23P01") redirect(`/painel/agenda?erro=choque&abrir=${String(form.get("id"))}`);
  atualizar();
}

export async function excluirAgendamento(form: FormData) {
  const { supabase } = await exigirAdmin();
  const { data: a } = await supabase.from("agendamentos").select("inicio").eq("id", String(form.get("id"))).single();
  await supabase.from("agendamentos").delete().eq("id", String(form.get("id")));
  atualizar();
  redirect(a ? `/painel/agenda?data=${diaDaAgenda(a.inicio)}` : "/painel/agenda");
}

// Cliente chegou: vira atendimento no Caixa (um por máquina), com o fim já combinado.
// Reserva cobra por hora; corujão/campeonato/aniversário com valor → pacote lançado no consumo.
export async function iniciarNoCaixa(form: FormData) {
  const { supabase, arenaId } = await exigirAdmin();
  const id = String(form.get("id"));
  const { data: ag } = await supabase
    .from("agendamentos")
    .select("id, tipo, nome, cliente_id, fim, valor, situacao, agendamento_maquinas(equipamento_id, equipamentos(nome))")
    .eq("id", id)
    .single();
  if (!ag || !["agendado", "confirmado"].includes(ag.situacao)) return;

  const pacote = ag.tipo !== "reserva" && Number(ag.valor) > 0;
  const { data: plano } = await supabase
    .from("planos")
    .select("preco")
    .eq("arena_id", arenaId)
    .eq("unidade", "/hora")
    .order("ordem")
    .limit(1)
    .maybeSingle();
  const valorHora = pacote ? 0 : Number(plano?.preco ?? 12);
  const agora = new Date();
  const fimPrevisto = new Date(ag.fim) > agora ? ag.fim : null; // já passou do fim → tempo livre

  // Máquinas ainda ocupadas no caixa ficam de fora (avisa)
  const maquinas = ag.agendamento_maquinas as unknown as { equipamento_id: string; equipamentos: { nome: string } | null }[];
  const criados: string[] = [];
  const ocupadas: string[] = [];
  for (const m of maquinas) {
    const { data: at, error } = await supabase
      .from("atendimentos")
      .insert({
        arena_id: arenaId,
        data: hojeISO(),
        cliente_id: ag.cliente_id,
        nome: ag.nome,
        equipamento_id: m.equipamento_id,
        inicio: agora.toISOString(),
        fim_previsto: fimPrevisto,
        valor_hora: valorHora,
        observacao: `${TIPOS_AGENDA[ag.tipo as TipoAgenda].nome} da agenda`,
      })
      .select("id")
      .single();
    if (error) ocupadas.push(m.equipamentos?.nome ?? "?");
    else criados.push(at.id);
  }

  // Pacote: lança o valor combinado no primeiro atendimento
  if (pacote && criados.length) {
    await supabase.from("consumos").insert({
      arena_id: arenaId,
      atendimento_id: criados[0],
      descricao: `Pacote ${TIPOS_AGENDA[ag.tipo as TipoAgenda].nome}`,
      quantidade: 1,
      valor_unit: Number(ag.valor),
    });
  }

  if (criados.length) await supabase.from("agendamentos").update({ situacao: "realizado" }).eq("id", id);
  atualizar();
  revalidatePath("/painel/caixa", "layout");
  if (ocupadas.length) redirect(`/painel/agenda?erro=ocupadas&lista=${encodeURIComponent(ocupadas.join(", "))}&abrir=${id}`);
  redirect(`/painel/caixa${criados.length === 1 ? `?abrir=${criados[0]}` : ""}`);
}
