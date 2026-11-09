import { Suspense } from "react";
import { exigirAdmin } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import type { Horario } from "@/lib/formatos";
import HorariosForm from "./HorariosForm";

// Horários de funcionamento (aparecem no site)
export default function HorariosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold">Horários</h2>
        <p className="text-sm text-muted-foreground">
          Se o fechamento for menor que a abertura, vale até o dia seguinte (ex: 22:00 até 02:00).
        </p>
      </div>
      <Card>
        <CardContent className="pt-2">
          <Suspense fallback={<p className="text-muted-foreground">Carregando...</p>}>
            <Conteudo />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

async function Conteudo() {
  const { supabase, arenaId } = await exigirAdmin();
  const { data } = await supabase.from("horarios").select("dia, fechado, abre, fecha").eq("arena_id", arenaId);
  return <HorariosForm inicial={(data ?? []) as Horario[]} />;
}
