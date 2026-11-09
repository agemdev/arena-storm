import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirAdmin } from "@/lib/auth";
import { listarCidadesDoEstado, listarEstados } from "@/lib/locais";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ClienteForm from "../ClienteForm";

type Params = PageProps<"/painel/clientes/[id]">["params"];

// Editar um cliente
export default function EditarCliente({ params }: PageProps<"/painel/clientes/[id]">) {
  return (
    <div className="space-y-6">
      <Link href="/painel/clientes" className="text-sm text-muted-foreground hover:text-foreground">
        ← Voltar
      </Link>
      <Suspense fallback={<p className="text-muted-foreground">Carregando...</p>}>
        <Formulario params={params} />
      </Suspense>
    </div>
  );
}

async function Formulario({ params }: { params: Params }) {
  const { id } = await params;
  const { supabase, cidadePadrao } = await exigirAdmin();
  const { data } = await supabase
    .from("clientes")
    .select("id, nome, whatsapp, descricao, cidade_id, cidades(uf)")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();

  const c = data as unknown as typeof data & { cidades: { uf: string } | null };
  // Cliente antigo sem cidade → usa a cidade padrão da arena
  const uf = c.cidades?.uf ?? cidadePadrao.uf;
  const cidadeId = c.cidade_id ?? cidadePadrao.id;
  const [estados, cidades] = await Promise.all([listarEstados(), listarCidadesDoEstado(uf)]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Editar cliente</CardTitle>
      </CardHeader>
      <CardContent>
        <ClienteForm
          cliente={{ id: c.id, nome: c.nome, whatsapp: c.whatsapp.replace(/^55/, ""), descricao: c.descricao }}
          estados={estados}
          cidades={cidades}
          uf={uf}
          cidadeId={cidadeId}
        />
      </CardContent>
    </Card>
  );
}
