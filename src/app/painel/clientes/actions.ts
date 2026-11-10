"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirAdmin } from "@/lib/auth";
import { normalizarWhats } from "@/lib/whatsapp";

export type Resultado = { ok: boolean; msg: string } | null;

// Cadastra (sem id) ou edita (com id) um cliente
export async function salvarCliente(_: Resultado, form: FormData): Promise<Resultado> {
  const { supabase, arenaId } = await exigirAdmin();

  const id = String(form.get("id") ?? "");
  const nome = String(form.get("nome") ?? "").trim().replace(/\s+/g, " ");
  const whatsapp = normalizarWhats(String(form.get("whatsapp") ?? ""));
  const descricao = String(form.get("descricao") ?? "").trim().slice(0, 500) || null;
  const cidade_id = Number(form.get("cidade_id")) || null;

  if (nome.length < 2) return { ok: false, msg: "Digite o nome do cliente." };
  if (!whatsapp) return { ok: false, msg: "WhatsApp inválido. Use DDD + número, ex: (88) 99232-0187." };
  if (!cidade_id) return { ok: false, msg: "Selecione a cidade." };

  const dados = { nome, whatsapp, descricao, cidade_id };
  const { error } = id
    ? await supabase.from("clientes").update(dados).eq("id", id)
    : await supabase.from("clientes").insert({ arena_id: arenaId, ...dados });

  if (error?.code === "23505") return { ok: false, msg: "Esse WhatsApp já está cadastrado." };
  if (error) return { ok: false, msg: "Erro ao salvar. Tente de novo." };

  revalidatePath("/painel", "layout");
  if (id) redirect("/painel/clientes");
  return { ok: true, msg: `${nome} cadastrado!` };
}

// Promoção / ação: dá minutos grátis ao cliente (fica no extrato como "Promoção")
export async function darMinutos(_: Resultado, form: FormData): Promise<Resultado> {
  const { supabase, arenaId } = await exigirAdmin();
  const clienteId = String(form.get("cliente_id"));
  const minutos = Math.round(Number(String(form.get("minutos") ?? "").replace(",", ".")));
  const obs = String(form.get("obs") ?? "").trim().slice(0, 120);
  if (!(minutos >= 1 && minutos <= 10000)) return { ok: false, msg: "Digite de 1 a 10.000 minutos." };
  if (obs.length < 3) return { ok: false, msg: "Escreva o motivo (ex.: sorteio do Instagram)." };
  const { error } = await supabase
    .from("minutos_lancamentos")
    .insert({ arena_id: arenaId, cliente_id: clienteId, minutos, motivo: "promocao", obs });
  if (error) return { ok: false, msg: "Erro ao dar os minutos." };
  revalidatePath("/painel", "layout");
  return { ok: true, msg: `+${minutos} min dados!` };
}

// Ajuste manual do saldo (minutos de bônus ou pacote de horas): digita o saldo novo, o sistema lança a diferença
export async function ajustarSaldo(_: Resultado, form: FormData): Promise<Resultado> {
  const { supabase, arenaId } = await exigirAdmin();
  const clienteId = String(form.get("cliente_id"));
  const tipo = form.get("tipo") === "pacote" ? "pacote" : "minutos";
  const obs = String(form.get("obs") ?? "").trim().slice(0, 120);
  // Pacote: aceita "3:40" ou "3,5" (horas) · Minutos: número inteiro
  const texto = String(form.get("novo") ?? "").trim();
  let novo: number;
  if (tipo === "pacote") {
    const hm = texto.match(/^(\d+):([0-5]\d)$/);
    novo = hm ? Number(hm[1]) * 60 + Number(hm[2]) : Math.round(Number(texto.replace(",", ".")) * 60);
  } else novo = Math.round(Number(texto.replace(",", ".")));
  if (!Number.isFinite(novo) || novo < 0) return { ok: false, msg: "Saldo novo inválido." };
  if (obs.length < 3) return { ok: false, msg: "Escreva o motivo do ajuste." };

  const tabela = tipo === "pacote" ? "pacote_lancamentos" : "minutos_lancamentos";
  const { data } = await supabase.from(tabela).select("minutos").eq("cliente_id", clienteId);
  const atual = (data ?? []).reduce((s, l) => s + l.minutos, 0);
  const dif = novo - atual;
  if (dif === 0) return { ok: true, msg: "Saldo já era esse." };
  const { error } = await supabase.from(tabela).insert({ arena_id: arenaId, cliente_id: clienteId, minutos: dif, motivo: "ajuste", obs });
  if (error) return { ok: false, msg: "Erro ao ajustar o saldo." };
  revalidatePath("/painel", "layout");
  return { ok: true, msg: `Saldo ajustado (${dif > 0 ? "+" : ""}${dif} min).` };
}

// Vender pacote de horas: lança a venda no Caixa (para receber) e já credita as horas
export async function venderPacote(_: Resultado, form: FormData): Promise<Resultado> {
  const { supabase, arenaId } = await exigirAdmin();
  const clienteId = String(form.get("cliente_id"));
  const { data: plano } = await supabase.from("planos").select("id, nome, preco, pacote_minutos").eq("id", String(form.get("plano_id"))).maybeSingle();
  if (!plano?.pacote_minutos) return { ok: false, msg: "Escolha um pacote." };
  const { data: cli } = await supabase.from("clientes").select("nome").eq("id", clienteId).single();
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza" }).format(new Date());

  const { data: at, error } = await supabase
    .from("atendimentos")
    .insert({ arena_id: arenaId, data: hoje, cliente_id: clienteId, nome: cli?.nome ?? "Cliente", observacao: `Venda: ${plano.nome}` })
    .select("id")
    .single();
  if (error) return { ok: false, msg: "Erro ao lançar a venda." };
  await supabase.from("consumos").insert({ arena_id: arenaId, atendimento_id: at.id, descricao: `Pacote ${plano.nome}`, quantidade: 1, valor_unit: plano.preco });
  const { error: e2 } = await supabase.from("pacote_lancamentos").insert({
    arena_id: arenaId,
    cliente_id: clienteId,
    minutos: plano.pacote_minutos,
    motivo: "compra",
    plano_id: plano.id,
    atendimento_id: at.id,
    obs: plano.nome,
  });
  if (e2) return { ok: false, msg: "Venda lançada, mas erro ao creditar as horas." };
  revalidatePath("/painel", "layout");
  redirect(`/painel/caixa?abrir=${at.id}`); // vai receber o pagamento
}
