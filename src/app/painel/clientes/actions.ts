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
