import "server-only";
import { cacheLife } from "next/cache";
import { createClient } from "@supabase/supabase-js";

export type Estado = { uf: string; nome: string };
export type Cidade = { id: number; nome: string };

// Estados e cidades não mudam: lê sem login e guarda em cache
function supabasePublico() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  });
}

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
