import Header from "@/components/site/Header";
import Hero from "@/components/site/Hero";
import Estrutura from "@/components/site/Estrutura";
import Galeria from "@/components/site/Galeria";
import Precos from "@/components/site/Precos";
import Torneios from "@/components/site/Torneios";
import Local from "@/components/site/Local";
import Faq from "@/components/site/Faq";
import Rodape from "@/components/site/Rodape";

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
