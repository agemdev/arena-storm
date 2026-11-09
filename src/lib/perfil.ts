import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { supabasePublico } from "@/lib/supabase/publico";
import { formatarWhats } from "@/lib/whatsapp";

export type PerfilPublico = {
  nome: string;
  logoUrl: string | null;
  whatsapp: string; // só números, com 55
  whatsappTexto: string; // (88) 99232-0187
  instagram: string | null;
  email: string | null;
  cidade: string; // Tianguá-CE
  endereco: string; // Rua X, 210 — Sala A — Centro, Tianguá-CE
};

// Endereço público do logotipo no Supabase Storage
export function urlLogo(caminho: string | null) {
  return caminho ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos/${caminho}` : null;
}

// Perfil da arena (site e painel). Em cache; o painel limpa ao salvar o perfil.
export async function perfilArena(arenaId = process.env.ARENA_ID!): Promise<PerfilPublico> {
  "use cache";
  cacheTag("arena");
  cacheLife("max");

  const { data: a } = await supabasePublico()
    .from("arenas")
    .select("nome, logo_path, whatsapp, instagram, email, logradouro, numero, complemento, bairro, cidades(nome, uf)")
    .eq("id", arenaId)
    .single();

  const c = a?.cidades as unknown as { nome: string; uf: string } | null;
  const cidade = c ? `${c.nome}-${c.uf}` : "";
  const rua = [a?.logradouro, a?.numero].filter(Boolean).join(", ");
  const endereco = [rua, a?.complemento, [a?.bairro, cidade].filter(Boolean).join(", ")].filter(Boolean).join(" — ");
  const whatsapp = a?.whatsapp ?? "";

  return {
    nome: a?.nome ?? "Arena",
    logoUrl: urlLogo(a?.logo_path ?? null),
    whatsapp,
    whatsappTexto: whatsapp ? formatarWhats(whatsapp) : "",
    instagram: a?.instagram ?? null,
    email: a?.email ?? null,
    cidade,
    endereco,
  };
}
