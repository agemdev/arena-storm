import "server-only";
import { redirect } from "next/navigation";
import { criarSupabase } from "@/lib/supabase/server";

// Confere o login e descobre a arena do admin. Use em toda página/ação do painel.
export async function exigirAdmin() {
  const supabase = await criarSupabase();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: membro } = await supabase
    .from("membros")
    .select("arena_id, arenas(nome)")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (!membro) redirect("/login?erro=sem-arena");

  const arena = membro.arenas as unknown as { nome: string } | null;
  return {
    supabase,
    email: (data.claims.email as string) ?? "",
    arenaId: membro.arena_id as string,
    arenaNome: arena?.nome ?? "",
  };
}
