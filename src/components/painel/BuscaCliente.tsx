"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type ClienteOpcao = { id: string; nome: string; whatsapp: string };

type Props = {
  clientes: ClienteOpcao[];
  rotulo?: string;
  nomeInicial?: string;
  clienteInicial?: ClienteOpcao | null;
  placeholder?: string;
  onEscolher?: (c: ClienteOpcao | null) => void;
};

// Campo "Cliente" com busca nos cadastrados (nome ou WhatsApp). Envia "nome" e "cliente_id".
export default function BuscaCliente({ clientes, rotulo = "Cliente", nomeInicial = "", clienteInicial = null, placeholder = "Nome ou WhatsApp", onEscolher }: Props) {
  const [busca, setBusca] = useState(nomeInicial);
  const [cliente, setCliente] = useState<ClienteOpcao | null>(clienteInicial);
  const [aberto, setAberto] = useState(false);

  const sugestoes = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (t.length < 2 || cliente) return [];
    const d = t.replace(/\D/g, "");
    return clientes.filter((c) => c.nome.toLowerCase().includes(t) || (d.length >= 3 && c.whatsapp.includes(d))).slice(0, 8);
  }, [busca, cliente, clientes]);

  const escolher = (c: ClienteOpcao | null) => {
    setCliente(c);
    onEscolher?.(c);
  };

  return (
    <div className="relative space-y-2">
      <Label htmlFor="busca-cliente">{rotulo}</Label>
      <input type="hidden" name="cliente_id" value={cliente?.id ?? ""} />
      <Input
        id="busca-cliente"
        name="nome"
        value={cliente ? cliente.nome : busca}
        onChange={(e) => {
          if (cliente) escolher(null);
          setBusca(e.target.value);
          setAberto(true);
        }}
        onFocus={() => setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
        placeholder={placeholder}
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
                  escolher(c);
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
        {cliente ? <span className="text-green">✓ Cliente cadastrado</span> : busca.trim() ? "Não cadastrado (ok). Escolha da lista se for cadastrado." : "Digite para buscar."}
      </p>
    </div>
  );
}
