"use client";

import { useMemo, useState, useTransition } from "react";
import { adicionarConsumo } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { reais } from "@/lib/formatos";

export type ProdutoOpcao = { id: string; nome: string; preco: number; categoria: string };

// Escolher produto: busca + categorias + quantidade. Ou digitar um produto na hora.
export default function EscolherProduto({ atendimentoId, produtos }: { atendimentoId: string; produtos: ProdutoOpcao[] }) {
  const [busca, setBusca] = useState("");
  const [cat, setCat] = useState(""); // vazio = todas
  const [qtd, setQtd] = useState(1);
  const [manual, setManual] = useState(false);
  const [nomeLivre, setNomeLivre] = useState("");
  const [valorLivre, setValorLivre] = useState("");
  const [ultimo, setUltimo] = useState("");
  const [enviando, iniciar] = useTransition();

  const categorias = useMemo(() => [...new Set(produtos.map((p) => p.categoria))].sort((a, b) => a.localeCompare(b, "pt-BR")), [produtos]);
  const lista = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return produtos.filter((p) => (!cat || p.categoria === cat) && (!t || p.nome.toLowerCase().includes(t)));
  }, [produtos, busca, cat]);

  const lancar = (dados: Record<string, string>, nome: string) =>
    iniciar(async () => {
      const f = new FormData();
      f.set("atendimento_id", atendimentoId);
      f.set("quantidade", String(qtd));
      for (const [k, v] of Object.entries(dados)) f.set(k, v);
      await adicionarConsumo(f);
      setUltimo(`✓ ${qtd}× ${nome}`);
      setQtd(1);
      setBusca("");
    });

  const lancarManual = () => {
    if (nomeLivre.trim().length < 2 || !valorLivre.trim()) return setUltimo("Digite o nome e o valor do produto.");
    lancar({ descricao: nomeLivre, valor: valorLivre }, nomeLivre.trim());
    setNomeLivre("");
    setValorLivre("");
    setManual(false);
  };

  return (
    <div className="space-y-3">
      {/* Busca + quantidade */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          onKeyDown={(e) => {
            // Enter com 1 resultado → lança direto
            if (e.key === "Enter") {
              e.preventDefault();
              if (lista.length === 1) lancar({ produto_id: lista[0].id }, lista[0].nome);
            }
          }}
          placeholder="🔎 Buscar produto..."
          aria-label="Buscar produto"
          className="min-w-40 flex-1"
        />
        <div className="flex items-center rounded-lg border border-border" aria-label="Quantidade">
          <button type="button" className="px-3 py-1.5 text-lg" onClick={() => setQtd((q) => Math.max(1, q - 1))}>
            −
          </button>
          <span className="w-8 text-center font-semibold">{qtd}</span>
          <button type="button" className="px-3 py-1.5 text-lg" onClick={() => setQtd((q) => Math.min(50, q + 1))}>
            +
          </button>
        </div>
      </div>

      {/* Categorias */}
      {categorias.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {["", ...categorias].map((c) => (
            <button
              key={c || "todas"}
              type="button"
              onClick={() => setCat(c)}
              className={`rounded-full border px-3 py-1 text-xs ${cat === c ? "border-purple bg-primary/20 text-purple" : "border-border hover:bg-accent"}`}
            >
              {c || "Todas"}
            </button>
          ))}
        </div>
      )}

      {/* Produtos (rola se tiver muitos) */}
      <div className="grid max-h-56 grid-cols-2 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-3">
        {lista.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={enviando}
            onClick={() => lancar({ produto_id: p.id }, p.nome)}
            className="flex min-w-0 flex-col items-start rounded-lg border border-border px-2.5 py-1.5 text-left text-sm hover:border-purple hover:bg-accent disabled:opacity-50"
          >
            <span className="w-full truncate font-medium">{p.nome}</span>
            <span className="text-xs text-muted-foreground">{reais(Number(p.preco))}</span>
          </button>
        ))}
        {lista.length === 0 && <p className="col-span-full text-sm text-muted-foreground">Nenhum produto encontrado.</p>}
      </div>

      {/* Produto fora do cadastro */}
      {manual ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-cyan/40 bg-cyan/5 p-2">
          <Input value={nomeLivre} onChange={(e) => setNomeLivre(e.target.value)} placeholder="Produto" aria-label="Nome do produto" className="min-w-36 flex-1" autoFocus />
          <Input
            value={valorLivre}
            onChange={(e) => setValorLivre(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                lancarManual();
              }
            }}
            placeholder="Valor (R$)"
            inputMode="decimal"
            aria-label="Valor do produto"
            className="w-28"
          />
          <Button type="button" size="sm" disabled={enviando} onClick={lancarManual}>
            Lançar
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setManual(false)}>
            Cancelar
          </Button>
        </div>
      ) : (
        <button type="button" onClick={() => setManual(true)} className="text-xs text-cyan hover:underline">
          + Produto não cadastrado (digitar nome e valor)
        </button>
      )}
      {ultimo && <p className="text-xs text-green">{enviando ? "Lançando..." : ultimo}</p>}
    </div>
  );
}
