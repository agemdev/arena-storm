"use client";

import { useActionState, useState } from "react";
import { receber } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FORMAS, type Forma } from "@/lib/caixa";

type Props = { atendimentoId: string; falta: number; saldoMinutos: number | null };

// Botões de forma de pagamento + valor (já vem com o que falta)
export default function Receber({ atendimentoId, falta, saldoMinutos }: Props) {
  const [res, acao, enviando] = useActionState(receber, null);
  const [forma, setForma] = useState<Forma | "">("");
  const sugestao = falta > 0 ? falta.toFixed(2).replace(".", ",") : "";

  return (
    <form key={res?.ok ? `${res.msg}${falta}` : "f"} action={acao} className="space-y-3">
      <input type="hidden" name="atendimento_id" value={atendimentoId} />
      <input type="hidden" name="forma" value={forma} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(Object.keys(FORMAS) as Forma[]).map((f) => {
          const bloqueado = f === "minutos" && saldoMinutos === null;
          return (
            <button
              key={f}
              type="button"
              disabled={bloqueado}
              onClick={() => setForma(f)}
              className={`rounded-xl border px-3 py-3 text-sm font-semibold transition disabled:opacity-40 ${
                forma === f ? "border-purple bg-primary/20 text-purple" : "border-border hover:bg-accent"
              }`}
            >
              {FORMAS[f]}
              {f === "minutos" && saldoMinutos !== null && (
                <span className="block text-xs font-normal text-muted-foreground">saldo {saldoMinutos} min</span>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input name="valor" inputMode="decimal" defaultValue={sugestao} placeholder="Valor" aria-label="Valor recebido" className="w-32" />
        <Button type="submit" disabled={enviando || !forma}>
          {enviando ? "Registrando..." : "Receber"}
        </Button>
        {!forma && <span className="text-xs text-muted-foreground">Escolha a forma de pagamento</span>}
      </div>
      {forma === "minutos" && <p className="text-xs text-muted-foreground">R$ 1 = 1 minuto. Desconta do saldo do cliente.</p>}
      {res && <p className={`text-sm ${res.ok ? "text-green" : "text-destructive"}`}>{res.msg}</p>}
    </form>
  );
}
