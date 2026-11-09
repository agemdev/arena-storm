import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirAdmin } from "@/lib/auth";
import { reais } from "@/lib/formatos";
import { dataExtenso, duracao, FORMAS, hhmm, totais, type AtendimentoLinha, type Forma } from "@/lib/caixa";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { adicionarConsumo, encerrarAtendimento, estornarPagamento, excluirAtendimento, removerConsumo } from "../actions";
import EditarAtendimento from "./EditarAtendimento";
import Receber from "./Receber";

type Params = PageProps<"/painel/caixa/[id]">["params"];

// Um atendimento: tempo, consumo e pagamento
export default function AtendimentoPage({ params }: PageProps<"/painel/caixa/[id]">) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Carregando...</p>}>
      <Conteudo params={params} />
    </Suspense>
  );
}

type Detalhe = Omit<AtendimentoLinha, "consumos" | "pagamentos"> & {
  consumos: { id: string; descricao: string; quantidade: number; valor_unit: number; total: number }[];
  pagamentos: { id: string; forma: Forma; valor: number; criado_em: string }[];
};

async function Conteudo({ params }: { params: Params }) {
  const { id } = await params;
  const { supabase } = await exigirAdmin();
  const { data } = await supabase
    .from("atendimentos")
    .select(
      "id, data, nome, cliente_id, equipamento_id, inicio, fim, valor_hora, valor_uso, observacao, equipamentos(nome), consumos(id, descricao, quantidade, valor_unit, total), pagamentos(id, forma, valor, criado_em)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const a = data as unknown as Detalhe;
  const t = totais(a);

  const [produtos, equips, saldo] = await Promise.all([
    supabase.from("produtos").select("id, nome, preco").eq("ativo", true).order("ordem").order("nome"),
    supabase.from("equipamentos").select("id, nome").eq("ativo", true).order("ordem"),
    a.cliente_id
      ? supabase.from("minutos_saldos").select("saldo").eq("cliente_id", a.cliente_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const saldoMinutos = a.cliente_id ? (saldo.data?.saldo ?? 0) : null;

  return (
    <div className="space-y-6">
      <Link href={`/painel/caixa?data=${a.data}`} className="text-sm text-muted-foreground hover:text-foreground">
        ← Voltar ao caixa de {dataExtenso(a.data)}
      </Link>

      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold">{a.nome}</h1>
        {a.cliente_id ? (
          <Link href={`/painel/clientes/${a.cliente_id}`} className="rounded-full bg-green/15 px-2 py-0.5 text-xs text-green">
            Cliente · {saldoMinutos} min de saldo
          </Link>
        ) : (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Avulso</span>
        )}
        {a.equipamentos && <span className="text-muted-foreground">· {a.equipamentos.nome}</span>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          {/* Tempo de uso */}
          {a.inicio && (
            <Card>
              <CardHeader>
                <CardTitle>Tempo de uso</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-lg">
                  {hhmm(a.inicio)} → {a.fim ? hhmm(a.fim) : <span className="text-cyan">em uso</span>} ·{" "}
                  <b>{duracao(t.minutos)}</b> · {t.emUso && "≈ "}
                  <b>{reais(t.valorUso)}</b>
                  <span className="text-sm text-muted-foreground"> ({reais(Number(a.valor_hora))}/hora)</span>
                </p>
                {t.emUso && (
                  <form action={encerrarAtendimento}>
                    <input type="hidden" name="id" value={a.id} />
                    <Button type="submit">Encerrar agora</Button>
                  </form>
                )}
              </CardContent>
            </Card>
          )}

          {/* Consumo */}
          <Card>
            <CardHeader>
              <CardTitle>Consumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {produtos.data?.length ? (
                <div className="flex flex-wrap gap-2">
                  {produtos.data.map((p) => (
                    <form key={p.id} action={adicionarConsumo}>
                      <input type="hidden" name="atendimento_id" value={a.id} />
                      <input type="hidden" name="produto_id" value={p.id} />
                      <Button type="submit" variant="outline" size="sm">
                        + {p.nome} <span className="text-muted-foreground">{reais(Number(p.preco))}</span>
                      </Button>
                    </form>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum produto cadastrado.{" "}
                  <Link href="/painel/configuracoes/produtos" className="text-cyan hover:underline">
                    Cadastrar produtos
                  </Link>
                </p>
              )}
              {a.consumos.length > 0 && (
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {a.consumos.map((c) => (
                    <li key={c.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <span className="flex-1">
                        {c.quantidade}× {c.descricao}
                      </span>
                      <span>{reais(Number(c.total))}</span>
                      <form action={removerConsumo}>
                        <input type="hidden" name="id" value={c.id} />
                        <button type="submit" className="text-muted-foreground hover:text-destructive" aria-label={`Remover ${c.descricao}`}>
                          ✕
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Correções */}
          <Card>
            <CardHeader>
              <CardTitle>Corrigir dados</CardTitle>
            </CardHeader>
            <CardContent>
              <EditarAtendimento
                id={a.id}
                data={a.data}
                nome={a.nome}
                equipamentoId={a.equipamento_id ?? ""}
                inicio={hhmm(a.inicio)}
                fim={hhmm(a.fim)}
                valorHora={String(a.valor_hora).replace(".", ",")}
                valorUso={String(a.valor_uso).replace(".", ",")}
                observacao={a.observacao ?? ""}
                equipamentos={equips.data ?? []}
              />
            </CardContent>
          </Card>
        </div>

        {/* Pagamento */}
        <div className="space-y-6">
          <Card className="lg:sticky lg:top-6">
            <CardHeader>
              <CardTitle>Pagamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="space-y-1 text-sm">
                <Linha rotulo={t.emUso ? "Uso (até agora)" : "Uso"} valor={reais(t.valorUso)} />
                <Linha rotulo="Consumo" valor={reais(t.consumo)} />
                <Linha rotulo="Total" valor={reais(t.total)} forte />
                <Linha rotulo="Pago" valor={reais(t.pago)} />
              </dl>
              <div className={`rounded-xl p-3 text-center ${t.falta > 0 ? "bg-amber/10 text-amber" : "bg-green/10 text-green"}`}>
                <p className="text-xs">{t.falta > 0 ? "Falta receber" : t.falta < 0 ? "Troco / pago a mais" : "Tudo pago"}</p>
                <p className="font-display text-2xl font-bold">{reais(Math.abs(t.falta))}</p>
              </div>
              {t.emUso && <p className="text-xs text-muted-foreground">Ainda em uso: encerre antes de receber o valor final.</p>}
              <Receber atendimentoId={a.id} falta={t.falta} saldoMinutos={saldoMinutos} />

              {a.pagamentos.length > 0 && (
                <ul className="divide-y divide-border rounded-lg border border-border text-sm">
                  {a.pagamentos.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                      <span className="flex-1">
                        {FORMAS[p.forma]} <span className="text-muted-foreground">· {hhmm(p.criado_em)}</span>
                      </span>
                      <span>{reais(Number(p.valor))}</span>
                      <form action={estornarPagamento}>
                        <input type="hidden" name="id" value={p.id} />
                        <button type="submit" className="text-xs text-muted-foreground hover:text-destructive">
                          Estornar
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground">Excluir atendimento</summary>
            <form action={excluirAtendimento} className="mt-2 space-y-2 rounded-lg border border-destructive/30 p-3">
              <input type="hidden" name="id" value={a.id} />
              <p className="text-muted-foreground">Apaga o atendimento, o consumo e os pagamentos (minutos são estornados).</p>
              <Button type="submit" variant="destructive" size="sm">
                Excluir de vez
              </Button>
            </form>
          </details>
        </div>
      </div>
    </div>
  );
}

function Linha({ rotulo, valor, forte }: { rotulo: string; valor: string; forte?: boolean }) {
  return (
    <div className={`flex justify-between ${forte ? "border-t border-border pt-1 font-semibold" : ""}`}>
      <dt className="text-muted-foreground">{rotulo}</dt>
      <dd>{valor}</dd>
    </div>
  );
}
