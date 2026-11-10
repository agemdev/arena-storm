"use client";

import { NativeSelect } from "@/components/ui/native-select";
import { duracao, type ComSaldo } from "@/lib/caixa";

type Props = {
  comSaldo: ComSaldo[];
  name: string;
  value: string;
  onChange: (id: string) => void;
  primeiro?: string | null; // cliente do atendimento aparece no topo
  vazio?: string; // texto da opção "não usar"
  id?: string;
  horas?: boolean; // saldo do pacote (mostra 3:40 h)
};

// Escolher de qual cliente saem os minutos (qualquer cliente com saldo: titular, amigo, promoção)
export default function UsarMinutos({ comSaldo, name, value, onChange, primeiro, vazio = "Não usar minutos", id, horas }: Props) {
  const lista = [...comSaldo].sort((a, b) => (a.id === primeiro ? -1 : b.id === primeiro ? 1 : 0));
  return (
    <NativeSelect id={id} name={name} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{vazio}</option>
      {lista.map((c) => (
        <option key={c.id} value={c.id}>
          {c.id === primeiro ? "★ " : ""}
          {c.nome} · {horas ? `${duracao(c.saldo)} h` : `${c.saldo} min`}
        </option>
      ))}
    </NativeSelect>
  );
}
