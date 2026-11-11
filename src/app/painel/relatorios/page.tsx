import { Suspense } from "react";
import type { Metadata } from "next";
import { exigirAdmin } from "@/lib/auth";
import { hojeISO } from "@/lib/caixa";
import { horas, reais } from "@/lib/formatos";
import { dadosPeriodo, lerPeriodo } from "@/lib/relatorio";
import Indicadores, { SECOES, type Secao } from "@/components/painel/Indicadores";
import EscolherPeriodo from "@/components/painel/EscolherPeriodo";
import { BaixarCsv, Imprimir } from "./Botoes";

export const metadata: Metadata = { title: "Relatórios – Arena Storm" };

const TABELAS = {
  atendimentos: "Lista de atendimentos",
  produtos: "Produtos vendidos",
  maquinas: "Uso das máquinas",
  clientes: "Clientes do período",
  dias: "Resumo por dia",
} as const;
type Tabela = keyof typeof TABELAS;

type SP = PageProps<"/painel/relatorios">["searchParams"];

// Relatórios: escolhe período e o que entra → imprimir/PDF ou planilha
export default function RelatoriosPage({ searchParams }: PageProps<"/painel/relatorios">) {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold print:text-black">📄 Relatórios</h1>
      <Suspense fallback={<p className="text-muted-foreground">Montando o relatório...</p>}>
        <Relatorio searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Relatorio({ searchParams }: { searchParams: SP }) {
  const { supabase, arenaNome } = await exigirAdmin();
  const sp = await searchParams;
  const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const lista = (v: string | string[] | undefined) => (v === undefined ? null : Array.isArray(v) ? v : [v]);
  const p = lerPeriodo(hojeISO(), um(sp.periodo) ?? "mes", um(sp.de), um(sp.ate));
  // Primeira vez (sem escolha) → tudo marcado
  const escolheu = sp.ok !== undefined;
  const secoes = ((escolheu ? lista(sp.s) : null) ?? (escolheu ? [] : Object.keys(SECOES))) as Secao[];
  const tabelas = ((escolheu ? lista(sp.t) : null) ?? (escolheu ? [] : Object.keys(TABELAS))) as Tabela[];
  const d = await dadosPeriodo(supabase, p);
  const arquivo = (x: string) => `${x}-${p.de}_a_${p.ate}`;

  // Caixas de seleção (vão junto no formulário de datas)
  const marcar = (
    <details className="w-full print:hidden">
      <summary className="cursor-pointer text-sm text-cyan">O que entra no relatório</summary>
      <input type="hidden" name="ok" value="1" />
      <div className="mt-2 grid gap-1 sm:grid-cols-2">
        {Object.entries(SECOES).map(([k, rotulo]) => (
          <label key={k} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="s" value={k} defaultChecked={secoes.includes(k as Secao)} /> {rotulo}
          </label>
        ))}
        {Object.entries(TABELAS).map(([k, rotulo]) => (
          <label key={k} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="t" value={k} defaultChecked={tabelas.includes(k as Tabela)} /> 📋 {rotulo}
          </label>
        ))}
      </div>
    </details>
  );

  return (
    <div className="space-y-6">
      <EscolherPeriodo base="/painel/relatorios" chave={p.chave} de={p.de} ate={p.ate} extra={marcar} />
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <p className="text-lg">
          <b>{arenaNome}</b> · {p.nome}
          {p.chave !== "custom" && (
            <span className="text-muted-foreground">
              {" "}
              ({p.de.split("-").reverse().join("/")} a {p.ate.split("-").reverse().join("/")})
            </span>
          )}
        </p>
        <Imprimir />
      </div>

      <Indicadores d={d} secoes={secoes} />

      {tabelas.includes("dias") && (
        <Detalhe
          titulo={TABELAS.dias}
          arquivo={arquivo("resumo-por-dia")}
          colunas={["Data", "Atendimentos", "Vendido (R$)"]}
          linhas={d.porDia.map((x) => [x.data.split("-").reverse().join("/"), x.atendimentos, x.total])}
          moeda={[2]}
        />
      )}
      {tabelas.includes("atendimentos") && (
        <Detalhe
          titulo={TABELAS.atendimentos}
          arquivo={arquivo("atendimentos")}
          colunas={["Data", "Cliente", "Máquina", "Tempo", "Uso (R$)", "Consumo (R$)", "Total (R$)", "Pago (R$)", "Situação"]}
          linhas={d.lista.map((x) => [x.data.split("-").reverse().join("/"), x.nome, x.maquina, horas(x.minutos), x.uso, x.consumo, x.total, x.pago, STATUS[x.status] ?? x.status])}
          moeda={[4, 5, 6, 7]}
        />
      )}
      {tabelas.includes("produtos") && (
        <Detalhe
          titulo={TABELAS.produtos}
          arquivo={arquivo("produtos")}
          colunas={["Produto", "Categoria", "Quantidade", "Total (R$)"]}
          linhas={d.produtos.map((x) => [x.nome, x.categoria, x.qtd, x.total])}
          moeda={[3]}
        />
      )}
      {tabelas.includes("maquinas") && (
        <Detalhe
          titulo={TABELAS.maquinas}
          arquivo={arquivo("maquinas")}
          colunas={["Máquina", "Atendimentos", "Horas", "Valor do tempo (R$)"]}
          linhas={d.maquinas.map((x) => [x.nome, x.atendimentos, horas(x.minutos), x.total])}
          moeda={[3]}
        />
      )}
      {tabelas.includes("clientes") && (
        <Detalhe
          titulo={TABELAS.clientes}
          arquivo={arquivo("clientes")}
          colunas={["Cliente", "Vezes", "Horas", "Gastou (R$)"]}
          linhas={d.clientes.map((x) => [x.nome, x.vezes, horas(x.minutos), x.total])}
          moeda={[3]}
        />
      )}
      {secoes.length === 0 && tabelas.length === 0 && <p className="text-muted-foreground">Marque o que deve entrar no relatório.</p>}
    </div>
  );
}

const STATUS: Record<string, string> = { em_uso: "Em uso", fiado: "Fiado", falta: "Falta receber", pago: "Pago" };

type Valor = string | number;

function Detalhe({ titulo, arquivo, colunas, linhas, moeda }: { titulo: string; arquivo: string; colunas: string[]; linhas: Valor[][]; moeda: number[] }) {
  return (
    <section className="space-y-2 break-inside-avoid">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold">📋 {titulo}</h2>
        <BaixarCsv nome={arquivo} colunas={colunas} linhas={linhas} />
      </div>
      {linhas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nada no período.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                {colunas.map((c, i) => (
                  <th key={c} className={`px-3 py-2 font-semibold ${moeda.includes(i) ? "text-right" : ""}`}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {linhas.map((l, j) => (
                <tr key={j}>
                  {l.map((v, i) => (
                    <td key={i} className={`px-3 py-1.5 ${moeda.includes(i) ? "text-right tabular-nums" : ""}`}>
                      {moeda.includes(i) ? reais(Number(v)) : v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

