"use client";

import { useMemo, useState, useTransition } from "react";
import { cadastroRapido } from "@/app/painel/clientes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type ClienteOpcao = { id: string; nome: string; whatsapp: string };

type Props = {
  clientes: ClienteOpcao[];
  inicial?: { cliente: ClienteOpcao | null; nome: string }; // ao corrigir um atendimento
  onChange?: (c: ClienteOpcao | null) => void;
  autoFocus?: boolean;
  id?: string;
};

// Campo "Cliente": busca cadastrado por nome/WhatsApp, avulso ou cadastro rápido. Envia "nome" e "cliente_id".
export default function EscolherCliente({ clientes, inicial, onChange, autoFocus, id = "nome" }: Props) {
  const [busca, setBusca] = useState(inicial?.cliente ? "" : (inicial?.nome ?? ""));
  const [cliente, setClienteEstado] = useState<ClienteOpcao | null>(inicial?.cliente ?? null);
  const [aberto, setAberto] = useState(false);
  const setCliente = (c: ClienteOpcao | null) => {
    setClienteEstado(c);
    onChange?.(c);
  };

  // Até 8 clientes que batem com o nome ou número digitado
  const sugestoes = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (t.length < 2 || cliente) return [];
    const d = t.replace(/\D/g, "");
    return clientes.filter((c) => c.nome.toLowerCase().includes(t) || (d.length >= 3 && c.whatsapp.includes(d))).slice(0, 8);
  }, [busca, cliente, clientes]);

  return (
    <div className="relative space-y-2">
      <input type="hidden" name="cliente_id" value={cliente?.id ?? ""} />
      <Label htmlFor={id}>Cliente</Label>
      <Input
        id={id}
        name="nome"
        value={cliente ? cliente.nome : busca}
        onChange={(e) => {
          if (cliente) setCliente(null);
          setBusca(e.target.value);
          setAberto(true);
        }}
        onFocus={() => setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
        placeholder="Nome ou WhatsApp"
        autoComplete="off"
        autoFocus={autoFocus}
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
      {!cliente && busca.trim().length >= 2 && (
        <CadastroRapido
          nome={busca}
          semResultado={sugestoes.length === 0}
          onCadastrado={(c) => {
            setCliente(c);
            setAberto(false);
          }}
        />
      )}
      <p className="text-xs text-muted-foreground">
        {cliente ? (
          <span className="text-green">
            ✓ Cliente cadastrado (ganha minutos){" "}
            <button
              type="button"
              className="text-muted-foreground underline"
              onClick={() => {
                setBusca("");
                setCliente(null);
              }}
            >
              trocar
            </button>
          </span>
        ) : busca.trim() ? (
          "Avulso: não ganha minutos. Escolha da lista se for cadastrado."
        ) : (
          "Digite para buscar clientes cadastrados."
        )}
      </p>
    </div>
  );
}

// Cliente não encontrado → cadastra ali mesmo (só nome + WhatsApp) e já seleciona
function CadastroRapido({ nome, semResultado, onCadastrado }: { nome: string; semResultado: boolean; onCadastrado: (c: ClienteOpcao) => void }) {
  const [aberto, setAberto] = useState(false);
  const [nomeNovo, setNomeNovo] = useState(nome);
  const [whats, setWhats] = useState("");
  const [msg, setMsg] = useState("");
  const [enviando, iniciar] = useTransition();

  const cadastrar = () =>
    iniciar(async () => {
      const r = await cadastroRapido(nomeNovo, whats);
      setMsg(r.msg);
      if (r.ok) onCadastrado(r.cliente);
    });

  if (!aberto)
    return (
      <button
        type="button"
        onClick={() => {
          setNomeNovo(nome.trim());
          setAberto(true);
        }}
        className={`text-xs hover:underline ${semResultado ? "font-semibold text-cyan" : "text-muted-foreground"}`}
      >
        {semResultado ? `Não encontrado. + Cadastrar “${nome.trim()}” agora` : "+ Cadastrar novo cliente"}
      </button>
    );

  return (
    <div className="space-y-2 rounded-lg border border-cyan/40 bg-cyan/5 p-3">
      <p className="text-xs font-semibold text-cyan">Cadastro rápido</p>
      <div className="flex flex-wrap gap-2">
        <Input value={nomeNovo} onChange={(e) => setNomeNovo(e.target.value)} placeholder="Nome" aria-label="Nome do novo cliente" className="min-w-40 flex-1" />
        <Input
          value={whats}
          onChange={(e) => setWhats(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault(); // não envia o formulário antes de cadastrar
              cadastrar();
            }
          }}
          placeholder="WhatsApp (88) 9..."
          inputMode="tel"
          aria-label="WhatsApp do novo cliente"
          autoFocus
          className="w-44"
        />
        <Button type="button" size="sm" onClick={cadastrar} disabled={enviando}>
          {enviando ? "Salvando..." : "Cadastrar"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setAberto(false)}>
          Cancelar
        </Button>
      </div>
      {msg && <p className="text-xs text-destructive">{msg}</p>}
    </div>
  );
}
