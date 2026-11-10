"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import IconeMaquina from "@/components/painel/IconeMaquina";
import Janela from "@/components/painel/Janela";
import { useAgora } from "@/components/painel/UsoAoVivo";
import { AVISO_MINUTOS, calcularUso, duracao, hhmm, minutosRestantes, SITUACOES_MAQUINA, type ComSaldo } from "@/lib/caixa";
import { reais } from "@/lib/formatos";
import type { MaquinaEstado } from "@/lib/caixa-servidor";
import NovoAtendimento, { type ClienteOpcao } from "../caixa/NovoAtendimento";
import { mudarSituacaoMaquina } from "./actions";

type Props = {
  maquinas: MaquinaEstado[];
  semMaquina: NonNullable<MaquinaEstado["atendimento"]>[];
  data: string;
  valorHora: string;
  clientes: ClienteOpcao[];
  comSaldo: ComSaldo[];
};

// Mapa da arena: cada máquina no seu lugar, com a cor da situação
export default function Mapa({ maquinas, semMaquina, data, valorHora, clientes, comSaldo }: Props) {
  const router = useRouter();
  const [abrindo, iniciar] = useTransition();
  const [nova, setNova] = useState<{ equip: MaquinaEstado; agora: string } | null>(null);
  const fechar = useCallback(() => setNova(null), []);

  const noMapa = maquinas.filter((m) => m.mapa_x && m.mapa_y);
  const fora = maquinas.filter((m) => !m.mapa_x || !m.mapa_y);
  const colunas = Math.max(1, ...noMapa.map((m) => m.mapa_x!));
  const linhas = Math.max(1, ...noMapa.map((m) => m.mapa_y!));
  // Colunas/linhas vazias viram só um corredor estreito → sobra espaço para os cartões
  const usadasX = new Set(noMapa.map((m) => m.mapa_x));
  const usadasY = new Set(noMapa.map((m) => m.mapa_y));
  const gradeX = Array.from({ length: colunas }, (_, i) => (usadasX.has(i + 1) ? "minmax(0, 1fr)" : "minmax(0, 0.3fr)")).join(" ");
  const gradeY = Array.from({ length: linhas }, (_, i) => (usadasY.has(i + 1) ? "minmax(7em, auto)" : "1.5em")).join(" ");

  const abrir = (id: string) => iniciar(() => router.push(`/painel/maquinas?abrir=${id}`, { scroll: false }));
  // Em uso → janela do atendimento; esperando pagamento → janela para receber; senão → iniciar/marcar situação
  const clicar = (m: MaquinaEstado) => {
    if (m.atendimento) abrir(m.atendimento.id);
    else if (m.aReceber) abrir(m.aReceber.id);
    else setNova({ equip: m, agora: hhmm(new Date().toISOString()) });
  };

  const livres = maquinas.filter((m) => !m.emUso && !m.aReceber && m.situacao === "normal").length;
  const ocupadas = maquinas.filter((m) => m.emUso).length;
  const comPrograma = maquinas.filter((m) => m.ligado !== null);
  const ligadas = comPrograma.filter((m) => m.ligado === "ligado").length;

  return (
    <div className={`space-y-6 ${abrindo ? "cursor-wait" : ""}`}>
      {/* Legenda + contagem */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="font-semibold">
          <span className="text-green">{livres} livres</span> · <span className="text-cyan">{ocupadas} em uso</span>
          {comPrograma.length > 0 && (
            <span className="text-muted-foreground">
              {" "}
              · 🟢 {ligadas}/{comPrograma.length} PCs ligados
            </span>
          )}
        </span>
        <Legenda cor="border-green bg-green/10" texto="Livre" />
        <Legenda cor="border-cyan bg-cyan/15" texto="Em uso" />
        <Legenda cor="border-amber bg-amber/20" texto={`Acabando (≤ ${AVISO_MINUTOS} min)`} />
        <Legenda cor="border-destructive bg-destructive/20" texto="Acabou · falta receber" />
        <Legenda cor="border-zinc-400 bg-zinc-500/25" texto="Manutenção / funcionário / sem cobrança" />
        <Legenda cor="border-purple bg-purple/15" texto="Reservada em breve" />
      </div>

      {/* Computador: mapa que encolhe/aumenta junto com a tela (fonte proporcional à largura) */}
      <div className="@container hidden rounded-2xl border border-border bg-card p-4 md:block">
        <div className="grid gap-[0.6em]" style={{ gridTemplateColumns: gradeX, gridTemplateRows: gradeY, fontSize: "clamp(10px, 1.3cqw, 16px)" }}>
          {noMapa.map((m) => (
            <div key={m.id} style={{ gridColumnStart: m.mapa_x!, gridRowStart: m.mapa_y! }}>
              <Cartao m={m} onClick={() => clicar(m)} />
            </div>
          ))}
        </div>
      </div>

      {/* Celular: lista em 2 colunas (sem mapa) */}
      <div className="grid grid-cols-2 gap-2 text-[14px] sm:grid-cols-3 md:hidden">
        {maquinas.map((m) => (
          <Cartao key={m.id} m={m} onClick={() => clicar(m)} />
        ))}
      </div>

      {fora.length > 0 && (
        <div className="hidden space-y-2 md:block">
          <h2 className="text-sm font-semibold text-muted-foreground">Fora do mapa (posicione em Configurações → Mapa das máquinas)</h2>
          <div className="grid grid-cols-4 gap-2 text-[14px] lg:grid-cols-6">
            {fora.map((m) => (
              <Cartao key={m.id} m={m} onClick={() => clicar(m)} />
            ))}
          </div>
        </div>
      )}

      {semMaquina.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Em tempo livre (sem máquina fixa)</h2>
          <div className="grid grid-cols-2 gap-2 text-[14px] sm:grid-cols-4 lg:grid-cols-6">
            {semMaquina.map((a) => (
              <Cartao
                key={a.id}
                m={{
                  id: a.id,
                  nome: "Livre",
                  tipo: "outro",
                  mapa_x: null,
                  mapa_y: null,
                  emUso: true,
                  icone: null,
                  situacao: "normal",
                  situacaoObs: null,
                  situacaoDesde: null,
                  aReceber: null,
                  ligado: null,
                  atendimento: a,
                }}
                onClick={() => abrir(a.id)}
              />
            ))}
          </div>
        </div>
      )}

      {nova && (
        <Janela
          onFechar={fechar}
          largura="max-w-2xl"
          titulo={
            <h2 className="flex items-center gap-2 font-display text-xl font-bold">
              <IconeMaquina icone={nova.equip.icone} tipo={nova.equip.tipo} className="size-6 text-2xl" /> {nova.equip.nome}
            </h2>
          }
        >
          {nova.equip.situacao === "normal" ? (
            <div className="space-y-6">
              <NovoAtendimento
                data={data}
                agora={nova.agora}
                valorHora={valorHora}
                clientes={clientes}
                comSaldo={comSaldo}
                equipamentos={maquinas.map((m) => ({ id: m.id, nome: m.nome, emUso: m.emUso, reserva: m.reserva, tv: m.tv, bloqueio: m.situacao !== "normal" ? SITUACOES_MAQUINA[m.situacao].nome : undefined }))}
                equipInicial={nova.equip.id}
                onIniciado={fechar}
              />
              <Situacao m={nova.equip} onFeito={fechar} />
            </div>
          ) : (
            <Situacao m={nova.equip} onFeito={fechar} />
          )}
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
  const a = m.atendimento;
  const especial = m.situacao !== "normal" ? SITUACOES_MAQUINA[m.situacao] : null;

  let cor = "border-green/70 bg-green/10 hover:bg-green/20";
  let linha2: React.ReactNode = <span className="text-[1em] text-green">Livre</span>;
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
    linha2 = <span className="w-full truncate text-[1em] font-semibold">{a.nome}</span>;
    linha3 = (
      <span className="text-[0.85em] leading-snug">
        {uso ? `${duracao(uso.minutos)} · ${reais(uso.valor)}` : "…"}
        <br />
        <b className={resta !== null && resta <= AVISO_MINUTOS ? (resta <= 0 ? "text-destructive" : "text-amber") : "text-muted-foreground"}>
          {!a.fim_previsto ? "tempo livre" : resta === null ? "" : resta > 0 ? `faltam ${duracao(resta)}` : "acabou"}
        </b>
      </span>
    );
  } else if (m.aReceber) {
    // Tempo acabou e ainda não pagou: fica vermelha até receber ou cancelar
    cor = "border-destructive bg-destructive/25 hover:bg-destructive/35";
    linha2 = <span className="text-[1em] font-bold text-destructive">Acabou · receber</span>;
    linha3 = (
      <span className="text-[0.85em] leading-snug">
        <span className="block truncate">{m.aReceber.nome}</span>
        <b className="text-destructive">falta {reais(m.aReceber.falta)}</b>
      </span>
    );
  } else if (especial) {
    cor = especial.cor;
    linha2 = (
      <span className="text-[1em] font-semibold">
        {especial.icone} {especial.nome}
      </span>
    );
    linha3 = (
      <span className="text-[0.85em] leading-snug text-muted-foreground">
        {m.situacaoObs && <span className="block truncate">{m.situacaoObs}</span>}
        {m.situacaoDesde && `desde ${hhmm(m.situacaoDesde)}`}
      </span>
    );
  } else if (m.reserva) {
    cor = "border-purple bg-purple/15 hover:bg-purple/25";
  }

  return (
    <button type="button" onClick={onClick} className={`flex h-full min-h-[7em] w-full min-w-0 flex-col items-start gap-[0.3em] overflow-hidden rounded-[0.8em] border-2 p-[0.7em] text-left transition ${cor}`}>
      <span className="relative flex w-full items-start gap-1.5 pr-[0.9em]">
        {/* Ligado / desligado (só PCs com o programa) */}
        {m.ligado && (
          <span
            className={`absolute top-[0.15em] right-0 size-[0.65em] rounded-full ${
              m.ligado === "ligado" ? "bg-green shadow-[0_0_6px] shadow-green" : m.ligado === "desativado" ? "bg-amber" : "bg-zinc-600 ring-1 ring-zinc-400"
            }`}
            title={m.ligado === "ligado" ? "PC ligado" : m.ligado === "desativado" ? "Programa desativado" : "PC desligado"}
          />
        )}
        <IconeMaquina icone={m.icone} tipo={m.tipo} className="mt-[0.1em] size-[1.1em] shrink-0 text-[1.05em] opacity-90" />
        <span className="line-clamp-2 min-w-0 text-[1em] leading-tight font-bold break-words">{m.nome}</span>
      </span>
      <span className="flex w-full min-w-0 flex-col gap-[0.15em]">
        {linha2}
        {linha3}
      </span>
      <span className="mt-auto flex flex-wrap gap-1">
        {m.reserva && <span className="rounded bg-purple/30 px-[0.4em] text-[0.75em] font-semibold text-purple">📅 {m.reserva}</span>}
        {a && m.aReceber && (
          <span className="rounded bg-destructive/30 px-[0.4em] text-[0.75em] font-semibold text-destructive">💰 {reais(m.aReceber.falta)} a receber</span>
        )}
        {m.tv && <span className="rounded bg-amber/30 px-[0.4em] text-[0.75em] font-semibold text-amber">📺 TV: {m.tv}</span>}
      </span>
    </button>
  );
}

// Marcar a máquina como manutenção / funcionário / uso sem cobrança, ou liberar
function Situacao({ m, onFeito }: { m: MaquinaEstado; onFeito: () => void }) {
  const [obs, setObs] = useState(m.situacaoObs ?? "");
  const [enviando, iniciar] = useTransition();
  const mudar = (situacao: string) =>
    iniciar(async () => {
      const f = new FormData();
      f.set("id", m.id);
      f.set("situacao", situacao);
      f.set("obs", obs);
      await mudarSituacaoMaquina(f);
      onFeito();
    });
  const atual = m.situacao !== "normal" ? SITUACOES_MAQUINA[m.situacao] : null;

  return (
    <div className={`space-y-3 ${atual ? "" : "border-t border-border pt-5"}`}>
      {atual ? (
        <p className="text-lg">
          {atual.icone} <b>{atual.nome}</b>
          {m.situacaoDesde && <span className="text-muted-foreground"> desde {hhmm(m.situacaoDesde)}</span>}
        </p>
      ) : (
        <p className="text-sm font-semibold text-muted-foreground">Ou deixar a máquina ocupada sem cobrança:</p>
      )}
      <Input value={obs} onChange={(e) => setObs(e.target.value)} maxLength={120} placeholder="Observação (opcional). Ex.: troca de fonte, uso do Pedro" />
      <div className="flex flex-wrap gap-2">
        {atual && (
          <Button type="button" disabled={enviando} onClick={() => mudar("normal")}>
            ✓ Liberar máquina
          </Button>
        )}
        {(Object.keys(SITUACOES_MAQUINA) as (keyof typeof SITUACOES_MAQUINA)[])
          .filter((k) => k !== m.situacao)
          .map((k) => (
            <Button key={k} type="button" variant="outline" disabled={enviando} onClick={() => mudar(k)}>
              {SITUACOES_MAQUINA[k].icone} {SITUACOES_MAQUINA[k].nome}
            </Button>
          ))}
      </div>
    </div>
  );
}
