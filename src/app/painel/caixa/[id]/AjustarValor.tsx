"use client";

import { useActionState, useState } from "react";
import { ajustarValor } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { lerValor } from "@/lib/caixa";
import { reais } from "@/lib/formatos";

type Props = { id: string; calculado: number; total: number; temAjuste: boolean };

// Muda o valor final: menor = desconto; maior = acréscimo com motivo obrigatório
export default function AjustarValor({ id, calculado, total, temAjuste }: Props) {
  const [res, acao, enviando] = useActionState(ajustarValor, null);
  const [valor, setValor] = useState(total.toFixed(2).replace(".", ","));
  const novo = lerValor(valor);
  const dif = Number.isFinite(novo) ? Math.round((novo - calculado) * 100) / 100 : 0;

  return (
    <details className="rounded-lg border border-border" open={!!res && !res.ok}>
      <summary className="cursor-pointer px-3 py-2 text-sm text-muted-foreground">Alterar valor final</summary>
      <form action={acao} className="space-y-2 border-t border-border p-3">
        <input type="hidden" name="id" value={id} />
        <p className="text-xs text-muted-foreground">Calculado: {reais(calculado)}</p>
        <Input name="valor_final" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} aria-label="Valor final" />
        {dif < 0 && <p className="text-xs text-green">Desconto de {reais(-dif)}</p>}
        {dif > 0 && (
          <>
            <p className="text-xs text-amber">Acréscimo de {reais(dif)}: diga o motivo</p>
            <Input name="motivo" placeholder="Ex: controle extra, dano no headset" required minLength={3} aria-label="Motivo" />
          </>
        )}
        {dif < 0 && <Input name="motivo" placeholder="Motivo do desconto (opcional)" aria-label="Motivo do desconto" />}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm" disabled={enviando}>
            Aplicar
          </Button>
          {temAjuste && (
            <Button type="submit" name="acao" value="remover" size="sm" variant="ghost" disabled={enviando} formNoValidate>
              Voltar ao calculado
            </Button>
          )}
        </div>
        {res && <p className={`text-xs ${res.ok ? "text-green" : "text-destructive"}`}>{res.msg}</p>}
      </form>
    </details>
  );
}
