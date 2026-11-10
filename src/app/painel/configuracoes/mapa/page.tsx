import { Suspense } from "react";
import { exigirAdmin } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import EditorMapa from "./EditorMapa";

// Onde cada máquina fica no salão (usado na tela Máquinas)
export default function MapaConfigPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold">Mapa das máquinas</h2>
        <p className="text-sm text-muted-foreground">Monte o salão como ele é. A tela “Máquinas” mostra cada uma no seu lugar.</p>
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
  const { supabase } = await exigirAdmin();
  const { data } = await supabase.from("equipamentos").select("id, nome, tipo, mapa_x, mapa_y, compartilha_com, icone").eq("ativo", true).order("ordem");
  const inicial = (data ?? []).map((e) => ({ id: e.id, nome: e.nome, tipo: e.tipo, x: e.mapa_x, y: e.mapa_y, tv: e.compartilha_com, icone: e.icone }));
  return <EditorMapa inicial={inicial} />;
}
