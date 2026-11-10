import { Suspense } from "react";
import Link from "next/link";
import { exigirAdmin } from "@/lib/auth";
import { reais } from "@/lib/formatos";
import {
  dataExtenso,
  duracao,
  FORMAS,
  hhmm,
  hojeISO,
  SELECT_ATENDIMENTO,
  SITUACOES_MAQUINA,
  somarDias,
  totais,
  type AtendimentoLinha,
  type Forma,
} from "@/lib/caixa";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import BotaoNovo from "./BotaoNovo";
import Cancelar from "./Cancelar";
import DetalheJanela from "./Detalhe";
import LinhaClicavel from "./LinhaClicavel";
import { encerrarAtendimento, estenderTempo } from "./actions";
import { encerrarVencidos, estadoMaquinas } from "@/lib/caixa-servidor";
import AoVivo from "@/components/painel/AoVivo";
import UsoAoVivo from "@/components/painel/UsoAoVivo";

type Busca = PageProps<"/painel/caixa">["searchParams"];

// Caixa do dia: resumo, botão de novo atendimento e lista (como a planilha)
export default function CaixaPage({ searchParams }: PageProps<"/painel/caixa">) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Carregando caixa...</p>}>
      <Caixa searchParams={searchParams} />
    </Suspense>
  );
}

const STATUS = {
  em_uso: { texto: "Em uso", cor: "bg-cyan/15 text-cyan" },
  falta: { texto: "A receber", cor: "bg-amber/15 text-amber" },
  pago: { texto: "Pago", cor: "bg-green/15 text-green" },
  cancelado: { texto: "Cancelado", cor: "bg-destructive/15 text-destructive" },
};

// Opções de ordenação da lista
const ORDENS = {
  novos: "Mais novos primeiro",
  acabando: "Acabando primeiro",
  antigos: "Mais antigos primeiro",
  receber: "A receber primeiro",
} as const;
type Ordem = keyof typeof ORDENS;

type Linha = { a: AtendimentoLinha; t: ReturnType<typeof totais> };

function ordenar(linhas: Linha[], ordem: Ordem) {
  const maisNovo = (x: Linha, y: Linha) => y.a.criado_em.localeCompare(x.a.criado_em);
  const grupo = (l: Linha) => {
    if (l.t.cancelado) return 9; // cancelados sempre no fim
    if (ordem === "acabando") return l.t.emUso ? (l.a.fim_previsto ? 0 : 1) : 2;
    if (ordem === "receber") return l.t.falta > 0 ? 0 : 1;
    return 0;
  };
  return [...linhas].sort((x, y) => {
    const g = grupo(x) - grupo(y);
    if (g) return g;
    // Acabando: quem termina antes fica em cima
    if (ordem === "acabando" && grupo(x) === 0) return x.a.fim_previsto!.localeCompare(y.a.fim_previsto!);
    if (ordem === "antigos") return -maisNovo(x, y);
    return maisNovo(x, y);
  });
}

