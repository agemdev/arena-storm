import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/site/Header";
import Rodape from "@/components/site/Rodape";
import Titulo from "@/components/site/Titulo";
import { resolverSite, todosSlugs } from "@/lib/site";
import Consulta from "./Consulta";

export const metadata: Metadata = { title: "Consultar saldo" };

export async function generateStaticParams() {
  return (await todosSlugs()).map((slug) => ({ slug }));
}

// Consulta de saldo de minutos e pacote (sem login)
export default function SaldoPage({ params }: PageProps<"/s/[slug]/saldo">) {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <Saldo params={params} />
    </Suspense>
  );
}

async function Saldo({ params }: { params: PageProps<"/s/[slug]/saldo">["params"] }) {
  const s = await resolverSite(params);
  return (
    <>
      <Header {...s} />
      <main className="px-4 py-16">
        <Titulo tag="⏱️ Saldo" titulo="Consulte seus minutos" texto="A cada R$ 1 gasto você ganha 1 minuto. Veja quanto tem para jogar." />
        <Consulta slug={s.slug} />
        <p className="mt-10 text-center text-sm text-muted-foreground">
          <Link href={`${s.base}/ranking`} className="text-cyan hover:underline">
            🏆 Ver o ranking
          </Link>
        </p>
      </main>
      <Rodape {...s} />
    </>
  );
}
