"use client";

import { useSyncExternalStore } from "react";
import { AVISO_MINUTOS, calcularUso, duracao, minutosRestantes } from "@/lib/caixa";
import { reais } from "@/lib/formatos";

// Relógio compartilhado: atualiza a cada 10 segundos
let agora = Date.now();
const ouvintes = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
function assinar(fn: () => void) {
  ouvintes.add(fn);
  // Acerta o relógio ao abrir a tela
  agora = Date.now();
  queueMicrotask(fn);
  if (!timer)
    timer = setInterval(() => {
      agora = Date.now();
      ouvintes.forEach((f) => f());
    }, 10_000);
  return () => {
    ouvintes.delete(fn);
    if (!ouvintes.size && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}
export function useAgora() {
  return useSyncExternalStore(
    assinar,
    () => agora,
    () => null, // no servidor não há relógio → mostra só depois de carregar
  );
}

type Props = { inicio: string; fimPrevisto: string | null; valorHora: number; detalhado?: boolean };

// Tempo passado, valor até agora e quanto falta (atualiza sozinho)
export default function UsoAoVivo({ inicio, fimPrevisto, valorHora, detalhado }: Props) {
  const t = useAgora();
  if (t === null) return <span className="text-muted-foreground">…</span>;

  const uso = calcularUso(inicio, new Date(t).toISOString(), valorHora);
  const resta = minutosRestantes(fimPrevisto, t);
  const cor = resta === null ? "text-muted-foreground" : resta <= 0 ? "text-destructive" : resta <= AVISO_MINUTOS ? "text-amber" : "text-muted-foreground";
  const textoResta =
    resta === null ? "tempo livre" : resta > 0 ? `faltam ${duracao(resta)}` : `passou ${duracao(-resta)}`;

  if (!detalhado) {
    return (
      <span className="whitespace-nowrap">
        <b>{duracao(uso.minutos)}</b> <span className="text-muted-foreground">· {reais(uso.valor)}</span>{" "}
        <span className={`text-xs ${cor}`}>· {textoResta}</span>
      </span>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3 text-center">
      <div className="rounded-xl bg-input/20 p-3">
        <p className="text-xs text-muted-foreground">Já passou</p>
        <p className="font-display text-2xl font-bold text-cyan">{duracao(uso.minutos)}</p>
      </div>
      <div className="rounded-xl bg-input/20 p-3">
        <p className="text-xs text-muted-foreground">Valor até agora</p>
        <p className="font-display text-2xl font-bold">{reais(uso.valor)}</p>
      </div>
      <div className="rounded-xl bg-input/20 p-3">
        <p className="text-xs text-muted-foreground">{resta === null ? "Fim" : resta > 0 ? "Falta" : "Passou"}</p>
        <p className={`font-display text-2xl font-bold ${resta === null ? "" : cor}`}>
          {resta === null ? "Livre" : duracao(Math.abs(resta))}
        </p>
      </div>
    </div>
  );
}
