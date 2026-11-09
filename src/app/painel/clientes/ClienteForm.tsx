"use client";

import { useActionState } from "react";
import { salvarCliente } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = { cliente?: { id: string; nome: string; whatsapp: string } };

// Formulário de cliente (novo ou edição)
export default function ClienteForm({ cliente }: Props) {
  const [res, acao, enviando] = useActionState(salvarCliente, null);

  return (
    // key muda após salvar → limpa os campos
    <form key={res?.ok ? res.msg : "form"} action={acao} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      {cliente && <input type="hidden" name="id" value={cliente.id} />}
      <div className="space-y-2">
        <Label htmlFor="nome">Nome</Label>
        <Input id="nome" name="nome" defaultValue={cliente?.nome} required minLength={2} autoComplete="off" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="whatsapp">WhatsApp</Label>
        <Input
          id="whatsapp"
          name="whatsapp"
          type="tel"
          inputMode="numeric"
          placeholder="(88) 99999-9999"
          defaultValue={cliente?.whatsapp}
          required
          autoComplete="off"
        />
      </div>
      <Button type="submit" disabled={enviando}>
        {enviando ? "Salvando..." : cliente ? "Salvar" : "Cadastrar"}
      </Button>
      {res && (
        <p className={`text-sm sm:col-span-3 ${res.ok ? "text-green" : "text-destructive"}`}>{res.msg}</p>
      )}
    </form>
  );
}
