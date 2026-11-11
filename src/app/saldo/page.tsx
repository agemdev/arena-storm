import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/site/Header";
import Rodape from "@/components/site/Rodape";
import Titulo from "@/components/site/Titulo";
import Consulta from "./Consulta";

export const metadata: Metadata = { title: "Consultar saldo – Arena Storm" };

// Consulta de saldo de minutos e pacote (sem login)
export default function SaldoPage() {
  return (
    <>
      <Header />
      <main className="px-4 py-16">
        <Titulo tag="⏱️ Saldo" titulo="Consulte seus minutos" texto="A cada R$ 1 gasto você ganha 1 minuto. Veja quanto tem para jogar." />
        <Consulta />
        <p className="mt-10 text-center text-sm text-muted-foreground">
          <Link href="/ranking" className="text-cyan hover:underline">
            🏆 Ver o ranking
          </Link>
        </p>
      </main>
      <Rodape />
    </>
  );
}
