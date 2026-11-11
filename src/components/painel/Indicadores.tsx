import Link from "next/link";
import { reais, horas, DIAS } from "@/lib/formatos";
import { FORMAS, type Forma } from "@/lib/caixa";
import type { Dados } from "@/lib/relatorio";

export const SECOES = {
  dinheiro: "💰 Dinheiro",
  movimento: "📈 Movimento",
  produtos: "🥤 Produtos e máquinas",
  clientes: "👥 Clientes",
} as const;
export type Secao = keyof typeof SECOES;

// Dashboard: cartões + gráficos de barra feitos com CSS (sem biblioteca)
export default function Indicadores({ d, secoes = Object.keys(SECOES) as Secao[] }: { d: Dados; secoes?: Secao[] }) {
  const mostra = (s: Secao) => secoes.includes(s);
  const varios = d.porDia.length > 1;
  return (
    <div className="space-y-6">
      {mostra("dinheiro") && (
        <Bloco titulo={SECOES.dinheiro}>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Numero titulo="Vendido" valor={reais(d.vendido)} dica={`${reais(d.uso)} tempo · ${reais(d.consumo)} consumo`} />
            <Numero titulo="Recebido (dinheiro, Pix, cartão)" valor={reais(d.recebido)} dica="pela data do pagamento" />
            <Numero titulo="Ticket médio" valor={reais(d.ticket)} dica={`${d.atendimentos} atendimentos`} />
            <Numero titulo="📒 Fiado em aberto" valor={reais(d.fiadoAberto)} dica="total, todas as datas" alerta={d.fiadoAberto > 0} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Cartao titulo="Recebido por forma de pagamento">
              <Barras
                linhas={(Object.keys(FORMAS) as Forma[]).map((f) => ({ rotulo: FORMAS[f], valor: d.porForma[f], texto: reais(d.porForma[f]) }))}
              />
            </Cartao>
            <Cartao titulo={varios ? "Vendido por dia" : "Tempo × consumo"}>
              {varios ? (
                <Colunas linhas={d.porDia.map((x) => ({ rotulo: x.data.slice(8), valor: x.total, texto: `${x.data.split("-").reverse().join("/")}: ${reais(x.total)} (${x.atendimentos})` }))} />
              ) : (
                <Barras
                  linhas={[
                    { rotulo: "Tempo de uso", valor: d.uso, texto: reais(d.uso) },
                    { rotulo: "Consumo", valor: d.consumo, texto: reais(d.consumo) },
                  ]}
                />
              )}
            </Cartao>
          </div>
        </Bloco>
      )}

      {mostra("movimento") && (
        <Bloco titulo={SECOES.movimento}>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Numero titulo="Atendimentos" valor={String(d.atendimentos)} dica={d.cancelados ? `${d.cancelados} cancelado(s)` : "nenhum cancelado"} />
            <Numero titulo="Horas jogadas" valor={horas(d.horasJogadas)} />
            <Numero titulo="Horário mais cheio" valor={horarioPico(d.calor)} />
            <Numero titulo="Melhor dia da semana" valor={melhorDia(d.semana)} dica="média por dia" />
          </div>
          <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
            <Cartao titulo="Média vendida por dia da semana">
              <Barras linhas={d.semana.map((s) => ({ rotulo: DIAS[s.dia].slice(0, 3), valor: s.vezes ? s.total / s.vezes : 0, texto: reais(s.vezes ? s.total / s.vezes : 0) }))} />
            </Cartao>
            <Cartao titulo="Horários de movimento (máquinas em uso)">
              <Calor calor={d.calor} />
            </Cartao>
          </div>
        </Bloco>
      )}

      {mostra("produtos") && (
        <Bloco titulo={SECOES.produtos}>
          <div className="grid gap-4 md:grid-cols-3">
            <Cartao titulo="Produtos mais vendidos">
              <Barras vazio="Nenhuma venda." linhas={d.produtos.slice(0, 8).map((p) => ({ rotulo: p.nome, valor: p.qtd, texto: `${p.qtd} · ${reais(p.total)}` }))} />
            </Cartao>
            <Cartao titulo="Vendas por categoria">
              <Barras vazio="Nenhuma venda." linhas={d.categorias.map((c) => ({ rotulo: c.categoria, valor: c.total, texto: reais(c.total) }))} />
            </Cartao>
            <Cartao titulo="Máquinas mais usadas (horas)">
              <Barras vazio="Nenhum uso." linhas={d.maquinas.slice(0, 10).map((m) => ({ rotulo: m.nome, valor: m.minutos, texto: horas(m.minutos) }))} />
            </Cartao>
          </div>
        </Bloco>
      )}

      {mostra("clientes") && (
        <Bloco titulo={SECOES.clientes}>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Numero titulo="Clientes novos" valor={String(d.clientesNovos)} dica="cadastrados no período" />
            <Numero
              titulo="Cadastrados × avulsos"
              valor={`${d.cadastrados} × ${d.avulsos}`}
              dica={d.atendimentos ? `${Math.round((d.cadastrados / d.atendimentos) * 100)}% cadastrados` : ""}
            />
            <Numero titulo="Minutos em saldo" valor={`${d.minutosCirculando} min`} dica="que os clientes ainda podem usar" />
            <Numero titulo="Clientes diferentes" valor={String(d.clientes.length)} dica="cadastrados que vieram" />
          </div>
          <Cartao titulo="Quem mais jogou no período">
            {d.clientes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum cliente cadastrado jogou.</p>
            ) : (
              <ol className="grid gap-x-6 text-sm sm:grid-cols-2">
                {d.clientes.slice(0, 10).map((c, i) => (
                  <li key={c.id} className="flex items-center gap-2 border-b border-border py-1.5">
                    <span className="w-6 text-muted-foreground">{["🥇", "🥈", "🥉"][i] ?? `${i + 1}º`}</span>
                    <Link href={`/painel/clientes/${c.id}`} className="flex-1 truncate hover:underline">
                      {c.nome}
                    </Link>
                    <span className="font-semibold text-cyan">{horas(c.minutos)}</span>
                    <span className="w-20 text-right text-muted-foreground">{reais(c.total)}</span>
                  </li>
                ))}
              </ol>
            )}
          </Cartao>
        </Bloco>
      )}
    </div>
  );
}

