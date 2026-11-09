import Header from "@/components/site/Header";
import Hero from "@/components/site/Hero";
import Estrutura from "@/components/site/Estrutura";
import Galeria from "@/components/site/Galeria";
import Precos from "@/components/site/Precos";
import Torneios from "@/components/site/Torneios";
import Local from "@/components/site/Local";
import Faq from "@/components/site/Faq";
import Rodape from "@/components/site/Rodape";
import type { Metadata } from "next";
import { perfilArena } from "@/lib/perfil";

// Título da aba e ícone vêm do Perfil da arena
export async function generateMetadata(): Promise<Metadata> {
  const p = await perfilArena();
  return {
    title: `${p.nome} – Game Center${p.cidade ? ` em ${p.cidade}` : ""}`,
    icons: p.logoUrl ? { icon: p.logoUrl } : undefined,
  };
}

// Página inicial do site
export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Estrutura />
        <Galeria />
        <Precos />
        <Torneios />
        <Local />
        <Faq />
      </main>
      <Rodape />
    </>
  );
}
