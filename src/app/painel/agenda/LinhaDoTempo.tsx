"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Janela from "@/components/painel/Janela";
import { useAgora } from "@/components/painel/UsoAoVivo";
import type { ClienteOpcao } from "@/components/painel/BuscaCliente";
import { TIPOS_AGENDA, type Situacao, type TipoAgenda } from "@/lib/agenda";
import { hhmm } from "@/lib/caixa";
import FormAgendamento, { type Festa, type Inicial, type ReservaDia } from "./FormAgendamento";

export type Bloco = { id: string; tipo: TipoAgenda; nome: string; situacao: Situacao; equipamento_id: string; inicio: string; fim: string };

type Props = {
  data: string;
  de: number; // início da régua (ms)
  ate: number; // fim da régua (ms)
  equipamentos: { id: string; nome: string }[];
  blocos: Bloco[];
  abrirHref: string; // endereço com "abrir=" no fim
  clientes: ClienteOpcao[];
  festas: Festa[];
  valorCorujao: number;
};

// Agenda do dia: máquinas nas linhas, horas nas colunas. Clique no vazio = novo; no bloco = abrir.
export default function LinhaDoTempo({ data, de, ate, equipamentos, blocos, abrirHref, clientes, festas, valorCorujao }: Props) {
  const router = useRouter();
  const agora = useAgora();
  const [abrindo, iniciar] = useTransition();
  const [novo, setNovo] = useState<Inicial | null>(null);
  const fechar = useCallback(() => setNovo(null), []);

  const total = ate - de;
  const pct = (ms: number) => `${(Math.min(Math.max(ms - de, 0), total) / total) * 100}%`;
  const horas: number[] = [];
  for (let t = de; t <= ate; t += 3600_000) horas.push(t);

  const abrirNovo = (equipId?: string, hora?: string) =>
    setNovo({
      tipo: "reserva",
      nome: "",
      cliente: null,
      whatsapp: "",
      data,
      inicio: hora ?? "",
      fim: "",
      valor: "",
      plano_id: "",
      observacao: "",
      maquinas: equipId ? [equipId] : [],
    });

  // Clique no espaço vazio: hora arredondada para 30 min
  const cliqueVazio = (e: React.MouseEvent<HTMLDivElement>, equipId: string) => {
    if (e.target !== e.currentTarget) return;
    const r = e.currentTarget.getBoundingClientRect();
    const ms = de + ((e.clientX - r.left) / r.width) * total;
    const arred = Math.floor(ms / 1800_000) * 1800_000;
    abrirNovo(equipId, hhmm(new Date(arred).toISOString()));
  };

  // Só as que ainda prendem máquina (agendado/confirmado)
  const reservas: ReservaDia[] = blocos.filter((b) => b.situacao !== "realizado").map((b) => ({ id: b.id, equipamento_id: b.equipamento_id, inicio: b.inicio, fim: b.fim }));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" onClick={() => abrirNovo()}>
          <Plus className="size-5" /> Novo agendamento
        </Button>
        <div className="flex flex-wrap gap-2 text-xs">
          {(Object.keys(TIPOS_AGENDA) as TipoAgenda[]).map((t) => (
            <span key={t} className={`rounded-full border px-2 py-0.5 ${TIPOS_AGENDA[t].cor}`}>
              {TIPOS_AGENDA[t].icone} {TIPOS_AGENDA[t].nome}
            </span>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">Clique num espaço vazio para agendar naquela máquina e hora.</span>
      </div>

      <div className={`overflow-x-auto rounded-xl border border-border bg-card ${abrindo ? "animate-pulse" : ""}`}>
        <div className="min-w-[760px]">
          {/* Régua de horas */}
          <div className="flex border-b border-border">
            <div className="w-24 shrink-0" />
            <div className="relative h-7 flex-1">
              {horas.map((h) => (
                <span key={h} className="absolute top-1.5 -translate-x-1/2 text-[11px] text-muted-foreground" style={{ left: pct(h) }}>
                  {hhmm(new Date(h).toISOString())}
                </span>
              ))}
            </div>
          </div>

          {equipamentos.map((e) => (
            <div key={e.id} className="flex border-b border-border/60 last:border-0">
              <div className="flex w-24 shrink-0 items-center px-3 text-sm font-medium">{e.nome}</div>
              <div className="relative h-11 flex-1 cursor-copy hover:bg-accent/30" onClick={(ev) => cliqueVazio(ev, e.id)}>
                {/* Linhas das horas */}
                {horas.map((h) => (
                  <span key={h} className="pointer-events-none absolute inset-y-0 border-l border-border/40" style={{ left: pct(h) }} />
                ))}
                {/* Agora */}
                {agora !== null && agora > de && agora < ate && (
                  <span className="pointer-events-none absolute inset-y-0 z-10 border-l-2 border-destructive" style={{ left: pct(agora) }} />
                )}
                {blocos
                  .filter((b) => b.equipamento_id === e.id)
                  .map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => iniciar(() => router.push(abrirHref + b.id, { scroll: false }))}
                      className={`absolute inset-y-1 overflow-hidden rounded-md border px-1.5 text-left text-xs font-semibold whitespace-nowrap ${TIPOS_AGENDA[b.tipo].cor} ${
                        b.situacao === "realizado" ? "opacity-50" : ""
                      } ${b.situacao === "confirmado" ? "border-2" : "border-dashed"}`}
                      style={{ left: pct(new Date(b.inicio).getTime()), width: `calc(${pct(new Date(b.fim).getTime())} - ${pct(new Date(b.inicio).getTime())})` }}
                      title={`${TIPOS_AGENDA[b.tipo].nome}: ${b.nome} · ${hhmm(b.inicio)}–${hhmm(b.fim)}`}
                    >
                      {TIPOS_AGENDA[b.tipo].icone} {b.nome} · {hhmm(b.inicio)}–{hhmm(b.fim)}
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Borda tracejada = agendado · borda cheia = confirmado · apagado = já foi para o Caixa · linha vermelha = agora.</p>

      {novo && (
        <Janela onFechar={fechar} largura="max-w-3xl" titulo={<h2 className="font-display text-xl font-bold">Novo agendamento</h2>}>
          <FormAgendamento inicial={novo} clientes={clientes} equipamentos={equipamentos} festas={festas} valorCorujao={valorCorujao} reservas={reservas} onSalvo={fechar} />
        </Janela>
      )}
    </div>
  );
}
