"use client";

import { useActionState } from "react";
import { darMinutos } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// "Dar minutos" grátis (promoção, sorteio, ação). Fica no extrato com o motivo.
export default function DarMinutos({ clienteId }: { clienteId: string }) {
  const [res, acao, enviando] = useActionState(darMinutos, null);
  return (
    <details className="rounded-lg border border-border" open={!!res && !res.ok}>
      <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-purple">🎁 Dar minutos (promoção)</summary>
      <form key={res?.ok ? res.msg : "f"} action={acao} className="flex flex-wrap items-end gap-2 p-3 pt-1">
        <input type="hidden" name="cliente_id" value={clienteId} />
        <Input name="minutos" inputMode="numeric" placeholder="Minutos" aria-label="Minutos" className="w-28" required />
        <Input name="obs" placeholder="Motivo (ex.: sorteio do Instagram)" aria-label="Motivo" className="min-w-48 flex-1" maxLength={120} required />
        <Button type="submit" disabled={enviando}>
          {enviando ? "Dando..." : "Dar minutos"}
        </Button>
        {res && <p className={`w-full text-sm ${res.ok ? "text-green" : "text-destructive"}`}>{res.msg}</p>}
      </form>
    </details>
  );
}
