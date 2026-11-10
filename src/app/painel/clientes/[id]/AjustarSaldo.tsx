"use client";

import { useActionState } from "react";
import { ajustarSaldo } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = { clienteId: string; tipo: "minutos" | "pacote"; atual: string };

// Ajuste manual: digite o saldo novo + motivo (fica no extrato como "Ajuste")
export default function AjustarSaldo({ clienteId, tipo, atual }: Props) {
  const [res, acao, enviando] = useActionState(ajustarSaldo, null);
  return (
    <details className="rounded-lg border border-border" open={!!res && !res.ok}>
      <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-muted-foreground">✏️ Ajustar saldo à mão</summary>
      <form key={res?.ok ? res.msg : "f"} action={acao} className="flex flex-wrap items-end gap-2 p-3 pt-1">
        <input type="hidden" name="cliente_id" value={clienteId} />
        <input type="hidden" name="tipo" value={tipo} />
        <Input
          name="novo"
          defaultValue={atual}
          inputMode={tipo === "pacote" ? "text" : "numeric"}
          aria-label="Saldo novo"
          placeholder={tipo === "pacote" ? "3:40" : "120"}
          className="w-28"
          required
        />
        <Input name="obs" placeholder="Motivo (ex.: correção de lançamento)" aria-label="Motivo" className="min-w-48 flex-1" maxLength={120} required />
        <Button type="submit" variant="outline" disabled={enviando}>
          {enviando ? "Salvando..." : "Salvar saldo"}
        </Button>
        <p className="w-full text-xs text-muted-foreground">
          {tipo === "pacote" ? "Saldo em horas (ex.: 3:40 ou 2,5)." : "Saldo em minutos (R$ 1 = 1 min)."} O sistema lança a diferença no extrato.
        </p>
        {res && <p className={`w-full text-sm ${res.ok ? "text-green" : "text-destructive"}`}>{res.msg}</p>}
      </form>
    </details>
  );
}
