import { Suspense } from "react";
import { exigirAdmin } from "@/lib/auth";
import { hojeISO } from "@/lib/caixa";
import { clientesComPacote, clientesComSaldo, encerrarVencidos, estadoMaquinas } from "@/lib/caixa-servidor";
import AoVivo from "@/components/painel/AoVivo";
import DetalheJanela from "../caixa/Detalhe";
import Mapa from "./Mapa";

// Painel de máquinas: mapa da arena ao vivo
export default function MaquinasPage({ searchParams }: PageProps<"/painel/maquinas">) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Carregando máquinas...</p>}>
      <Maquinas searchParams={searchParams} />
    </Suspense>
  );
}

async function Maquinas({ searchParams }: { searchParams: PageProps<"/painel/maquinas">["searchParams"] }) {
  const { supabase, arenaId } = await exigirAdmin();
  await encerrarVencidos(supabase);
  const { abrir } = await searchParams;
  const abrirId = typeof abrir === "string" && /^[0-9a-f-]{36}$/.test(abrir) ? abrir : null;

  const [{ maquinas, semMaquina }, clientes, plano, comSaldo, comPacote] = await Promise.all([
    estadoMaquinas(supabase),
    supabase.from("clientes").select("id, nome, whatsapp").order("nome").limit(5000),
    supabase.from("planos").select("preco").eq("arena_id", arenaId).eq("unidade", "/hora").order("ordem").limit(1).maybeSingle(),
    clientesComSaldo(supabase),
    clientesComPacote(supabase),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="font-display text-2xl font-bold">Máquinas</h1>
        <span className="text-sm text-muted-foreground">Clique numa livre para iniciar · numa ocupada para ver, estender ou encerrar.</span>
      </div>

      <Mapa
        maquinas={maquinas}
        semMaquina={semMaquina}
        data={hojeISO()}
        valorHora={String(plano.data?.preco ?? 12).replace(".", ",")}
        clientes={clientes.data ?? []}
        comSaldo={comSaldo}
        comPacote={comPacote}
      />

      <AoVivo />

      {abrirId && (
        <Suspense fallback={null}>
          <DetalheJanela key={abrirId} id={abrirId} fecharHref="/painel/maquinas" />
        </Suspense>
      )}
    </div>
  );
}
