"use client";

import { useActionState, useMemo, useState } from "react";
import { abrirAtendimento, type Resultado } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

export type ClienteOpcao = { id: string; nome: string; whatsapp: string };
export type EquipOpcao = { id: string; nome: string; emUso: boolean };

type Props = {
  data: string;
  agora: string; // "14:15"
  valorHora: string; // "12"
  clientes: ClienteOpcao[];
  equipamentos: EquipOpcao[];
};

// Formulário rápido: quem, qual máquina, que horas
export default function NovoAtendimento(props: Props) {
  const [res, acao, enviando] = useActionState(abrirAtendimento, null);
  // key muda após iniciar → limpa os campos
  return <Campos key={res?.n ?? "f"} {...props} res={res} acao={acao} enviando={enviando} />;
}

type CamposProps = Props & {
  res: Resultado;
  acao: (f: FormData) => void;
  enviando: boolean;
};

function Campos({ data, agora, valorHora, clientes, equipamentos, res, acao, enviando }: CamposProps) {
  const [busca, setBusca] = useState("");
  const [cliente, setCliente] = useState<ClienteOpcao | null>(null);
  const [aberto, setAberto] = useState(false);
  const [equip, setEquip] = useState("");

  // Até 8 clientes que batem com o nome ou número digitado
  const sugestoes = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (t.length < 2 || cliente) return [];
    const d = t.replace(/\D/g, "");
    return clientes
      .filter((c) => c.nome.toLowerCase().includes(t) || (d.length >= 3 && c.whatsapp.includes(d)))
      .slice(0, 8);
  }, [busca, cliente, clientes]);

  return (
    <form
      action={acao}
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_8rem_8rem_auto] lg:items-end"
    >
      <input type="hidden" name="data" value={data} />
      <input type="hidden" name="cliente_id" value={cliente?.id ?? ""} />

      <div className="relative space-y-2">
        <Label htmlFor="nome">Cliente</Label>
        <Input
          id="nome"
          name="nome"
          value={cliente ? cliente.nome : busca}
          onChange={(e) => {
            setCliente(null);
            setBusca(e.target.value);
            setAberto(true);
          }}
          onFocus={() => setAberto(true)}
          onBlur={() => setTimeout(() => setAberto(false), 150)}
          placeholder="Nome ou WhatsApp"
          autoComplete="off"
          required
        />
        {aberto && sugestoes.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
            {sugestoes.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className="flex w-full justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setCliente(c);
                    setAberto(false);
                  }}
                >
                  <span>{c.nome}</span>
                  <span className="text-muted-foreground">{c.whatsapp.slice(-4)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">
          {cliente ? (
            <span className="text-green">✓ Cliente cadastrado (ganha minutos)</span>
          ) : busca.trim() ? (
            "Avulso: não ganha minutos. Escolha da lista se for cadastrado."
          ) : (
            "Digite para buscar clientes cadastrados."
          )}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="equipamento_id">Máquina</Label>
        <NativeSelect id="equipamento_id" name="equipamento_id" value={equip} onChange={(e) => setEquip(e.target.value)}>
          <option value="">Só consumo (sem máquina)</option>
          {equipamentos.map((e) => (
            <option key={e.id} value={e.id} disabled={e.emUso}>
              {e.nome}
              {e.emUso ? " (em uso)" : ""}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="space-y-2">
        <Label htmlFor="inicio">Início</Label>
        <Input id="inicio" name="inicio" type="time" defaultValue={agora} disabled={!equip} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="valor_hora">R$ / hora</Label>
        <Input id="valor_hora" name="valor_hora" inputMode="decimal" defaultValue={valorHora} disabled={!equip} />
      </div>

      <Button type="submit" disabled={enviando} className="h-8">
        {enviando ? "Abrindo..." : equip ? "Iniciar" : "Lançar consumo"}
      </Button>

      {res && <p className={`text-sm sm:col-span-2 lg:col-span-5 ${res.ok ? "text-green" : "text-destructive"}`}>{res.msg}</p>}
    </form>
  );
}
