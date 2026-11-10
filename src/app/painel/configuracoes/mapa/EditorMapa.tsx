"use client";

import { useActionState, useState } from "react";
import { salvarMapa } from "./actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Input } from "@/components/ui/input";
import IconeMaquina, { ICONES_MAQUINA } from "@/components/painel/IconeMaquina";

type Maq = { id: string; nome: string; tipo: string; x: number | null; y: number | null; tv: string | null; icone: string | null };

const COLUNAS = 12;
const LINHAS = 6;

// Editor: escolha uma máquina e clique no quadrado onde ela fica
export default function EditorMapa({ inicial }: { inicial: Maq[] }) {
  const [res, acao, enviando] = useActionState(salvarMapa, null);
  const [maqs, setMaqs] = useState(inicial);
  const [sel, setSel] = useState<string | null>(null);
  const atual = maqs.find((m) => m.id === sel) ?? null;

  const em = (x: number, y: number) => maqs.find((m) => m.x === x && m.y === y);
  const mudar = (id: string, dados: Partial<Maq>) => setMaqs((l) => l.map((m) => (m.id === id ? { ...m, ...dados } : m)));

  const cliqueCelula = (x: number, y: number) => {
    const ali = em(x, y);
    if (!atual) {
      if (ali) setSel(ali.id); // sem nada escolhido: clicar numa máquina escolhe ela
      return;
    }
    // Troca de lugar se já tiver outra ali
    setMaqs((l) =>
      l.map((m) => (m.id === atual.id ? { ...m, x, y } : ali && m.id === ali.id ? { ...m, x: atual.x, y: atual.y } : m)),
    );
    setSel(null);
  };

  return (
    <form action={acao} className="space-y-5">
      <input type="hidden" name="mapa" value={JSON.stringify(maqs)} />

      {/* Lista de máquinas */}
      <div className="flex flex-wrap gap-2">
        {maqs.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setSel(sel === m.id ? null : m.id)}
            className={`rounded-lg border px-3 py-1.5 text-sm ${
              sel === m.id ? "border-cyan bg-cyan/20 text-cyan" : m.x ? "border-border" : "border-dashed border-amber text-amber"
            }`}
          >
            {m.nome}
            {!m.x && " (fora)"}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        {atual ? (
          <>
            Agora clique no quadrado onde fica o <b className="text-cyan">{atual.nome}</b>.
          </>
        ) : (
          "1) Clique numa máquina (acima ou no mapa). 2) Clique no quadrado de destino. Se já tiver outra lá, elas trocam de lugar."
        )}
      </p>

      {/* Grade */}
      <div className="overflow-x-auto">
        <div className="grid min-w-[720px] gap-1.5" style={{ gridTemplateColumns: `repeat(${COLUNAS}, minmax(0, 1fr))` }}>
          {Array.from({ length: LINHAS }, (_, i) => i + 1).map((y) =>
            Array.from({ length: COLUNAS }, (_, j) => j + 1).map((x) => {
              const m = em(x, y);
              return (
                <button
                  key={`${x}-${y}`}
                  type="button"
                  onClick={() => cliqueCelula(x, y)}
                  className={`flex h-16 items-center justify-center rounded-lg border text-[11px] font-semibold ${
                    m ? (m.id === sel ? "border-cyan bg-cyan/25 text-cyan" : "border-green/60 bg-green/10") : "border-dashed border-border/60 text-transparent hover:border-cyan hover:text-muted-foreground"
                  }`}
                >
                  {m ? (
                    <span className="flex flex-col items-center gap-0.5 px-1 text-center leading-tight">
                      <IconeMaquina icone={m.icone} tipo={m.tipo} className="size-4 text-base" />
                      <span className="line-clamp-2">{m.nome}</span>
                    </span>
                  ) : (
                    "+"
                  )}
                </button>
              );
            }),
          )}
        </div>
      </div>

      {/* Opções da máquina escolhida */}
      {atual && (
        <div className="flex flex-wrap items-end gap-4 rounded-xl border border-border p-4">
          {/* Ícone: um da lista ou qualquer emoji */}
          <div className="w-full space-y-2">
            <Label>Ícone do {atual.nome}</Label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => mudar(atual.id, { icone: null })}
                className={`rounded-lg border px-2 py-1.5 text-xs ${!atual.icone ? "border-cyan bg-cyan/20 text-cyan" : "border-border hover:bg-accent"}`}
              >
                Padrão
              </button>
              {Object.keys(ICONES_MAQUINA).map((nome) => (
                <button
                  key={nome}
                  type="button"
                  title={nome}
                  onClick={() => mudar(atual.id, { icone: nome })}
                  className={`rounded-lg border p-1.5 ${atual.icone === nome ? "border-cyan bg-cyan/20 text-cyan" : "border-border hover:bg-accent"}`}
                >
                  <IconeMaquina icone={nome} className="size-5" />
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">ou um emoji:</span>
              <Input
                className="w-24"
                maxLength={8}
                placeholder="🏎️"
                value={atual.icone && !ICONES_MAQUINA[atual.icone] ? atual.icone : ""}
                onChange={(e) => mudar(atual.id, { icone: e.target.value.trim() || null })}
              />
              <span className="text-xs text-muted-foreground">(no Windows: tecla Windows + ponto)</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tv">{atual.nome} divide a TV com</Label>
            <NativeSelect id="tv" value={atual.tv ?? ""} onChange={(e) => mudar(atual.id, { tv: e.target.value || null })}>
              <option value="">Ninguém</option>
              {maqs
                .filter((m) => m.id !== atual.id)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                ))}
            </NativeSelect>
          </div>
          {atual.x && (
            <Button type="button" variant="ghost" onClick={() => {
                mudar(atual.id, { x: null, y: null });
                setSel(null);
              }}>
              Tirar do mapa
            </Button>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={enviando}>
          {enviando ? "Salvando..." : "Salvar mapa"}
        </Button>
        {res && <p className={`text-sm ${res.ok ? "text-green" : "text-destructive"}`}>{res.msg}</p>}
      </div>
    </form>
  );
}
