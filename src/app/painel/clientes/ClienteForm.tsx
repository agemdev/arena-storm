"use client";

import { useActionState } from "react";
import { salvarCliente } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/native-select";
import CampoMascara from "@/components/painel/CampoMascara";
import CampoCidade from "@/components/painel/CampoCidade";
import type { Cidade, Estado } from "@/lib/locais";

type Props = {
  cliente?: { id: string; nome: string; whatsapp: string; descricao: string | null };
  estados: Estado[];
  cidades: Cidade[];
  uf: string;
  cidadeId: number | null;
};

// Formulário de cliente (novo ou edição)
export default function ClienteForm({ cliente, estados, cidades, uf, cidadeId }: Props) {
  const [res, acao, enviando] = useActionState(salvarCliente, null);

  return (
    // key muda após salvar → limpa os campos
    <form key={res?.ok ? res.msg : "form"} action={acao} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cliente && <input type="hidden" name="id" value={cliente.id} />}
      <div className="space-y-2 lg:col-span-2">
        <Label htmlFor="nome">Nome</Label>
        <Input id="nome" name="nome" defaultValue={cliente?.nome} required minLength={2} autoComplete="off" />
      </div>
      <div className="space-y-2 lg:col-span-2">
        <Label htmlFor="whatsapp">WhatsApp</Label>
        <CampoMascara id="whatsapp" name="whatsapp" tipo="telefone" valorInicial={cliente?.whatsapp} required />
      </div>
      <CampoCidade estados={estados} cidadesIniciais={cidades} uf={uf} cidadeId={cidadeId} />
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="descricao">
          Descrição <span className="text-muted-foreground">(opcional)</span>
        </Label>
        <Textarea
          id="descricao"
          name="descricao"
          rows={2}
          maxLength={500}
          defaultValue={cliente?.descricao ?? ""}
          placeholder="Ex: filho da Maria, joga CS2, vem nas sextas"
        />
      </div>
      <div className="flex items-center gap-4 sm:col-span-2 lg:col-span-4">
        <Button type="submit" disabled={enviando}>
          {enviando ? "Salvando..." : cliente ? "Salvar" : "Cadastrar"}
        </Button>
        {res && <p className={`text-sm ${res.ok ? "text-green" : "text-destructive"}`}>{res.msg}</p>}
      </div>
    </form>
  );
}
