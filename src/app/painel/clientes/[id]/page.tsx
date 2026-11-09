import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirAdmin } from "@/lib/auth";
import { formatarWhats } from "@/lib/whatsapp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ClienteForm from "../ClienteForm";

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

async function Formulario({ params }: { params: PageProps<"/painel/clientes/[id]">["params"] }) {
  const { id } = await params;
  const { supabase } = await exigirAdmin();
  const { data: c } = await supabase.from("clientes").select("id, nome, whatsapp").eq("id", id).maybeSingle();
  if (!c) notFound();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Editar cliente</CardTitle>
      </CardHeader>
      <CardContent>
        <ClienteForm cliente={{ ...c, whatsapp: formatarWhats(c.whatsapp) }} />
      </CardContent>
    </Card>
  );
}
