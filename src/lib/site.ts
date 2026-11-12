import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import { supabasePublico } from "@/lib/supabase/publico";

// Site público de cada arena: qual arena (pelo apelido/subdomínio) e os textos/fotos dela.

// Arena mostrada no endereço principal (sem subdomínio) e em localhost
export const SLUG_PADRAO = process.env.SITE_PADRAO ?? "arenastorm";
// Domínio do sistema (ex.: "seudominio.com.br"). Com ele, "arenax.seudominio.com.br" abre o site da arena "arenax".
export const DOMINIO_SISTEMA = process.env.NEXT_PUBLIC_DOMINIO_SISTEMA ?? "";

// Toda parte do site recebe a arena e o começo dos links ("/s/apelido")
export type SiteProps = { arenaId: string; base: string };

export type Foto = { url: string; alt: string; grande?: boolean };
export type Torneio = { data: string; titulo: string; texto: string };
export type ConteudoSite = {
  titulo: string;
  chamada: string;
  aviso: string;
  numeros: { valor: string; label: string }[];
  estrutura: { icone: string; titulo: string; texto: string }[];
  jogos: string[];
  torneios: Torneio[];
  faq: { p: string; r: string }[];
  fotos: Foto[];
};

// Textos iniciais para uma arena nova (ela troca em Configurações → Site)
export const CONTEUDO_PADRAO: ConteudoSite = {
  titulo: "O melhor *lobby gamer* da região",
  chamada: "PCs gamer, consoles e um espaço completo pra você e sua crew.",
  aviso: "",
  numeros: [],
  estrutura: [
    { icone: "🖥️", titulo: "PCs Gamer", texto: "Máquinas preparadas para os competitivos do momento." },
    { icone: "🎮", titulo: "Consoles", texto: "Pra jogar sozinho ou com a galera." },
    { icone: "🏆", titulo: "Campeonatos", texto: "Torneios com a comunidade. Inscrição pelo WhatsApp." },
  ],
  jogos: ["Counter-Strike 2", "Valorant", "Fortnite", "League of Legends", "Free Fire"],
  torneios: [],
  faq: [{ p: "Como faço pra reservar?", r: "Chama a gente no WhatsApp com o dia, horário e quantas pessoas." }],
  fotos: [],
};

// Página do site: apelido da URL → arena (404 se não existir)
export async function resolverSite(params: Promise<{ slug: string }>): Promise<SiteProps & { slug: string }> {
  const { slug } = await params;
  const arenaId = await arenaPorSlug(slug);
  if (!arenaId) notFound();
  // Links: no endereço próprio (subdomínio ou arena padrão) começam em "/"; no teste começam em "/s/apelido"
  const base = slug === SLUG_PADRAO || DOMINIO_SISTEMA ? "" : `/s/${slug}`;
  return { arenaId, slug, base };
}

// Apelido → id da arena (null = não existe)
export async function arenaPorSlug(slug: string): Promise<string | null> {
  "use cache";
  cacheTag("arena");
  cacheLife("max");
  const { data } = await supabasePublico().from("arenas").select("id").eq("slug", slug.toLowerCase()).maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

// Todos os apelidos (para gerar as páginas)
export async function todosSlugs(): Promise<string[]> {
  "use cache";
  cacheTag("arena");
  cacheLife("max");
  const { data } = await supabasePublico().from("arenas").select("slug").not("slug", "is", null);
  return (data ?? []).map((a) => a.slug as string);
}

// Torneios de hoje em diante (revisa a cada hora)
export async function torneiosFuturos(arenaId: string): Promise<Torneio[]> {
  "use cache";
  cacheTag("arena");
  cacheLife("hours");
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza" }).format(new Date());
  return (await conteudoSite(arenaId)).torneios.filter((t) => t.data >= hoje).sort((a, b) => a.data.localeCompare(b.data));
}

// Textos e fotos do site (o que faltar usa o padrão)
export async function conteudoSite(arenaId: string): Promise<ConteudoSite> {
  "use cache";
  cacheTag("arena");
  cacheLife("max");
  const { data } = await supabasePublico().from("site_conteudo").select("*").eq("arena_id", arenaId).maybeSingle();
  if (!data) return CONTEUDO_PADRAO;
  return {
    titulo: data.titulo || CONTEUDO_PADRAO.titulo,
    chamada: data.chamada || CONTEUDO_PADRAO.chamada,
    aviso: data.aviso ?? "",
    numeros: data.numeros ?? [],
    estrutura: data.estrutura?.length ? data.estrutura : CONTEUDO_PADRAO.estrutura,
    jogos: data.jogos ?? [],
    torneios: data.torneios ?? [],
    faq: data.faq ?? [],
    fotos: data.fotos ?? [],
  };
}
