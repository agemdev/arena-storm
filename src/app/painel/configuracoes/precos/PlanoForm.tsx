"use client";

import { useActionState } from "react";
import { salvarPlano } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/native-select";
import type { Plano } from "@/lib/formatos";

type Props = { plano?: Plano; categoria: "plano" | "festa"; proximaOrdem?: number };

// Formulário de um plano/pacote (novo ou edição)
export default function PlanoForm({ plano, categoria, proximaOrdem = 0 }: Props) {
  const [res, acao, enviando] = useActionState(salvarPlano, null);
  const festa = categoria === "festa";
  const precoTexto = plano ? String(plano.preco).replace(".", ",") : "";

  return (
    // key muda após criar → limpa o formulário de "novo"
    <form key={!plano && res?.ok ? res.msg : "f"} action={acao} className="grid gap-4 sm:grid-cols-4">
      {plano && <input type="hidden" name="id" value={plano.id} />}
      <input type="hidden" name="categoria" value={categoria} />

      <div className="space-y-2 sm:col-span-2">
        <Label>Nome</Label>
        <Input name="nome" defaultValue={plano?.nome} required minLength={2} maxLength={60} />
      </div>
      <div className="space-y-2">
        <Label>Preço (R$)</Label>
        <Input name="preco" inputMode="decimal" defaultValue={precoTexto} placeholder="12,00" required />
      </div>
      {festa ? (
        <div className="space-y-2">
          <Label>Ordem</Label>
          <Input name="ordem" type="number" min={0} defaultValue={plano?.ordem ?? proximaOrdem} />
        </div>
      ) : (
        <div className="space-y-2">
          <Label>Unidade</Label>
          <Input name="unidade" defaultValue={plano?.unidade ?? ""} placeholder="/hora" maxLength={20} />
        </div>
      )}

      {festa ? (
        <div className="space-y-2 sm:col-span-4">
          <Label>Descrição</Label>
          <Input name="descricao" defaultValue={plano?.descricao ?? ""} placeholder="Até 10 pessoas · 3 horas" maxLength={120} />
        </div>
      ) : (
        <>
          <div className="space-y-2 sm:col-span-3">
            <Label>Vantagens (uma por linha)</Label>
            <Textarea name="itens" rows={3} defaultValue={plano?.itens.join("\n")} placeholder={"Periféricos inclusos\nMonitores 180Hz"} />
          </div>
          <div className="space-y-2">
            <Label>Ordem</Label>
            <Input name="ordem" type="number" min={0} defaultValue={plano?.ordem ?? proximaOrdem} />
          </div>
        </>
      )}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm sm:col-span-4">
        {!festa && (
          <label className="flex items-center gap-2">
            <input type="checkbox" name="destaque" defaultChecked={plano?.destaque} /> Destacar (&quot;Mais pedido&quot;)
          </label>
        )}
        <label className="flex items-center gap-2">
          <input type="checkbox" name="ativo" defaultChecked={plano?.ativo ?? true} /> Mostrar no site
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3 sm:col-span-4">
        <Button type="submit" disabled={enviando}>
          {enviando ? "Salvando..." : plano ? "Salvar" : "Adicionar"}
        </Button>
        {plano && (
          <Button type="submit" name="acao" value="excluir" variant="destructive" disabled={enviando}>
            Excluir
          </Button>
        )}
        {res && <p className={`text-sm ${res.ok ? "text-green" : "text-destructive"}`}>{res.msg}</p>}
      </div>
    </form>
  );
}
