import "server-only";
import { cacheLife } from "next/cache";
import { supabasePublico } from "@/lib/supabase/publico";
export { horas } from "@/lib/formatos";

export type LinhaRanking = { posicao: number; nome: string; minutos: number };

// Top 10 do site (primeiro nome + inicial). Atualiza a cada poucos minutos.
export async function rankingPublico(periodo: "mes" | "sempre", arenaId = process.env.ARENA_ID!): Promise<LinhaRanking[]> {
  "use cache";
  cacheLife("minutes");
  const { data } = await supabasePublico().rpc("ranking_publico", { p_arena: arenaId, p_periodo: periodo });
  return (data ?? []) as LinhaRanking[];
}
