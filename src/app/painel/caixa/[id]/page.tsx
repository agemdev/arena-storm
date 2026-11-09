import { Suspense } from "react";
import { redirect } from "next/navigation";
import { exigirAdmin } from "@/lib/auth";

// Endereço antigo: agora o atendimento abre em janela flutuante na lista do caixa
export default function AtendimentoPage({ params }: PageProps<"/painel/caixa/[id]">) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Carregando...</p>}>
      <Ir params={params} />
    </Suspense>
  );
}

async function Ir({ params }: { params: PageProps<"/painel/caixa/[id]">["params"] }) {
  const { id } = await params;
  const { supabase } = await exigirAdmin();
  const { data } = await supabase.from("atendimentos").select("data").eq("id", id).maybeSingle();
  redirect(data ? `/painel/caixa?data=${data.data}&abrir=${id}` : "/painel/caixa");
  return null;
}
