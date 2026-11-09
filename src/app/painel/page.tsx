import { Suspense } from "react";
import Link from "next/link";
import { exigirAdmin } from "@/lib/auth";
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
  const { count } = await supabase.from("clientes").select("id", { count: "exact", head: true });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">{arenaNome}</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/painel/clientes">
          <Card className="transition hover:bg-card-hover">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Clientes cadastrados</CardTitle>
            </CardHeader>
            <CardContent className="font-display text-4xl font-bold text-cyan">{count ?? 0}</CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
