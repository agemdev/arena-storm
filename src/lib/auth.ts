import "server-only";
import { redirect } from "next/navigation";
import { criarSupabase } from "@/lib/supabase/server";

// Tianguá-CE (código IBGE) – usado se a arena ainda não tiver cidade no perfil
export const CIDADE_PADRAO = { id: 2313401, uf: "CE" };

type ArenaLinha = { nome: string; cidade_id: number | null; cidades: { uf: string } | null };

// Confere o login e descobre a arena do admin. Use em toda página/ação do painel.
export async function exigirAdmin() {
  const supabase = await criarSupabase();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: membro } = await supabase
    .from("membros")
    .select("arena_id, arenas(nome, cidade_id, cidades(uf))")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (!membro) redirect("/login?erro=sem-arena");

  const arena = membro.arenas as unknown as ArenaLinha | null;
  return {
    supabase,
    email: (data.claims.email as string) ?? "",
    arenaId: membro.arena_id as string,
    arenaNome: arena?.nome ?? "",
    // Cidade padrão para novos clientes (vem do perfil da arena)
    cidadePadrao: arena?.cidade_id && arena.cidades
      ? { id: arena.cidade_id, uf: arena.cidades.uf }
      : CIDADE_PADRAO,
  };
}

// Dono do sistema (quem vende as licenças)? Use nas telas /painel/dono.
export async function exigirDono() {
  const admin = await exigirAdmin();
  const { data } = await admin.supabase.from("donos_sistema").select("user_id").maybeSingle();
  if (!data) redirect("/painel");
  return admin;
}
