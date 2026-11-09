"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { AlarmClock, TimerOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { estenderTempo, situacaoTempos } from "@/app/painel/caixa/actions";
import { AVISO_MINUTOS, hhmm, minutosRestantes } from "@/lib/caixa";
import { useAgora } from "./UsoAoVivo";

type EmUso = { id: string; nome: string; equipamento: string; fimPrevisto: string };
type Encerrado = { id: string; nome: string; equipamento: string };

const CONSULTA_MS = 30_000; // pergunta ao servidor a cada 30 s

// Bipes: "acabando" = 2 bipes agudos; "acabou" = 3 bipes mais graves e longos
function bipe(tipo: "acabando" | "acabou" = "acabando") {
  try {
    const ctx = new AudioContext();
    const [vezes, freq, dur] = tipo === "acabou" ? [3, 620, 0.35] : [2, 880, 0.2];
    for (let i = 0; i < vezes; i++) {
      const osc = ctx.createOscillator();
      osc.frequency.value = freq;
      osc.connect(ctx.destination);
      const t = ctx.currentTime + i * (dur + 0.15);
      osc.start(t);
      osc.stop(t + dur);
    }
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
        bipe("acabou");
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
  const temAlerta = acabando.length + encerrados.length > 0;
  const vermelho = encerrados.length > 0;

  // Título da aba pisca (dá para ver mesmo com outra aba aberta)
  useEffect(() => {
    if (!temAlerta) return;
    const original = document.title;
    const aviso = vermelho ? "⛔ TEMPO ACABOU" : "⏰ Tempo acabando";
    let liga = false;
    const t = setInterval(() => {
      liga = !liga;
      document.title = liga ? aviso : original;
    }, 1000);
    return () => {
      clearInterval(t);
      document.title = original;
    };
  }, [temAlerta, vermelho]);

  if (!temAlerta) return null;

  return (
    <>
      {/* Moldura piscando na tela inteira: amarelo = acabando, vermelho = acabou */}
      <div
        aria-hidden
        className={`pointer-events-none fixed inset-0 z-[45] animate-pulse border-[10px] ${vermelho ? "border-destructive" : "border-amber"}`}
      />

      <div className="fixed right-4 bottom-4 z-50 flex max-h-[calc(100vh-2rem)] w-[26rem] max-w-[calc(100vw-2rem)] flex-col gap-3 overflow-y-auto" role="alert" aria-live="assertive">
        {encerrados.map((e, i) => (
          <div key={`${e.id}-${i}`} className="rounded-2xl bg-destructive p-4 text-white shadow-2xl ring-4 ring-destructive/40">
            <div className="flex items-center gap-3">
              <TimerOff className="size-10 shrink-0 animate-pulse" />
              <div>
                <p className="text-xs font-bold tracking-widest uppercase opacity-90">Tempo acabou</p>
                <p className="font-display text-2xl leading-tight font-black">{e.equipamento}</p>
              </div>
            </div>
            <p className="mt-2 text-base">
              <b>{e.nome}</b>: atendimento encerrado. Faça o fechamento do pagamento.
            </p>
            <div className="mt-3 flex gap-2">
              <Link
                href={`/painel/caixa?abrir=${e.id}`}
                scroll={false}
                onClick={() => setEncerrados((l) => l.filter((x) => x !== e))}
                className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-destructive"
              >
                Abrir e receber
              </Link>
              <button onClick={() => setEncerrados((l) => l.filter((x) => x !== e))} className="ml-auto px-2 text-sm text-white/80 hover:text-white">
                Fechar aviso
              </button>
            </div>
          </div>
        ))}

        {acabando.map((a) => {
          const r = minutosRestantes(a.fimPrevisto, agora!)!;
          const k = chave(a);
          return (
            <div key={k} className="rounded-2xl bg-amber p-4 text-black shadow-2xl ring-4 ring-amber/40">
              <div className="flex items-center gap-3">
                <AlarmClock className="size-10 shrink-0 animate-bounce" />
                <div>
                  <p className="text-xs font-bold tracking-widest uppercase opacity-80">
                    {r > 0 ? `Faltam ${r} min` : "Acabando agora"}
                  </p>
                  <p className="font-display text-2xl leading-tight font-black">{a.equipamento}</p>
                </div>
              </div>
              <p className="mt-2 text-base">
                <b>{a.nome}</b> (até {hhmm(a.fimPrevisto)}). O cliente vai continuar?
              </p>
              {respostaNao.has(k) ? (
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <span>Ok, encerra sozinho às {hhmm(a.fimPrevisto)}.</span>
                  <button onClick={() => ocultar(k)} className="ml-auto font-semibold underline">
                    Fechar aviso
                  </button>
                </div>
              ) : escolhendo === a.id ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    ["30", "+30 min"],
                    ["60", "+1h"],
                    ["livre", "Tempo livre"],
                  ].map(([m, rotulo]) => (
                    <button key={m} onClick={() => estender(a.id, m)} className="rounded-lg bg-black px-4 py-2 text-sm font-bold text-amber">
                      {rotulo}
                    </button>
                  ))}
                  <button onClick={() => setEscolhendo(null)} className="px-2 text-sm">
                    Voltar
                  </button>
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => setEscolhendo(a.id)} className="rounded-lg bg-black px-4 py-2 text-sm font-bold text-amber">
                    Sim, continuar
                  </button>
                  <button onClick={() => setRespostaNao((s) => new Set(s).add(k))} className="rounded-lg border-2 border-black px-4 py-2 text-sm font-bold">
                    Não
                  </button>
                  <button onClick={() => ocultar(k)} className="ml-auto px-2 text-sm hover:underline">
                    Fechar aviso
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
