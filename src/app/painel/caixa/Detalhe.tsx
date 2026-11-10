import Link from "next/link";
import { exigirAdmin } from "@/lib/auth";
import { reais } from "@/lib/formatos";
import { duracao, FORMAS, hhmm, totais, type AtendimentoLinha, type Forma } from "@/lib/caixa";
import { Button } from "@/components/ui/button";
import Janela from "@/components/painel/Janela";
import UsoAoVivo from "@/components/painel/UsoAoVivo";
import {
  adicionarConsumo,
  desfazerCancelamento,
  encerrarAtendimento,
  estenderTempo,
  estornarPagamento,
  excluirAtendimento,
  reabrirTempo,
  removerConsumo,
} from "./actions";
import Cancelar from "./Cancelar";
import { clientesComSaldo } from "@/lib/caixa-servidor";
import AjustarValor from "./[id]/AjustarValor";
import EditarAtendimento from "./[id]/EditarAtendimento";
import Receber from "./[id]/Receber";

type Detalhe = Omit<AtendimentoLinha, "consumos" | "pagamentos"> & {
  consumos: { id: string; descricao: string; quantidade: number; valor_unit: number; total: number }[];
  pagamentos: { id: string; forma: Forma; valor: number; criado_em: string; clientes: { nome: string } | null }[];
};

