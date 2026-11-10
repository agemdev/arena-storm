"use client";

import { useActionState } from "react";
import { venderPacote } from "../actions";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { reais } from "@/lib/formatos";
import { duracao } from "@/lib/caixa";

type Pacote = { id: string; nome: string; preco: number; pacote_minutos: number };

// Vender pacote de horas: credita as horas e abre o Caixa para receber
export default function VenderPacote({ clienteId, pacotes }: { clienteId: string; pacotes: Pacote[] }) {
  const [res, acao, enviando] = useActionState(venderPacote, null);
  if (!pacotes.length)
    return <p className="text-sm text-muted-foreground">Nenhum pacote cadastrado. Em Configurações → Preços, preencha “Pacote de horas” num plano.</p>;
  return (
    <form action={acao} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="cliente_id" value={clienteId} />
      <NativeSelect name="plano_id" aria-label="Pacote" className="min-w-56 flex-1" required defaultValue="">
        <option value="" disabled>
          Escolha o pacote...
        </option>
        {pacotes.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nome} · {duracao(p.pacote_minutos)} h · {reais(Number(p.preco))}
          </option>
        ))}
      </NativeSelect>
      <Button type="submit" disabled={enviando}>
        {enviando ? "Vendendo..." : "📦 Vender pacote"}
      </Button>
      <p className="w-full text-xs text-muted-foreground">As horas entram na hora. Depois abre o Caixa para receber o valor.</p>
      {res && !res.ok && <p className="w-full text-sm text-destructive">{res.msg}</p>}
    </form>
  );
}
