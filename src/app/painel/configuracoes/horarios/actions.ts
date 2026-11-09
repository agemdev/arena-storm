"use server";

import { updateTag } from "next/cache";
import { exigirAdmin } from "@/lib/auth";

export type Resultado = { ok: boolean; msg: string } | null;

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

// Salva os 7 dias de uma vez
export async function salvarHorarios(_: Resultado, form: FormData): Promise<Resultado> {
  const { supabase, arenaId } = await exigirAdmin();

  const linhas = [];
  for (let dia = 0; dia <= 6; dia++) {
    const fechado = form.get(`fechado_${dia}`) === "on";
    const abre = String(form.get(`abre_${dia}`) ?? "");
    const fecha = String(form.get(`fecha_${dia}`) ?? "");
    if (!fechado && (!HORA.test(abre) || !HORA.test(fecha))) {
      return { ok: false, msg: "Preencha abertura e fechamento de todos os dias abertos." };
    }
    linhas.push({ arena_id: arenaId, dia, fechado, abre: fechado ? null : abre, fecha: fechado ? null : fecha });
  }

  const { error } = await supabase.from("horarios").upsert(linhas, { onConflict: "arena_id,dia" });
  if (error) return { ok: false, msg: "Erro ao salvar. Tente de novo." };

  updateTag("arena"); // atualiza o site
  return { ok: true, msg: "Horários salvos! O site já foi atualizado." };
}