// Janela flutuante de um atendimento: tempo, consumo, pagamento e correções
export default async function DetalheJanela({ id, fecharHref }: { id: string; fecharHref: string }) {
  const { supabase } = await exigirAdmin();
  const { data } = await supabase
    .from("atendimentos")
    .select(
      "id, data, nome, cliente_id, equipamento_id, inicio, fim, fim_previsto, valor_hora, valor_uso, observacao, ajuste, ajuste_motivo, cancelado_em, cancelado_motivo, criado_em, minutos_de, equipamentos(nome), consumos(id, descricao, quantidade, valor_unit, total), pagamentos(id, forma, valor, criado_em, clientes(nome))",
    )
    .eq("id", id)
    .maybeSingle();

  if (!data)
    return (
      <Janela fecharHref={fecharHref} titulo={<h2 className="font-display text-xl font-bold">Atendimento não encontrado</h2>}>
        <p className="text-muted-foreground">Ele pode ter sido excluído.</p>
      </Janela>
    );

  const a = data as unknown as Detalhe;
  const t = totais(a);

  const [produtos, equips, comSaldo] = await Promise.all([
    supabase.from("produtos").select("id, nome, preco").eq("ativo", true).order("ordem").order("nome"),
    supabase.from("equipamentos").select("id, nome").eq("ativo", true).order("ordem"),
    clientesComSaldo(supabase),
  ]);
  const saldoMinutos = a.cliente_id ? (comSaldo.find((c) => c.id === a.cliente_id)?.saldo ?? 0) : null;
  const pagaCom = a.minutos_de ? (comSaldo.find((c) => c.id === a.minutos_de) ?? { nome: "cliente sem saldo", saldo: 0 }) : null;

  const titulo = (
    <div className="flex flex-wrap items-center gap-3">
      <h2 className={`font-display text-2xl font-bold ${t.cancelado ? "line-through opacity-60" : ""}`}>{a.nome}</h2>
      {a.cliente_id ? (
        <Link href={`/painel/clientes/${a.cliente_id}`} className="rounded-full bg-green/15 px-2 py-0.5 text-xs text-green">
          Cliente · {saldoMinutos} min de saldo
        </Link>
      ) : (
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Avulso</span>
      )}
      {a.inicio && <span className="text-muted-foreground">· {a.equipamentos?.nome ?? "Livre (qualquer máquina)"}</span>}
    </div>
  );

  return (
    <Janela key={a.id} fecharHref={fecharHref} titulo={titulo} largura="max-w-5xl">
      {/* Cancelado: só mostra o resumo e permite desfazer */}
      {t.cancelado ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4">
            <p className="font-semibold text-destructive">
              Cancelado às {hhmm(a.cancelado_em)}
              {a.cancelado_motivo ? ` · ${a.cancelado_motivo}` : ""}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {a.inicio ? `Tempo: ${hhmm(a.inicio)} → ${hhmm(a.fim)} (${duracao(t.minutos)}). ` : ""}Valor zerado, não entra no caixa do dia.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <form action={desfazerCancelamento}>
              <input type="hidden" name="id" value={a.id} />
              <Button type="submit" variant="outline">Desfazer cancelamento</Button>
            </form>
            <ExcluirDeVez id={a.id} />
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-6">
            {/* Tempo de uso */}
            {a.inicio && (
              <Secao titulo="Tempo de uso">
                {t.emUso ? (
                  <div className="space-y-3">
                    <UsoAoVivo inicio={a.inicio} fimPrevisto={a.fim_previsto} valorHora={Number(a.valor_hora)} detalhado />
                    <p className="text-sm text-muted-foreground">
                      Início {hhmm(a.inicio)} · {a.fim_previsto ? `combinado até ${hhmm(a.fim_previsto)}` : "tempo livre"} ·{" "}
                      {reais(Number(a.valor_hora))}/hora
                    </p>
                    {pagaCom && (
                      <p className="text-sm text-purple">
                        ⏱ Paga com minutos de <b>{pagaCom.nome}</b> ({pagaCom.saldo} min): desconta sozinho ao encerrar.
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <form action={encerrarAtendimento}>
                        <input type="hidden" name="id" value={a.id} />
                        <Button type="submit">Encerrar agora</Button>
                      </form>
                      {[
                        ["30", "+30 min"],
                        ["60", "+1h"],
                        ["livre", "Tempo livre"],
                      ].map(([m, rotulo]) => (
                        <form key={m} action={estenderTempo}>
                          <input type="hidden" name="id" value={a.id} />
                          <input type="hidden" name="minutos" value={m} />
                          <Button type="submit" variant="outline">
                            {rotulo}
                          </Button>
                        </form>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-lg">
                      {hhmm(a.inicio)} → {hhmm(a.fim)} · <b>{duracao(t.minutos)}</b> · <b>{reais(t.valorUso)}</b>
                      <span className="text-sm text-muted-foreground"> ({reais(Number(a.valor_hora))}/hora)</span>
                    </p>
                    <form action={reabrirTempo}>
                      <input type="hidden" name="id" value={a.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        Reabrir tempo
                      </Button>
                    </form>
                  </div>
                )}
              </Secao>
            )}

            {/* Consumo */}
            <Secao titulo="Consumo">
              <div className="space-y-3">
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
              </div>
            </Secao>

            {/* Correções */}
            <details className="rounded-xl border border-border p-4">
              <summary className="cursor-pointer font-semibold">Corrigir dados (nome, máquina, horários, observação)</summary>
              <div className="mt-4">
                <EditarAtendimento
                  id={a.id}
                  data={a.data}
                  nome={a.nome}
                  modo={a.inicio ? (a.equipamento_id ?? "livre") : ""}
                  emUso={t.emUso}
                  inicio={hhmm(a.inicio)}
                  fimPrevisto={hhmm(a.fim_previsto)}
                  fim={hhmm(a.fim)}
                  valorHora={String(a.valor_hora).replace(".", ",")}
                  observacao={a.observacao ?? ""}
                  minutosDe={a.minutos_de ?? ""}
                  clienteId={a.cliente_id}
                  comSaldo={comSaldo}
                  equipamentos={equips.data ?? []}
                />
              </div>
            </details>
            {a.observacao && <p className="text-sm text-muted-foreground">📝 {a.observacao}</p>}
          </div>

          {/* Pagamento */}
          <div className="space-y-4">
            <Secao titulo="Pagamento">
              <div className="space-y-4">
                <dl className="space-y-1 text-sm">
                  <Linha rotulo={t.emUso ? "Uso (até agora)" : "Uso"} valor={reais(t.valorUso)} />
                  <Linha rotulo="Consumo" valor={reais(t.consumo)} />
                  {t.ajuste !== 0 && (
                    <Linha
                      rotulo={`${t.ajuste < 0 ? "Desconto" : "Acréscimo"}${a.ajuste_motivo && a.ajuste_motivo !== "Desconto" ? ` (${a.ajuste_motivo})` : ""}`}
                      valor={`${t.ajuste < 0 ? "−" : "+"} ${reais(Math.abs(t.ajuste))}`}
                    />
                  )}
                  <Linha rotulo="Total" valor={reais(t.total)} forte />
                  <Linha rotulo="Pago" valor={reais(t.pago)} />
                </dl>
                <div className={`rounded-xl p-3 text-center ${t.falta > 0 ? "bg-amber/10 text-amber" : "bg-green/10 text-green"}`}>
                  <p className="text-xs">{t.falta > 0 ? "Falta receber" : t.falta < 0 ? "Troco / pago a mais" : "Tudo pago"}</p>
                  <p className="font-display text-2xl font-bold">{reais(Math.abs(t.falta))}</p>
                </div>
                {t.emUso && <p className="text-xs text-muted-foreground">Ainda em uso: encerre antes de receber o valor final.</p>}
                {!t.emUso && <AjustarValor id={a.id} calculado={t.valorUso + t.consumo} total={t.total} temAjuste={t.ajuste !== 0} />}
                <Receber atendimentoId={a.id} falta={t.falta} clienteId={a.cliente_id} minutosDe={a.minutos_de} comSaldo={comSaldo} />

                {a.pagamentos.length > 0 && (
                  <ul className="divide-y divide-border rounded-lg border border-border text-sm">
                    {a.pagamentos.map((p) => (
                      <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                        <span className="flex-1">
                          {FORMAS[p.forma]}
                          {p.forma === "minutos" && p.clientes && <span className="text-purple"> de {p.clientes.nome}</span>}{" "}
                          <span className="text-muted-foreground">· {hhmm(p.criado_em)}</span>
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
              </div>
            </Secao>

            <div className="flex flex-wrap items-center gap-3">
              <Cancelar id={a.id} nome={a.nome} emUso={t.emUso} pago={t.pago} />
              <ExcluirDeVez id={a.id} />
            </div>
          </div>
        </div>
      )}
    </Janela>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-3 font-semibold">{titulo}</h3>
      {children}
    </section>
  );
}

function ExcluirDeVez({ id }: { id: string }) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-muted-foreground">Excluir (lançado por engano)</summary>
      <form action={excluirAtendimento} className="mt-2 space-y-2 rounded-lg border border-destructive/30 p-3">
        <input type="hidden" name="id" value={id} />
        <p className="text-muted-foreground">Apaga tudo, sem histórico (minutos são estornados).</p>
        <Button type="submit" variant="destructive" size="sm">
          Excluir de vez
        </Button>
      </form>
    </details>
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
