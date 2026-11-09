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

  if (nome.length < 2) return { ok: false, msg: "Digite o nome do cliente." };
  if (!whatsapp) return { ok: false, msg: "WhatsApp inválido. Use DDD + número, ex: (88) 99232-0187." };

  const { error } = id
    ? await supabase.from("clientes").update({ nome, whatsapp }).eq("id", id)
    : await supabase.from("clientes").insert({ arena_id: arenaId, nome, whatsapp });

  if (error?.code === "23505") return { ok: false, msg: "Esse WhatsApp já está cadastrado." };
  if (error) return { ok: false, msg: "Erro ao salvar. Tente de novo." };

  revalidatePath("/painel", "layout");
  if (id) redirect("/painel/clientes");
  return { ok: true, msg: `${nome} cadastrado!` };
}
