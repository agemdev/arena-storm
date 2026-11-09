import { Suspense } from "react";
import Link from "next/link";
import { exigirAdmin } from "@/lib/auth";
import { reais } from "@/lib/formatos";
import { hojeISO, SELECT_ATENDIMENTO, totais, type AtendimentoLinha } from "@/lib/caixa";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Início do painel
export default function PainelInicio() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Carregando...</p>}>
      <Resumo />
    </Suspense>
  );
}

async function Resumo() {
  const { supabase, arenaNome } = await exigirAdmin();
  const [clientes, hoje] = await Promise.all([
    supabase.from("clientes").select("id", { count: "exact", head: true }),
    supabase.from("atendimentos").select(SELECT_ATENDIMENTO).eq("data", hojeISO()),
  ]);
  const lista = ((hoje.data ?? []) as unknown as AtendimentoLinha[]).map(totais);
  const totalHoje = lista.reduce((s, t) => s + t.total, 0);
  const emUso = lista.filter((t) => t.emUso).length;
  const aReceber = lista.reduce((s, t) => s + Math.max(0, t.falta), 0);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">{arenaNome}</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Cartao href="/painel/caixa" titulo="Caixa de hoje" valor={reais(totalHoje)} />
        <Cartao href="/painel/caixa" titulo="Máquinas em uso" valor={String(emUso)} />
        <Cartao href="/painel/caixa" titulo="A receber hoje" valor={reais(aReceber)} />
        <Cartao href="/painel/clientes" titulo="Clientes cadastrados" valor={String(clientes.count ?? 0)} />
      </div>
    </div>
  );
}

function Cartao({ href, titulo, valor }: { href: string; titulo: string; valor: string }) {
  return (
    <Link href={href}>
      <Card className="transition hover:bg-card-hover">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">{titulo}</CardTitle>
        </CardHeader>
        <CardContent className="font-display text-3xl font-bold text-cyan">{valor}</CardContent>
      </Card>
    </Link>
  );
}
