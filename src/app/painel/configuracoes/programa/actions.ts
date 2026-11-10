"use server";

import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/auth";

export type Resultado = { ok: boolean; msg: string; n?: number } | null;

// Troca a senha mestre do programa dos PCs (Ctrl + Alt + Shift + A). Mínimo 6 caracteres.
export async function trocarSenhaMestre(_: Resultado, form: FormData): Promise<Resultado> {
  const { supabase, arenaId } = await exigirAdmin();
  const senha = String(form.get("senha") ?? "");
  const repetir = String(form.get("repetir") ?? "");
  if (senha.length < 6) return { ok: false, msg: "A senha precisa de pelo menos 6 caracteres." };
  if (senha !== repetir) return { ok: false, msg: "As duas senhas não são iguais." };
  const { error } = await supabase.rpc("definir_senha_mestre", { p_arena: arenaId, p_senha: senha });
  if (error) return { ok: false, msg: "Erro ao salvar a senha." };
  revalidatePath("/painel/configuracoes/programa");
  return { ok: true, msg: "Senha mestre trocada! Os PCs recebem a nova em alguns segundos.", n: Date.now() };
}

// Esquecer um PC (ex.: formatado ou trocado). Ele se cadastra de novo ao abrir o programa.
export async function removerAgente(form: FormData) {
  const { supabase } = await exigirAdmin();
  await supabase.from("agentes").delete().eq("id", String(form.get("id")));
  revalidatePath("/painel", "layout");
}
