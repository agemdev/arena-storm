import { Suspense } from "react";
import { exigirAdmin } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import ItemForm, { type Item } from "./ItemForm";

type Props = { tabela: "equipamentos" | "produtos"; titulo: string; ajuda: string };

// Página de lista editável (usada por Equipamentos e Produtos)
export default function ListaItens({ tabela, titulo, ajuda }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold">{titulo}</h2>
        <p className="text-sm text-muted-foreground">{ajuda}</p>
      </div>
      <Card>
        <CardContent className="space-y-2 pt-2">
          <Suspense fallback={<p className="text-muted-foreground">Carregando...</p>}>
            <Itens tabela={tabela} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

async function Itens({ tabela }: { tabela: Props["tabela"] }) {
  const { supabase, arenaId } = await exigirAdmin();
  const campos = tabela === "produtos" ? "id, nome, ativo, ordem, preco" : "id, nome, ativo, ordem, tipo";
  const { data } = await supabase.from(tabela).select(campos).eq("arena_id", arenaId).order("ordem").order("nome");
  const itens = (data ?? []) as unknown as Item[];
  const proximaOrdem = Math.max(0, ...itens.map((i) => i.ordem)) + 1;

  return (
    <>
      {itens.length === 0 && <p className="text-sm text-muted-foreground">Nenhum item ainda. Adicione abaixo.</p>}
      {itens.map((i) => (
        <ItemForm key={i.id} tabela={tabela} item={i} />
      ))}
      <p className="pt-3 text-sm font-medium text-purple">+ Adicionar novo</p>
      <ItemForm tabela={tabela} proximaOrdem={proximaOrdem} />
    </>
  );
}