function horarioPico(calor: number[][]) {
  const porHora = Array.from({ length: 24 }, (_, h) => calor.reduce((s, dia) => s + dia[h], 0));
  const max = Math.max(...porHora);
  if (!max) return "—";
  const h = porHora.indexOf(max);
  return `${h}h às ${(h + 1) % 24}h`;
}

function melhorDia(semana: Dados["semana"]) {
  const medias = semana.map((s) => (s.vezes ? s.total / s.vezes : 0));
  const max = Math.max(...medias);
  return max ? DIAS[medias.indexOf(max)] : "—";
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 break-inside-avoid">
      <h2 className="font-display text-lg font-bold">{titulo}</h2>
      {children}
    </section>
  );
}

function Cartao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4 break-inside-avoid">
      <h3 className="text-sm font-semibold text-muted-foreground">{titulo}</h3>
      {children}
    </div>
  );
}

function Numero({ titulo, valor, dica, alerta }: { titulo: string; valor: string; dica?: string; alerta?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{titulo}</p>
      <p className={`font-display text-2xl font-bold ${alerta ? "text-amber" : "text-cyan"}`}>{valor}</p>
      {dica && <p className="text-xs text-muted-foreground">{dica}</p>}
    </div>
  );
}

type Barra = { rotulo: string; valor: number; texto: string };

// Barras deitadas (rótulo · barra · valor)
function Barras({ linhas, vazio = "Sem dados." }: { linhas: Barra[]; vazio?: string }) {
  const max = Math.max(0, ...linhas.map((l) => l.valor));
  if (!max) return <p className="text-sm text-muted-foreground">{vazio}</p>;
  return (
    <ul className="space-y-1.5 text-sm">
      {linhas.map((l) => (
        <li key={l.rotulo} className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-2">
          <span className="truncate" title={l.rotulo}>
            {l.rotulo}
          </span>
          <span className="h-3 rounded-full bg-muted">
            <span className="block h-3 rounded-full bg-gradient-to-r from-purple to-cyan" style={{ width: `${(l.valor / max) * 100}%` }} />
          </span>
          <span className="text-right text-xs font-semibold">{l.texto}</span>
        </li>
      ))}
    </ul>
  );
}

// Colunas em pé (um dia por coluna)
function Colunas({ linhas }: { linhas: Barra[] }) {
  const max = Math.max(0, ...linhas.map((l) => l.valor));
  if (!max) return <p className="text-sm text-muted-foreground">Sem vendas.</p>;
  return (
    <div className="flex h-40 items-end gap-[2px]">
      {linhas.map((l) => (
        <div key={l.rotulo + l.texto} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={l.texto}>
          <div className="w-full rounded-t bg-gradient-to-t from-purple to-cyan" style={{ height: `${Math.max(2, (l.valor / max) * 100)}%` }} />
          {linhas.length <= 31 && <span className="text-[9px] text-muted-foreground">{l.rotulo}</span>}
        </div>
      ))}
    </div>
  );
}

// Mapa de calor: dias × horas (mais forte = mais máquinas em uso)
function Calor({ calor }: { calor: number[][] }) {
  const max = Math.max(0, ...calor.flat());
  if (!max) return <p className="text-sm text-muted-foreground">Sem uso no período.</p>;
  // Só as horas que tiveram movimento (fica mais legível)
  const usadas = Array.from({ length: 24 }, (_, h) => h).filter((h) => calor.some((d) => d[h] > 0));
  const de = Math.min(...usadas);
  const ate = Math.max(...usadas);
  const horasMostrar = Array.from({ length: ate - de + 1 }, (_, i) => de + i);
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-[2px] text-[10px]">
        <thead>
          <tr>
            <th />
            {horasMostrar.map((h) => (
              <th key={h} className="font-normal text-muted-foreground">
                {h}h
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {calor.map((dia, i) => (
            <tr key={i}>
              <th className="pr-1 text-left font-normal text-muted-foreground">{DIAS[i].slice(0, 3)}</th>
              {horasMostrar.map((h) => (
                <td
                  key={h}
                  className="h-5 min-w-4 rounded-sm bg-cyan"
                  style={{ opacity: dia[h] ? 0.15 + (dia[h] / max) * 0.85 : 0.04 }}
                  title={`${DIAS[i]} ${h}h: ${horas(Math.round(dia[h]))} de máquina em uso`}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
