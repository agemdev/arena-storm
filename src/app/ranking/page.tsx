import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/site/Header";
import Rodape from "@/components/site/Rodape";
import Titulo from "@/components/site/Titulo";
import { horas, rankingPublico, type LinhaRanking } from "@/lib/ranking";

export const metadata: Metadata = { title: "Ranking – Arena Storm" };

// Ranking público: quem mais jogou no mês e desde sempre
export default async function RankingPage() {
  const [mes, sempre] = await Promise.all([rankingPublico("mes"), rankingPublico("sempre")]);
  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-16">
        <Titulo tag="🏆 Ranking" titulo="Quem mais joga na arena" texto="Horas jogadas pelos clientes cadastrados. Cadastre-se no balcão para entrar no ranking!" />
        <div className="grid gap-6 md:grid-cols-2">
          <Tabela titulo="Ranking do mês" linhas={mes} />
          <Tabela titulo="Ranking geral" linhas={sempre} />
        </div>
        <p className="mt-10 text-center text-sm text-muted-foreground">
          Quer ver seu saldo de minutos?{" "}
          <Link href="/saldo" className="text-cyan hover:underline">
            Consultar saldo
          </Link>
        </p>
      </main>
      <Rodape />
    </>
  );
}

const MEDALHAS = ["🥇", "🥈", "🥉"];

function Tabela({ titulo, linhas }: { titulo: string; linhas: LinhaRanking[] }) {
  return (
    <section className="rounded-2xl border border-white/5 bg-card p-6">
      <h2 className="mb-4 font-display text-xl font-bold">{titulo}</h2>
      {linhas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ainda ninguém. Seja o primeiro!</p>
      ) : (
        <ol className="space-y-2">
          {linhas.map((l) => (
            <li key={l.posicao} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${l.posicao <= 3 ? "bg-purple-strong/15" : "bg-white/[0.03]"}`}>
              <span className="w-8 text-center font-display text-lg font-bold">{MEDALHAS[l.posicao - 1] ?? `${l.posicao}º`}</span>
              <span className="flex-1 truncate font-semibold">{l.nome}</span>
              <span className="font-display font-bold text-cyan">{horas(l.minutos)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
