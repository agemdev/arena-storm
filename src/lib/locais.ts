import "server-only";
import { cacheLife } from "next/cache";
import { supabasePublico } from "@/lib/supabase/publico";

export type Estado = { uf: string; nome: string };
export type Cidade = { id: number; nome: string };

// Estados e cidades não mudam: guarda em cache
export async function listarEstados(): Promise<Estado[]> {
  "use cache";
  cacheLife("max");
  const { data } = await supabasePublico().from("estados").select("uf, nome").order("nome");
  return data ?? [];
}

export async function listarCidadesDoEstado(uf: string): Promise<Cidade[]> {
  "use cache";
  cacheLife("max");
  const { data } = await supabasePublico().from("cidades").select("id, nome").eq("uf", uf).order("nome").limit(1000);
  return data ?? [];
}
