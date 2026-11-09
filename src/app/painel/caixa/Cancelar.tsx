"use client";

import { useActionState, useEffect, useState } from "react";
import { Ban } from "lucide-react";
import { cancelarAtendimento } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Janela from "@/components/painel/Janela";
import { reais } from "@/lib/formatos";

type Props = { id: string; nome: string; emUso: boolean; pago: number; compacto?: boolean };

// Botão "Cancelar" + confirmação (pode cancelar a qualquer momento, mesmo em uso)
export default function Cancelar({ id, nome, emUso, pago, compacto }: Props) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      {compacto ? (
        <Button type="button" size="sm" variant="ghost" title="Cancelar" className="text-muted-foreground hover:text-destructive" onClick={() => setAberto(true)}>
          <Ban className="size-4" />
        </Button>
      ) : (
        <Button type="button" variant="outline" className="border-destructive/40 text-destructive" onClick={() => setAberto(true)}>
          <Ban className="size-4" /> Cancelar atendimento
        </Button>
      )}
      {aberto && <Confirmar id={id} nome={nome} emUso={emUso} pago={pago} fechar={() => setAberto(false)} />}
    </>
  );
}

function Confirmar({ id, nome, emUso, pago, fechar }: Omit<Props, "compacto"> & { fechar: () => void }) {
  const [res, acao, enviando] = useActionState(cancelarAtendimento, null);
  useEffect(() => {
    if (res?.ok) fechar();
  }, [res, fechar]);

  return (
    <Janela onFechar={fechar} titulo={<h2 className="font-display text-xl font-bold text-destructive">Cancelar atendimento?</h2>}>
      <form action={acao} className="space-y-4">
        <input type="hidden" name="id" value={id} />
        <p>
          <b>{nome}</b>
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {emUso && <li>O tempo para agora e a máquina fica livre.</li>}
          <li>O valor zera e não entra no caixa do dia.</li>
          {pago > 0 && <li className="text-amber">Os pagamentos recebidos ({reais(pago)}) serão estornados.</li>}
          <li>Fica na lista riscado. Dá para desfazer depois.</li>
        </ul>
        <div className="space-y-2">
          <Label htmlFor={`motivo-${id}`}>Motivo (opcional)</Label>
          <Input id={`motivo-${id}`} name="motivo" maxLength={200} placeholder="Ex.: cliente desistiu, lançado errado" autoFocus />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="destructive" disabled={enviando}>
            {enviando ? "Cancelando..." : "Sim, cancelar"}
          </Button>
          <Button type="button" variant="ghost" onClick={fechar}>
            Voltar
          </Button>
        </div>
        {res && !res.ok && <p className="text-sm text-destructive">{res.msg}</p>}
      </form>
    </Janela>
  );
}
