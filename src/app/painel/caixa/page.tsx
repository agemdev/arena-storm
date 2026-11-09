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
  somarDias,
  totais,
  type AtendimentoLinha,
  type Forma,
} from "@/lib/caixa";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import NovoAtendimento from "./NovoAtendimento";
import { encerrarAtendimento, estenderTempo } from "./actions";
import { encerrarVencidos } from "@/lib/caixa-servidor";
import UsoAoVivo from "@/components/painel/UsoAoVivo";

type Busca = PageProps<"/painel/caixa">["searchParams"];

// Caixa do dia: resumo, novo atendimento e lista (como a planilha)
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
};

async function Caixa({ searchParams }: { searchParams: Busca }) {
  const { supabase, arenaId } = await exigirAdmin();
  await encerrarVencidos(supabase); // quem passou do tempo combinado é encerrado
  const { data: d } = await searchParams;
  const hoje = hojeISO();
  const data = typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : hoje;

  const [lista, clientes, equips, plano] = await Promise.all([
    supabase.from("atendimentos").select(SELECT_ATENDIMENTO).eq("data", data).order("criado_em"),
    supabase.from("clientes").select("id, nome, whatsapp").order("nome").limit(5000),
    supabase.from("equipamentos").select("id, nome").eq("ativo", true).order("ordem"),
    // Valor/hora padrão = primeiro plano "/hora" da tabela de preços
    supabase.from("planos").select("preco").eq("arena_id", arenaId).eq("unidade", "/hora").order("ordem").limit(1).maybeSingle(),
  ]);
  const atendimentos = (lista.data ?? []) as unknown as AtendimentoLinha[];

  // Máquinas ocupadas (atendimento sem fim, de qualquer dia)
  const { data: abertos } = await supabase.from("atendimentos").select("equipamento_id").is("fim", null).not("equipamento_id", "is", null);
  const ocupadas = new Set((abertos ?? []).map((a) => a.equipamento_id));

  // Resumo do dia
  const linhas = atendimentos.map((a) => ({ a, t: totais(a) }));
  const totalDia = linhas.reduce((s, l) => s + l.t.total, 0);
  const aReceber = linhas.reduce((s, l) => s + Math.max(0, l.t.falta), 0);
  const porForma = Object.fromEntries(Object.keys(FORMAS).map((f) => [f, 0])) as Record<Forma, number>;
  atendimentos.forEach((a) => a.pagamentos.forEach((p) => (porForma[p.forma] += Number(p.valor))));
  const emUso = linhas.filter((l) => l.t.emUso).length;

  return (
    <div className="space-y-6">
      {/* Data */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold">Caixa</h1>
        <div className="flex items-center gap-1">
          <Link href={`/painel/caixa?data=${somarDias(data, -1)}`} className="rounded-lg px-2 py-1 hover:bg-accent" aria-label="Dia anterior">
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
            <button type="submit" className="ml-1 text-sm text-cyan">Ir</button>
          </form>
          <Link href={`/painel/caixa?data=${somarDias(data, 1)}`} className="rounded-lg px-2 py-1 hover:bg-accent" aria-label="Próximo dia">
            ▶
          </Link>
        </div>
        <span className="text-sm text-muted-foreground">{dataExtenso(data)}</span>
        {data !== hoje && (
          <Link href="/painel/caixa" className="text-sm text-cyan hover:underline">
            Voltar para hoje
          </Link>
        )}
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

      {/* Novo atendimento */}
      <Card>
        <CardHeader>
          <CardTitle>Novo atendimento</CardTitle>
        </CardHeader>
        <CardContent>
          {equips.data?.length === 0 && (
            <p className="mb-3 text-sm text-muted-foreground">
              Nenhuma máquina cadastrada.{" "}
              <Link href="/painel/configuracoes/equipamentos" className="text-cyan hover:underline">
                Cadastrar equipamentos
              </Link>
            </p>
          )}
          <NovoAtendimento
            data={data}
            agora={hhmm(new Date().toISOString())}
            valorHora={String(plano.data?.preco ?? 12).replace(".", ",")}
            clientes={clientes.data ?? []}
            equipamentos={(equips.data ?? []).map((e) => ({ ...e, emUso: ocupadas.has(e.id) }))}
          />
        </CardContent>
      </Card>

      {/* Lista do dia */}
      <Card>
        <CardContent className="pt-2">
          {linhas.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">Nenhum atendimento neste dia.</p>
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
                  <TableRow key={a.id}>
                    <TableCell>{hhmm(a.inicio) || "—"}</TableCell>
                    <TableCell>
                      {a.fim ? hhmm(a.fim) : a.fim_previsto ? <span className="text-muted-foreground">{hhmm(a.fim_previsto)}?</span> : t.emUso ? "livre" : "—"}
                    </TableCell>
                    <TableCell>{a.equipamentos?.nome ?? (a.inicio ? "Livre" : "—")}</TableCell>
                    <TableCell className="max-w-40 truncate font-medium">
                      <Link href={`/painel/caixa/${a.id}`} className="hover:text-cyan">
                        {a.nome}
                      </Link>
                    </TableCell>
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
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS[t.status].cor}`}>
                        {STATUS[t.status].texto}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {t.emUso ? (
                        <div className="flex justify-end gap-1">
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
                          <Link href={`/painel/caixa/${a.id}`} className="self-center px-1 text-sm text-cyan hover:underline">Abrir</Link>
                        </div>
                      ) : (
                        <Link href={`/painel/caixa/${a.id}`} className="text-sm text-cyan hover:underline">
                          {t.falta > 0 ? "Receber" : "Abrir"}
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
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
