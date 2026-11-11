"use server";

import { supabasePublico } from "@/lib/supabase/publico";

export type Saldo = { nome: string; minutos: number; pacote: number; minutos_mes: number };
export type RespostaSaldo = { ok: true; saldo: Saldo } | { ok: false; msg: string } | null;

// Cliente digita o WhatsApp → primeiro nome e saldos (nada de dados pessoais)
export async function consultarSaldo(_: RespostaSaldo, form: FormData): Promise<RespostaSaldo> {
  const numero = String(form.get("whatsapp") ?? "").replace(/\D/g, "");
  if (numero.length < 10 || numero.length > 13) return { ok: false, msg: "Digite o WhatsApp com DDD. Ex: (88) 99232-0187" };
  const { data, error } = await supabasePublico().rpc("consulta_saldo", { p_arena: process.env.ARENA_ID!, p_whatsapp: numero });
  if (error) return { ok: false, msg: "Não deu para consultar agora. Tente de novo." };
  const s = (data as Saldo[] | null)?.[0];
  if (!s) return { ok: false, msg: "Não achamos cadastro com esse WhatsApp. O cadastro é feito no balcão da arena." };
  return { ok: true, saldo: s };
}
