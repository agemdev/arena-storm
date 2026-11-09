"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { estenderTempo, situacaoTempos } from "@/app/painel/caixa/actions";
import { AVISO_MINUTOS, hhmm, minutosRestantes } from "@/lib/caixa";
import { useAgora } from "./UsoAoVivo";

type EmUso = { id: string; nome: string; equipamento: string; fimPrevisto: string };
type Encerrado = { id: string; nome: string; equipamento: string };

const CONSULTA_MS = 30_000; // pergunta ao servidor a cada 30 s

// Bipe curto quando aparece um aviso novo
function bipe() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    osc.frequency.value = 880;
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    /* navegador sem som */
  }
}

// Avisos no canto da tela: tempo acabando (continuar? sim/não/fechar) e tempo encerrado
export default function AlertasTempo() {
  const router = useRouter();
  const agora = useAgora();
  const [emUso, setEmUso] = useState<EmUso[]>([]);
  const [encerrados, setEncerrados] = useState<Encerrado[]>([]);
  const [ocultos, setOcultos] = useState<Set<string>>(new Set()); // "Não" ou "Fechar"
  const [respostaNao, setRespostaNao] = useState<Set<string>>(new Set());
  const [escolhendo, setEscolhendo] = useState<string | null>(null);
  const [, iniciar] = useTransition();
  const avisados = useRef(new Set<string>());
  const ultimaExtra = useRef(0);

  const consultar = useCallback(async () => {
    try {
      const r = await situacaoTempos();
      setEmUso(r.emUso);
      if (r.encerrados.length) {
        setEncerrados((lista) => [...lista, ...r.encerrados]);
        bipe();
        router.refresh();
      }
    } catch {
      /* sem conexão: tenta de novo na próxima */
    }
  }, [router]);

  useEffect(() => {
    const primeira = setTimeout(consultar, 0);
    const t = setInterval(consultar, CONSULTA_MS);
    return () => {
      clearTimeout(primeira);
      clearInterval(t);
    };
  }, [consultar]);

  // Chave muda se o tempo for estendido → avisa de novo no novo horário
  const chave = (a: EmUso) => `${a.id}|${a.fimPrevisto}`;
  const acabando =
    agora === null
      ? []
      : emUso.filter((a) => {
          const r = minutosRestantes(a.fimPrevisto, agora)!;
          return r <= AVISO_MINUTOS && !ocultos.has(chave(a));
        });

  // Bipe e consulta extra quando algo novo aparece ou o tempo zera
  useEffect(() => {
    let novo = false;
    for (const a of acabando) {
      if (!avisados.current.has(chave(a))) {
        avisados.current.add(chave(a));
        novo = true;
      }
    }
    if (novo) bipe();
    // Tempo zerou → pede ao servidor para encerrar (no máximo a cada 10 s)
    if (agora !== null && emUso.some((a) => minutosRestantes(a.fimPrevisto, agora)! <= 0) && Date.now() - ultimaExtra.current > 10_000) {
      ultimaExtra.current = Date.now();
      consultar();
    }
  });

  const estender = (id: string, minutos: string) => {
    const f = new FormData();
    f.set("id", id);
    f.set("minutos", minutos);
    setEscolhendo(null);
    iniciar(async () => {
      await estenderTempo(f);
      await consultar();
      router.refresh();
    });
  };
  const ocultar = (k: string) => setOcultos((s) => new Set(s).add(k));

  if (!acabando.length && !encerrados.length) return null;

  return (
    <div className="fixed right-4 bottom-4 z-50 flex w-[22rem] max-w-[calc(100vw-2rem)] flex-col gap-2" role="status" aria-live="polite">
      {acabando.map((a) => {
        const r = minutosRestantes(a.fimPrevisto, agora!)!;
        const k = chave(a);
        return (
          <div key={k} className="rounded-xl border border-amber/40 bg-card p-4 shadow-xl">
            <p className="text-sm font-semibold text-amber">
              ⏰ {a.equipamento}: {r > 0 ? `faltam ${r} min` : "tempo acabando"}
            </p>
            <p className="mt-1 text-sm">
              <b>{a.nome}</b> (até {hhmm(a.fimPrevisto)}). O cliente vai continuar?
            </p>
            {respostaNao.has(k) ? (
              <p className="mt-2 text-xs text-muted-foreground">Ok, encerra sozinho às {hhmm(a.fimPrevisto)}.</p>
            ) : escolhendo === a.id ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  ["30", "+30 min"],
                  ["60", "+1h"],
                  ["livre", "Tempo livre"],
                ].map(([m, rotulo]) => (
                  <button key={m} onClick={() => estender(a.id, m)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                    {rotulo}
                  </button>
                ))}
                <button onClick={() => setEscolhendo(null)} className="px-2 text-xs text-muted-foreground">
                  Voltar
                </button>
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => setEscolhendo(a.id)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                  Sim, continuar
                </button>
                <button
                  onClick={() => setRespostaNao((s) => new Set(s).add(k))}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs"
                >
                  Não
                </button>
                <button onClick={() => ocultar(k)} className="ml-auto px-2 text-xs text-muted-foreground hover:text-foreground">
                  Fechar aviso
                </button>
              </div>
            )}
            {respostaNao.has(k) && (
              <button onClick={() => ocultar(k)} className="mt-1 text-xs text-muted-foreground hover:text-foreground">
                Fechar aviso
              </button>
            )}
          </div>
        );
      })}

      {encerrados.map((e, i) => (
        <div key={`${e.id}-${i}`} className="rounded-xl border border-destructive/40 bg-card p-4 shadow-xl">
          <p className="text-sm font-semibold text-destructive">⏹ Tempo acabou · {e.equipamento}</p>
          <p className="mt-1 text-sm">
            <b>{e.nome}</b>: atendimento encerrado. Faça o fechamento do pagamento.
          </p>
          <div className="mt-3 flex gap-2">
            <Link
              href={`/painel/caixa/${e.id}`}
              onClick={() => setEncerrados((l) => l.filter((x) => x !== e))}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              Abrir e receber
            </Link>
            <button onClick={() => setEncerrados((l) => l.filter((x) => x !== e))} className="ml-auto px-2 text-xs text-muted-foreground">
              Fechar aviso
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
