import { Suspense } from "react";
import Link from "next/link";
import { exigirAdmin } from "@/lib/auth";
import { horas } from "@/lib/formatos";
import { hojeISO } from "@/lib/caixa";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Linha = { cliente_id: string; nome: string; minutos: number };

// Ranking de horas jogadas (nomes completos). O site mostra o top 10 só com primeiro nome.
export default function RankingPainel() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="font-display text-2xl font-bold">🏆 Ranking de horas</h1>
        <a href="/ranking" target="_blank" className="text-sm text-cyan hover:underline">
          Ver como aparece no site ↗
        </a>
      </div>
      <Suspense fallback={<p className="text-muted-foreground">Carregando...</p>}>
        <Tabelas />
      </Suspense>
    </div>
  );
}

async function Tabelas() {
  const { supabase, arenaId } = await exigirAdmin();
  const inicioMes = `${hojeISO().slice(0, 7)}-01`;
  const [mes, sempre] = await Promise.all([
    supabase.rpc("ranking_painel", { p_arena: arenaId, p_desde: inicioMes, p_limite: 50 }),
    supabase.rpc("ranking_painel", { p_arena: arenaId, p_desde: null, p_limite: 50 }),
  ]);
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Tabela titulo="Este mês" linhas={(mes.data ?? []) as Linha[]} />
      <Tabela titulo="Desde sempre" linhas={(sempre.data ?? []) as Linha[]} />
    </div>
  );
}

function Tabela({ titulo, linhas }: { titulo: string; linhas: Linha[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        {linhas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum cliente cadastrado jogou ainda.</p>
        ) : (
          <ol className="divide-y divide-border text-sm">
            {linhas.map((l, i) => (
              <li key={l.cliente_id} className="flex items-center gap-3 py-2">
                <span className="w-8 text-right font-bold text-muted-foreground">{["🥇", "🥈", "🥉"][i] ?? `${i + 1}º`}</span>
                <Link href={`/painel/clientes/${l.cliente_id}`} className="flex-1 truncate hover:underline">
                  {l.nome}
                </Link>
                <span className="font-semibold text-cyan">{horas(l.minutos)}</span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
