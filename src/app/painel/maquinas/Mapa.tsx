"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Car, Gamepad2, Glasses, Monitor, Tv } from "lucide-react";
import Janela from "@/components/painel/Janela";
import { useAgora } from "@/components/painel/UsoAoVivo";
import { AVISO_MINUTOS, calcularUso, duracao, hhmm, minutosRestantes } from "@/lib/caixa";
import { reais } from "@/lib/formatos";
import type { MaquinaEstado } from "@/lib/caixa-servidor";
import NovoAtendimento, { type ClienteOpcao } from "../caixa/NovoAtendimento";

type Props = {
  maquinas: MaquinaEstado[];
  semMaquina: NonNullable<MaquinaEstado["atendimento"]>[];
  data: string;
  valorHora: string;
  clientes: ClienteOpcao[];
};

const ICONES: Record<string, typeof Monitor> = { pc: Monitor, console: Gamepad2, simulador: Car, vr: Glasses, outro: Tv };

// Mapa da arena: cada máquina no seu lugar, com a cor da situação
export default function Mapa({ maquinas, semMaquina, data, valorHora, clientes }: Props) {
  const router = useRouter();
  const [abrindo, iniciar] = useTransition();
  const [nova, setNova] = useState<{ equip: string; agora: string } | null>(null);
  const fechar = useCallback(() => setNova(null), []);

  const noMapa = maquinas.filter((m) => m.mapa_x && m.mapa_y);
  const fora = maquinas.filter((m) => !m.mapa_x || !m.mapa_y);
  const colunas = Math.max(1, ...noMapa.map((m) => m.mapa_x!));
  const linhas = Math.max(1, ...noMapa.map((m) => m.mapa_y!));
  // Colunas/linhas vazias viram só um corredor estreito → sobra espaço para os cartões
  const usadasX = new Set(noMapa.map((m) => m.mapa_x));
  const usadasY = new Set(noMapa.map((m) => m.mapa_y));
  const gradeX = Array.from({ length: colunas }, (_, i) => (usadasX.has(i + 1) ? "minmax(7.5rem, 1fr)" : "1.5rem")).join(" ");
  const gradeY = Array.from({ length: linhas }, (_, i) => (usadasY.has(i + 1) ? "minmax(7.5rem, auto)" : "1.5rem")).join(" ");

  const clicar = (m: MaquinaEstado) => {
    if (m.atendimento) iniciar(() => router.push(`/painel/maquinas?abrir=${m.atendimento!.id}`, { scroll: false }));
    else setNova({ equip: m.id, agora: hhmm(new Date().toISOString()) });
  };

  const livres = maquinas.filter((m) => !m.emUso).length;

  return (
    <div className={`space-y-6 ${abrindo ? "cursor-wait" : ""}`}>
      {/* Legenda + contagem */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="font-semibold">
          <span className="text-green">{livres} livres</span> · <span className="text-cyan">{maquinas.length - livres} em uso</span>
        </span>
        <Legenda cor="border-green bg-green/10" texto="Livre" />
        <Legenda cor="border-cyan bg-cyan/15" texto="Em uso" />
        <Legenda cor="border-amber bg-amber/20" texto={`Acabando (≤ ${AVISO_MINUTOS} min)`} />
        <Legenda cor="border-destructive bg-destructive/20" texto="Tempo acabou" />
        <Legenda cor="border-purple bg-purple/15" texto="Reservada em breve" />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card p-4">
        <div className="grid w-max min-w-full gap-2" style={{ gridTemplateColumns: gradeX, gridTemplateRows: gradeY }}>
          {noMapa.map((m) => (
            <div key={m.id} style={{ gridColumnStart: m.mapa_x!, gridRowStart: m.mapa_y! }}>
              <Cartao m={m} onClick={() => clicar(m)} />
            </div>
          ))}
        </div>
      </div>

      {fora.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Fora do mapa (posicione em Configurações → Mapa das máquinas)</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {fora.map((m) => (
              <Cartao key={m.id} m={m} onClick={() => clicar(m)} />
            ))}
          </div>
        </div>
      )}

      {semMaquina.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Em tempo livre (sem máquina fixa)</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {semMaquina.map((a) => (
              <Cartao
                key={a.id}
                m={{ id: a.id, nome: "Livre", tipo: "outro", mapa_x: null, mapa_y: null, emUso: true, atendimento: a }}
                onClick={() => iniciar(() => router.push(`/painel/maquinas?abrir=${a.id}`, { scroll: false }))}
              />
            ))}
          </div>
        </div>
      )}

      {nova && (
        <Janela onFechar={fechar} largura="max-w-2xl" titulo={<h2 className="font-display text-xl font-bold">Novo atendimento</h2>}>
          <NovoAtendimento
            data={data}
            agora={nova.agora}
            valorHora={valorHora}
            clientes={clientes}
            equipamentos={maquinas.map((m) => ({ id: m.id, nome: m.nome, emUso: m.emUso, reserva: m.reserva, tv: m.tv }))}
            equipInicial={nova.equip}
            onIniciado={fechar}
          />
        </Janela>
      )}
    </div>
  );
}

