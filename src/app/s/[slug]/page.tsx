import { Suspense } from "react";
import type { Metadata } from "next";
import Header from "@/components/site/Header";
import Hero from "@/components/site/Hero";
import Estrutura from "@/components/site/Estrutura";
import Galeria from "@/components/site/Galeria";
import Precos from "@/components/site/Precos";
import Torneios from "@/components/site/Torneios";
import Local from "@/components/site/Local";
import Faq from "@/components/site/Faq";
import Rodape from "@/components/site/Rodape";
import { perfilArena } from "@/lib/perfil";
import { arenaPorSlug, resolverSite, todosSlugs } from "@/lib/site";

// Páginas prontas para as arenas que já existem; as novas são geradas na primeira visita
export async function generateStaticParams() {
  return (await todosSlugs()).map((slug) => ({ slug }));
}

// Título da aba e ícone vêm do Perfil da arena
export async function generateMetadata({ params }: PageProps<"/s/[slug]">): Promise<Metadata> {
  const arenaId = await arenaPorSlug((await params).slug);
  if (!arenaId) return { title: "Arena não encontrada" };
  const p = await perfilArena(arenaId);
  return {
    title: `${p.nome} – Game Center${p.cidade ? ` em ${p.cidade}` : ""}`,
    icons: p.logoUrl ? { icon: p.logoUrl } : undefined,
  };
}

// Página inicial do site da arena
export default function Home({ params }: PageProps<"/s/[slug]">) {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <Site params={params} />
    </Suspense>
  );
}

async function Site({ params }: { params: PageProps<"/s/[slug]">["params"] }) {
  const s = await resolverSite(params);
  return (
    <>
      <Header {...s} />
      <main>
        <Hero {...s} />
        <Estrutura {...s} />
        <Galeria {...s} />
        <Precos {...s} />
        <Torneios {...s} />
        <Local {...s} />
        <Faq {...s} />
      </main>
      <Rodape {...s} />
    </>
  );
}
