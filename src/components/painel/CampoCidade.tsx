"use client";

import { useState, useTransition } from "react";
import { buscarCidades } from "@/app/painel/locais-actions";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import type { Cidade, Estado } from "@/lib/locais";

type Props = {
  estados: Estado[];
  cidadesIniciais: Cidade[];
  uf: string;
  cidadeId: number | null;
};

// Duas listas: Estado (UF) → Cidade. Envia "cidade_id" no formulário.
export default function CampoCidade({ estados, cidadesIniciais, uf: ufInicial, cidadeId }: Props) {
  const [uf, setUf] = useState(ufInicial);
  const [cidades, setCidades] = useState(cidadesIniciais);
  const [cidade, setCidade] = useState(cidadeId ? String(cidadeId) : "");
  const [carregando, iniciar] = useTransition();

  function trocarUf(novaUf: string) {
    setUf(novaUf);
    setCidade("");
    iniciar(async () => setCidades(await buscarCidades(novaUf)));
  }

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="uf">Estado</Label>
        <NativeSelect id="uf" value={uf} onChange={(e) => trocarUf(e.target.value)}>
          {estados.map((e) => (
            <option key={e.uf} value={e.uf}>
              {e.uf} – {e.nome}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-2">
        <Label htmlFor="cidade_id">Cidade</Label>
        <NativeSelect
          id="cidade_id"
          name="cidade_id"
          value={cidade}
          onChange={(e) => setCidade(e.target.value)}
          disabled={carregando}
          required
        >
          <option value="">{carregando ? "Carregando..." : "Selecione"}</option>
          {cidades.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </NativeSelect>
      </div>
    </>
  );
}