function Legenda({ cor, texto }: { cor: string; texto: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={`size-3 rounded border-2 ${cor}`} /> {texto}
    </span>
  );
}

// Um cartão de máquina (o tempo atualiza sozinho)
function Cartao({ m, onClick }: { m: MaquinaEstado; onClick: () => void }) {
  const agora = useAgora();
  const Icone = ICONES[m.tipo] ?? Monitor;
  const a = m.atendimento;

  let cor = "border-green/70 bg-green/10 hover:bg-green/20";
  let linha2: React.ReactNode = <span className="text-green">Livre</span>;
  let linha3: React.ReactNode = null;

  if (a) {
    const resta = agora === null ? null : minutosRestantes(a.fim_previsto, agora);
    cor =
      resta !== null && resta <= 0
        ? "border-destructive bg-destructive/25 animate-pulse"
        : resta !== null && resta <= AVISO_MINUTOS
          ? "border-amber bg-amber/25"
          : "border-cyan bg-cyan/15 hover:bg-cyan/25";
    const uso = agora === null ? null : calcularUso(a.inicio, new Date(agora).toISOString(), a.valor_hora);
    linha2 = <span className="truncate text-sm font-semibold">{a.nome}</span>;
    linha3 = (
      <span className="text-xs">
        {uso ? `${duracao(uso.minutos)} · ${reais(uso.valor)}` : "…"}
        <br />
        <b className={resta !== null && resta <= AVISO_MINUTOS ? (resta <= 0 ? "text-destructive" : "text-amber") : "text-muted-foreground"}>
          {!a.fim_previsto ? "tempo livre" : resta === null ? "" : resta > 0 ? `faltam ${duracao(resta)}` : "acabou"}
        </b>
      </span>
    );
  } else if (m.reserva) {
    cor = "border-purple bg-purple/15 hover:bg-purple/25";
  }

  return (
    <button type="button" onClick={onClick} className={`flex h-full min-h-[7.5rem] w-full min-w-0 flex-col items-start gap-1 overflow-hidden rounded-xl border-2 p-2.5 text-left transition ${cor}`}>
      <span className="flex w-full items-start gap-1.5">
        <Icone className="mt-0.5 size-4 shrink-0 opacity-80" />
        <span className="line-clamp-2 text-sm leading-tight font-bold break-words">{m.nome}</span>
      </span>
      <span className="flex w-full min-w-0 flex-col gap-0.5 text-sm">
        {linha2}
        {linha3}
      </span>
      <span className="mt-auto flex flex-wrap gap-1">
        {m.reserva && <span className="rounded bg-purple/30 px-1.5 text-[11px] font-semibold text-purple">📅 {m.reserva}</span>}
        {m.tv && <span className="rounded bg-amber/30 px-1.5 text-[11px] font-semibold text-amber">📺 TV: {m.tv}</span>}
      </span>
    </button>
  );
}
