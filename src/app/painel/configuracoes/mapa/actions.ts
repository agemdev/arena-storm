"use server";

import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/auth";

export type Resultado = { ok: boolean; msg: string } | null;
type Posicao = { id: string; x: number | null; y: number | null; tv: string | null; icone: string | null };

// Salva posição no mapa e "divide a TV com" de todas as máquinas
export async function salvarMapa(_: Resultado, form: FormData): Promise<Resultado> {
  const { supabase } = await exigirAdmin();
  let lista: Posicao[];
  try {
    lista = JSON.parse(String(form.get("mapa")));
  } catch {
    return { ok: false, msg: "Dados inválidos." };
  }
  const usadas = new Set<string>();
  for (const p of lista) {
    if (p.x && p.y) {
      const k = `${p.x},${p.y}`;
      if (usadas.has(k)) return { ok: false, msg: "Duas máquinas no mesmo lugar." };
      usadas.add(k);
    }
  }
  for (const p of lista) {
    const { error } = await supabase
      .from("equipamentos")
      .update({ mapa_x: p.x || null, mapa_y: p.y || null, compartilha_com: p.tv && p.tv !== p.id ? p.tv : null, icone: p.icone?.trim().slice(0, 32) || null })
      .eq("id", p.id);
    if (error) return { ok: false, msg: "Erro ao salvar o mapa." };
  }
  revalidatePath("/painel", "layout");
  return { ok: true, msg: "Mapa salvo!" };
}
