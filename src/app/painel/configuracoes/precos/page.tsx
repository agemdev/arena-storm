import { Suspense } from "react";
import { exigirAdmin } from "@/lib/auth";
import { reais, type Plano } from "@/lib/formatos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PlanoForm from "./PlanoForm";

// Preços e pacotes exibidos no site
export default function PrecosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold">Preços e pacotes</h2>
        <p className="text-sm text-muted-foreground">Clique em um item para editar. Itens ocultos não aparecem no site.</p>
      </div>
      <Suspense fallback={<p className="text-muted-foreground">Carregando...</p>}>
        <Conteudo />
      </Suspense>
    </div>
  );
}

async function Conteudo() {
  const { supabase, arenaId } = await exigirAdmin();
  const { data } = await supabase
    .from("planos")
    .select("id, categoria, nome, preco, unidade, descricao, itens, destaque, ativo, ordem, pacote_minutos")
    .eq("arena_id", arenaId)
    .order("ordem");
  const todos = (data ?? []) as Plano[];

  return (
    <>
      <Secao titulo="Planos" categoria="plano" lista={todos.filter((p) => p.categoria === "plano")} />
      <Secao titulo="Festas de aniversário" categoria="festa" lista={todos.filter((p) => p.categoria === "festa")} />
    </>
  );
}

function Secao({ titulo, categoria, lista }: { titulo: string; categoria: "plano" | "festa"; lista: Plano[] }) {
  const proximaOrdem = Math.max(0, ...lista.map((p) => p.ordem)) + 1;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {lista.map((p) => (
          <details key={p.id} className="group rounded-xl border border-border">
            <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 p-3">
              <span className="font-medium">{p.nome}</span>
              <span className="text-cyan">
                {reais(p.preco)}
                {p.unidade}
              </span>
              {p.destaque && <span className="rounded-full bg-primary/15 px-2 text-xs text-purple">Mais pedido</span>}
              {!p.ativo && <span className="rounded-full bg-muted px-2 text-xs text-muted-foreground">Oculto</span>}
              <span className="ml-auto text-sm text-muted-foreground group-open:hidden">Editar</span>
            </summary>
            <div className="border-t border-border p-3">
              <PlanoForm plano={p} categoria={categoria} />
            </div>
          </details>
        ))}
        <details className="rounded-xl border border-dashed border-border">
          <summary className="cursor-pointer list-none p-3 text-sm font-medium text-purple">
            + Adicionar {categoria === "festa" ? "pacote de festa" : "plano"}
          </summary>
          <div className="border-t border-border p-3">
            <PlanoForm categoria={categoria} proximaOrdem={proximaOrdem} />
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
