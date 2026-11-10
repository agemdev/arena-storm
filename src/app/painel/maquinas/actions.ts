"use server";

import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/auth";
import { SITUACOES_MAQUINA } from "@/lib/caixa";

// Muda a situação da máquina: manutenção, funcionário, uso sem cobrança ou "normal" (liberar)
export async function mudarSituacaoMaquina(form: FormData) {
  const { supabase } = await exigirAdmin();
  const situacao = String(form.get("situacao"));
  if (situacao !== "normal" && !(situacao in SITUACOES_MAQUINA)) return;
  const normal = situacao === "normal";
  await supabase
    .from("equipamentos")
    .update({
      situacao,
      situacao_obs: normal ? null : String(form.get("obs") ?? "").trim().slice(0, 120) || null,
      situacao_desde: normal ? null : new Date().toISOString(),
    })
    .eq("id", String(form.get("id")));
  revalidatePath("/painel", "layout");
}
