import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { supabasePublico } from "@/lib/supabase/publico";
import type { Horario, Plano } from "@/lib/formatos";
export * from "@/lib/formatos";

// Horários da semana (site). Em cache; limpa ao salvar nas Configurações.
export async function horariosArena(arenaId = process.env.ARENA_ID!): Promise<Horario[]> {
  "use cache";
  cacheTag("arena");
  cacheLife("max");
  const { data } = await supabasePublico()
    .from("horarios")
    .select("dia, fechado, abre, fecha")
    .eq("arena_id", arenaId)
    .order("dia");
  return data ?? [];
}

// Planos e festas ativos (site)
export async function planosArena(arenaId = process.env.ARENA_ID!): Promise<Plano[]> {
  "use cache";
  cacheTag("arena");
  cacheLife("max");
  const { data } = await supabasePublico()
    .from("planos")
    .select("id, categoria, nome, preco, unidade, descricao, itens, destaque, ativo, ordem")
    .eq("arena_id", arenaId)
    .eq("ativo", true)
    .order("ordem");
  return (data ?? []) as Plano[];
}