async function Caixa({ searchParams }: { searchParams: Busca }) {
  const { supabase, arenaId } = await exigirAdmin();
  await encerrarVencidos(supabase); // quem passou do tempo combinado é encerrado
  const { data: d, ordem: o, abrir } = await searchParams;
  const hoje = hojeISO();
  const data = typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : hoje;
  const ordem: Ordem = typeof o === "string" && o in ORDENS ? (o as Ordem) : "novos";
  const abrirId = typeof abrir === "string" && /^[0-9a-f-]{36}$/.test(abrir) ? abrir : null;

  // Endereço da tela mantendo dia e ordenação
  const url = (extra: { data?: string; ordem?: Ordem; abrir?: string } = {}) => {
    const q = new URLSearchParams();
    const dd = extra.data ?? data;
    const oo = extra.ordem ?? ordem;
    if (dd !== hoje) q.set("data", dd);
    if (oo !== "novos") q.set("ordem", oo);
    if (extra.abrir) q.set("abrir", extra.abrir);
    const s = q.toString();
    return `/painel/caixa${s ? `?${s}` : ""}`;
  };

  const [lista, clientes, plano] = await Promise.all([
    supabase.from("atendimentos").select(SELECT_ATENDIMENTO).eq("data", data),
    supabase.from("clientes").select("id, nome, whatsapp").order("nome").limit(5000),
    // Valor/hora padrão = primeiro plano "/hora" da tabela de preços
    supabase.from("planos").select("preco").eq("arena_id", arenaId).eq("unidade", "/hora").order("ordem").limit(1).maybeSingle(),
  ]);
  const atendimentos = (lista.data ?? []) as unknown as AtendimentoLinha[];

  // Máquinas: em uso, reserva próxima, TV dividida (avisos no "Novo atendimento")
  const { maquinas } = await estadoMaquinas(supabase);

  // Resumo do dia (cancelados não contam)
  const linhas = ordenar(
    atendimentos.map((a) => ({ a, t: totais(a) })),
    ordem,
  );
  const totalDia = linhas.reduce((s, l) => s + l.t.total, 0);
  const aReceber = linhas.reduce((s, l) => s + Math.max(0, l.t.falta), 0);
  const porForma = Object.fromEntries(Object.keys(FORMAS).map((f) => [f, 0])) as Record<Forma, number>;
  atendimentos.forEach((a) => a.pagamentos.forEach((p) => (porForma[p.forma] += Number(p.valor))));
  const emUso = linhas.filter((l) => l.t.emUso).length;

  return (
    <div className="space-y-6">
      {/* Data + novo atendimento */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold">Caixa</h1>
        <div className="flex items-center gap-1">
          <Link href={url({ data: somarDias(data, -1) })} className="rounded-lg px-2 py-1 hover:bg-accent" aria-label="Dia anterior">
            ◀
          </Link>
          <form>
            <input
              type="date"
              name="data"
              defaultValue={data}
              className="rounded-lg border border-input bg-input/30 px-2 py-1 text-sm"
              aria-label="Escolher dia"
            />
            {ordem !== "novos" && <input type="hidden" name="ordem" value={ordem} />}
            <button type="submit" className="ml-1 text-sm text-cyan">Ir</button>
          </form>
          <Link href={url({ data: somarDias(data, 1) })} className="rounded-lg px-2 py-1 hover:bg-accent" aria-label="Próximo dia">
            ▶
          </Link>
        </div>
        <span className="text-sm text-muted-foreground">{dataExtenso(data)}</span>
        {data !== hoje && (
          <Link href={url({ data: hoje })} className="text-sm text-cyan hover:underline">
            Voltar para hoje
          </Link>
        )}
        <div className="ml-auto">
          <BotaoNovo
            data={data}
            valorHora={String(plano.data?.preco ?? 12).replace(".", ",")}
            clientes={clientes.data ?? []}
            equipamentos={maquinas.map((m) => ({ id: m.id, nome: m.nome, emUso: m.emUso, reserva: m.reserva, tv: m.tv, bloqueio: m.situacao !== "normal" ? SITUACOES_MAQUINA[m.situacao].nome : undefined }))}
          />
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        <Resumo titulo="Total do dia" valor={reais(totalDia)} destaque />
        <Resumo titulo="Dinheiro" valor={reais(porForma.dinheiro)} />
        <Resumo titulo="Pix" valor={reais(porForma.pix)} />
        <Resumo titulo="Cartão" valor={reais(porForma.cartao)} />
        <Resumo titulo="Pago em minutos" valor={reais(porForma.minutos)} />
        <Resumo titulo="A receber" valor={reais(aReceber)} alerta={aReceber > 0} />
        <Resumo titulo="Máquinas em uso" valor={String(emUso)} />
      </div>

      {/* Ordenação */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Ordenar:</span>
        {(Object.keys(ORDENS) as Ordem[]).map((k) => (
          <Link
            key={k}
            href={url({ ordem: k })}
            scroll={false}
            className={`rounded-full border px-3 py-1 ${k === ordem ? "border-cyan bg-cyan/15 text-cyan" : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            {ORDENS[k]}
          </Link>
        ))}
      </div>

      {/* Lista do dia: clique na linha abre a janela do atendimento */}
      <Card>
        <CardContent className="pt-2">
          {linhas.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">Nenhum atendimento neste dia. Clique em “Novo atendimento”.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Início</TableHead>
                  <TableHead>Fim</TableHead>
                  <TableHead>Máquina</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Uso atual</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Consumo</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Falta</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map(({ a, t }) => (
                  <LinhaClicavel
                    key={a.id}
                    href={url({ abrir: a.id })}
                    className={`${t.cancelado ? "opacity-50" : ""} ${a.id === abrirId ? "bg-accent/60" : ""}`}
                  >
                    <TableCell>{hhmm(a.inicio) || "—"}</TableCell>
                    <TableCell>
                      {a.fim ? hhmm(a.fim) : a.fim_previsto ? <span className="text-muted-foreground">{hhmm(a.fim_previsto)}?</span> : t.emUso ? "livre" : "—"}
                    </TableCell>
                    <TableCell>{a.equipamentos?.nome ?? (a.inicio ? "Livre" : "—")}</TableCell>
                    <TableCell className={`max-w-40 truncate font-medium ${t.cancelado ? "line-through" : ""}`}>{a.nome}</TableCell>
                    <TableCell>
                      {t.emUso ? (
                        <UsoAoVivo inicio={a.inicio!} fimPrevisto={a.fim_previsto} valorHora={Number(a.valor_hora)} />
                      ) : a.inicio ? (
                        <span>
                          {duracao(t.minutos)} <span className="text-muted-foreground">· {reais(t.valorUso)}</span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="hidden text-right md:table-cell">{reais(t.consumo)}</TableCell>
                    <TableCell className="text-right font-semibold">{reais(t.total)}</TableCell>
                    <TableCell className={`text-right ${t.falta > 0 ? "text-amber" : "text-muted-foreground"}`}>
                      {reais(Math.max(0, t.falta))}
                    </TableCell>
                    <TableCell>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS[t.status].cor}`}>{STATUS[t.status].texto}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      {!t.cancelado && (
                        <div className="flex items-center justify-end gap-1">
                          {t.emUso ? (
                            <>
                              <form action={estenderTempo}>
                                <input type="hidden" name="id" value={a.id} />
                                <input type="hidden" name="minutos" value="30" />
                                <Button type="submit" size="sm" variant="ghost" title="Mais 30 minutos">+30m</Button>
                              </form>
                              <form action={estenderTempo}>
                                <input type="hidden" name="id" value={a.id} />
                                <input type="hidden" name="minutos" value="60" />
                                <Button type="submit" size="sm" variant="ghost" title="Mais 1 hora">+1h</Button>
                              </form>
                              <form action={encerrarAtendimento}>
                                <input type="hidden" name="id" value={a.id} />
                                <Button type="submit" size="sm" variant="outline">Encerrar</Button>
                              </form>
                            </>
                          ) : (
                            t.falta > 0 && (
                              <Link href={url({ abrir: a.id })} scroll={false} className="px-1 text-sm font-semibold text-amber hover:underline">
                                Receber
                              </Link>
                            )
                          )}
                          <Cancelar id={a.id} nome={a.nome} emUso={t.emUso} pago={t.pago} compacto />
                        </div>
                      )}
                    </TableCell>
                  </LinhaClicavel>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AoVivo />

      {/* Janela flutuante do atendimento escolhido */}
      {abrirId && (
        <Suspense fallback={null}>
          <DetalheJanela key={abrirId} id={abrirId} fecharHref={url()} />
        </Suspense>
      )}
    </div>
  );
}

function Resumo({ titulo, valor, destaque, alerta }: { titulo: string; valor: string; destaque?: boolean; alerta?: boolean }) {
  return (
    <div className={`rounded-xl border border-border bg-card p-3 ${destaque ? "glow" : ""}`}>
      <p className="text-xs text-muted-foreground">{titulo}</p>
      <p className={`font-display text-lg font-bold ${destaque ? "text-cyan" : alerta ? "text-amber" : ""}`}>{valor}</p>
    </div>
  );
}
