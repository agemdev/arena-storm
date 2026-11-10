"use client";

import { useActionState, useState } from "react";
import { receberFiado } from "../../caixa/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const FORMAS = [
  ["dinheiro", "Dinheiro"],
  ["pix", "Pix"],
  ["cartao", "Cartão"],
] as const;

// Receber o fiado (tudo ou parte). Paga do mais antigo para o mais novo.
export default function ReceberFiado({ clienteId, divida }: { clienteId: string; divida: number }) {
  const [res, acao, enviando] = useActionState(receberFiado, null);
  const [forma, setForma] = useState("");
  return (
    <form key={res?.n ?? "f"} action={acao} className="space-y-3">
      <input type="hidden" name="cliente_id" value={clienteId} />
      <input type="hidden" name="forma" value={forma} />
      <div className="grid grid-cols-3 gap-2">
        {FORMAS.map(([f, nome]) => (
          <button
            key={f}
            type="button"
            onClick={() => setForma(f)}
            className={`rounded-xl border px-3 py-2.5 text-sm font-semibold ${forma === f ? "border-purple bg-primary/20 text-purple" : "border-border hover:bg-accent"}`}
          >
            {nome}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input name="valor" inputMode="decimal" defaultValue={divida.toFixed(2).replace(".", ",")} aria-label="Valor recebido" className="w-32" />
        <Button type="submit" disabled={enviando || !forma}>
          {enviando ? "Registrando..." : "Receber fiado"}
        </Button>
        <span className="text-xs text-muted-foreground">Pode ser só uma parte.</span>
      </div>
      {res && <p className={`text-sm ${res.ok ? "text-green" : "text-destructive"}`}>{res.msg}</p>}
    </form>
  );
}
