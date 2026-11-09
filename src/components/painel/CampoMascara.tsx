"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { mascaraCep, mascaraCnpj, mascaraTelefone } from "@/lib/mascaras";

const MASCARAS = { telefone: mascaraTelefone, cep: mascaraCep, cnpj: mascaraCnpj };
const EXEMPLOS = { telefone: "(88) 99999-9999", cep: "62320-000", cnpj: "00.000.000/0000-00" };

type Props = Omit<React.ComponentProps<"input">, "value" | "defaultValue" | "onChange"> & {
  tipo: keyof typeof MASCARAS;
  valorInicial?: string | null;
  onValor?: (digitos: string) => void;
};

// Campo que aceita só números e formata enquanto digita
export default function CampoMascara({ tipo, valorInicial, onValor, ...props }: Props) {
  const mascara = MASCARAS[tipo];
  const [valor, setValor] = useState(mascara(valorInicial ?? ""));

  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder={EXEMPLOS[tipo]}
      value={valor}
      onChange={(e) => {
        const novo = mascara(e.target.value);
        setValor(novo);
        onValor?.(novo.replace(/\D/g, ""));
      }}
    />
  );
}
