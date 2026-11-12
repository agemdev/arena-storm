import { Suspense } from "react";
import Link from "next/link";
import { exigirDono } from "@/lib/auth";
import { BaixarCsv } from "@/app/painel/relatorios/Botoes";

const TABELAS = {
  clientes: "Clientes",
  minutos_lancamentos: "Banco de minutos (extrato)",
  pacote_lancamentos: "Pacotes de horas (extrato)",
  atendimentos: "Atendimentos",
  consumos: "Consumos",
  pagamentos: "Pagamentos",
  agendamentos: "Agendamentos",
  produtos: "Produtos",
  equipamentos: "Equipamentos",
  planos: "Planos e preços",
} as const;

// Backup de uma arena: uma planilha por tabela (para guardar ou entregar ao cliente)
export default function BackupPage({ params }: PageProps<"/painel/dono/backup/[id]">) {
  return (
    <div className="space-y-6">
      <Link href="/painel/dono" className="text-sm text-cyan hover:underline">
        ← Voltar
      </Link>
      <Suspense fallback={<p className="text-muted-foreground">Juntando os dados...</p>}>
        <Backup params={params} />
      </Suspense>
    </div>
  );
}

async function Backup({ params }: { params: PageProps<"/painel/dono/backup/[id]">["params"] }) {
  const { id } = await params;
  const { supabase } = await exigirDono();
  const { data: arenas } = await supabase.rpc("arenas_do_sistema");
  const arena = (arenas as { id: string; nome: string }[] | null)?.find((a) => a.id === id);
  if (!arena) return <p>Arena não encontrada.</p>;

  const dados = await Promise.all(
    Object.keys(TABELAS).map(async (t) => {
      // De 1000 em 1000 (limite do banco por vez)
      const linhas: Record<string, unknown>[] = [];
      for (let i = 0; ; i += 1000) {
        const { data } = await supabase.rpc("backup_arena", { p_arena: id, p_tabela: t }).range(i, i + 999);
        const lote = ((data ?? []) as Record<string, unknown>[]).map((r) => (r && "backup_arena" in r ? (r.backup_arena as Record<string, unknown>) : r));
        linhas.push(...lote);
        if (lote.length < 1000) break;
      }
      return [t, linhas] as const;
    }),
  );
  const nome = arena.nome.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-");

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">💾 Backup · {arena.nome}</h1>
      <p className="text-sm text-muted-foreground">Baixe cada planilha (abre no Excel). Guarde antes de apagar a arena ou envie ao cliente se ele pedir.</p>
      <ul className="divide-y divide-border rounded-xl border border-border">
        {dados.map(([t, linhas]) => {
          const colunas = linhas.length ? Object.keys(linhas[0]) : [];
          const valores = linhas.map((l) => colunas.map((c) => (l[c] == null ? "" : typeof l[c] === "object" ? JSON.stringify(l[c]) : (l[c] as string | number))));
          return (
            <li key={t} className="flex items-center justify-between gap-3 px-4 py-2">
              <span>
                {TABELAS[t as keyof typeof TABELAS]} <span className="text-muted-foreground">({linhas.length})</span>
              </span>
              {linhas.length > 0 && <BaixarCsv nome={`${nome}-${t}`} colunas={colunas} linhas={valores} />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
