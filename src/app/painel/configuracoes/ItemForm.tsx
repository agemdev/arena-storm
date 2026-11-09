"use client";

import { useActionState } from "react";
import { salvarItem } from "./itens-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { TIPOS_EQUIP } from "@/lib/caixa";

export type Item = { id: string; nome: string; ativo: boolean; ordem: number; preco?: number; tipo?: string };

type Props = { tabela: "equipamentos" | "produtos"; item?: Item; proximaOrdem?: number };

// Uma linha editável de equipamento ou produto
export default function ItemForm({ tabela, item, proximaOrdem = 0 }: Props) {
  const [res, acao, enviando] = useActionState(salvarItem, null);
  const produto = tabela === "produtos";

  return (
    <form
      key={!item && res?.ok ? res.msg : "f"}
      action={acao}
      className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2"
    >
      <input type="hidden" name="tabela" value={tabela} />
      {item && <input type="hidden" name="id" value={item.id} />}
      <Input name="nome" defaultValue={item?.nome} placeholder="Nome" required aria-label="Nome" className="w-40 flex-1" />
      {produto ? (
        <Input
          name="preco"
          inputMode="decimal"
          defaultValue={item?.preco != null ? String(item.preco).replace(".", ",") : ""}
          placeholder="Preço"
          required
          aria-label="Preço"
          className="w-24"
        />
      ) : (
        <NativeSelect name="tipo" defaultValue={item?.tipo ?? "pc"} aria-label="Tipo" className="w-36">
          {Object.entries(TIPOS_EQUIP).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </NativeSelect>
      )}
      <Input name="ordem" type="number" min={0} defaultValue={item?.ordem ?? proximaOrdem} aria-label="Ordem" title="Ordem" className="w-16" />
      <label className="flex items-center gap-1 text-sm text-muted-foreground">
        <input type="checkbox" name="ativo" defaultChecked={item?.ativo ?? true} /> Ativo
      </label>
      <Button type="submit" size="sm" disabled={enviando}>
        {item ? "Salvar" : "Adicionar"}
      </Button>
      {item && (
        <Button type="submit" name="acao" value="excluir" size="sm" variant="ghost" disabled={enviando}>
          Excluir
        </Button>
      )}
      {res && <span className={`w-full text-xs ${res.ok ? "text-green" : "text-destructive"}`}>{res.msg}</span>}
    </form>
  );
}
