import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { FORMAS, limitesDoDia, somarDias, totais, type AtendimentoLinha, type Forma } from "@/lib/caixa";
import { fiadosAbertos } from "@/lib/caixa-servidor";

// Números da arena num período (dashboard da tela inicial e relatórios)

const SELECT =
  "id, data, nome, cliente_id, equipamento_id, inicio, fim, fim_previsto, valor_hora, valor_uso, ajuste, ajuste_motivo, cancelado_em, cancelado_motivo, criado_em, observacao, minutos_de, pacote_de, fiado_em, equipamentos(nome), consumos(produto_id, descricao, quantidade, total), pagamentos(forma, valor)";

type Consumo = { produto_id: string | null; descricao: string; quantidade: number; total: number };
type Linha = AtendimentoLinha & { consumos: Consumo[] };

export type Periodo = { de: string; ate: string; nome: string };

// Busca todas as linhas (o banco entrega no máximo 1000 por vez)
async function tudo<T>(consulta: (de: number, ate: number) => PromiseLike<{ data: T[] | null }>) {
  const lista: T[] = [];
  for (let i = 0; ; i += 1000) {
    const { data } = await consulta(i, i + 999);
    lista.push(...(data ?? []));
    if (!data || data.length < 1000) return lista;
  }
}

// Hora e dia da semana no horário da arena (UTC-3, sem horário de verão)
const local = (ms: number) => new Date(ms - 3 * 3_600_000);

export async function dadosPeriodo(supabase: SupabaseClient, p: Periodo) {
  const lim = { de: limitesDoDia(p.de).de, ate: limitesDoDia(p.ate).ate };
  const [ats, pags, produtos, novos, saldos, fiados] = await Promise.all([
    tudo<Linha>((a, b) => supabase.from("atendimentos").select(SELECT).gte("data", p.de).lte("data", p.ate).order("criado_em").range(a, b) as never),
    tudo<{ forma: Forma; valor: number }>((a, b) => supabase.from("pagamentos").select("forma, valor").gte("criado_em", lim.de).lt("criado_em", lim.ate).range(a, b) as never),
    supabase.from("produtos").select("id, categoria"),
    supabase.from("clientes").select("id", { count: "exact", head: true }).gte("criado_em", lim.de).lt("criado_em", lim.ate),
    supabase.from("minutos_saldos").select("saldo"),
    fiadosAbertos(supabase),
  ]);
  const categoriaDe = new Map((produtos.data ?? []).map((x) => [x.id as string, x.categoria as string]));

  const validos = ats.map((a) => ({ a, t: totais(a) })).filter((x) => !x.t.cancelado);
  const cancelados = ats.length - validos.length;

  // Dinheiro
  const vendido = validos.reduce((s, x) => s + x.t.total, 0);
  const uso = validos.reduce((s, x) => s + x.t.valorUso, 0);
  const consumo = validos.reduce((s, x) => s + x.t.consumo, 0);
  const porForma = Object.fromEntries((Object.keys(FORMAS) as Forma[]).map((f) => [f, 0])) as Record<Forma, number>;
  for (const g of pags) porForma[g.forma] = (porForma[g.forma] ?? 0) + Number(g.valor);
  const recebido = porForma.dinheiro + porForma.pix + porForma.cartao; // dinheiro de verdade (sem minutos/pacote)

  // Por dia
  const dias: string[] = [];
  for (let d = p.de; d <= p.ate && dias.length < 400; d = somarDias(d, 1)) dias.push(d);
  const porDia = new Map(dias.map((d) => [d, { data: d, total: 0, atendimentos: 0 }]));
  for (const { a, t } of validos) {
    const x = porDia.get(a.data);
    if (x) {
      x.total += t.total;
      x.atendimentos += 1;
    }
  }

  // Dia da semana (média por dia, para comparar semanas incompletas)
  const semana = Array.from({ length: 7 }, (_, i) => ({ dia: i, total: 0, atendimentos: 0, vezes: 0 }));
  for (const d of dias) semana[new Date(`${d}T12:00:00Z`).getUTCDay()].vezes += 1;
  for (const x of porDia.values()) {
    const s = semana[new Date(`${x.data}T12:00:00Z`).getUTCDay()];
    s.total += x.total;
    s.atendimentos += x.atendimentos;
  }

  // Mapa de calor: minutos de máquina em uso por dia da semana × hora
  const calor = Array.from({ length: 7 }, () => Array(24).fill(0) as number[]);
  const agora = Date.now();
  for (const { a } of validos) {
    if (!a.inicio) continue;
    let ini = new Date(a.inicio).getTime();
    const fim = Math.min(a.fim ? new Date(a.fim).getTime() : agora, ini + 24 * 3_600_000);
    while (ini < fim) {
      const l = local(ini);
      const proxHora = ini + (60 - l.getUTCMinutes()) * 60_000 - l.getUTCSeconds() * 1000;
      const ate = Math.min(fim, proxHora);
      calor[l.getUTCDay()][l.getUTCHours()] += (ate - ini) / 60_000;
      ini = ate;
    }
  }

  // Produtos e categorias
  const prod = new Map<string, { nome: string; categoria: string; qtd: number; total: number }>();
  const cat = new Map<string, { categoria: string; qtd: number; total: number }>();
  for (const { a } of validos) {
    for (const c of a.consumos) {
      const categoria = c.produto_id ? (categoriaDe.get(c.produto_id) ?? "Outros") : "Digitado na hora";
      const k = c.descricao.toLowerCase();
      const x = prod.get(k) ?? { nome: c.descricao, categoria, qtd: 0, total: 0 };
      x.qtd += c.quantidade;
      x.total += Number(c.total);
      prod.set(k, x);
      const y = cat.get(categoria) ?? { categoria, qtd: 0, total: 0 };
      y.qtd += c.quantidade;
      y.total += Number(c.total);
      cat.set(categoria, y);
    }
  }

  // Máquinas
  const maq = new Map<string, { nome: string; minutos: number; total: number; atendimentos: number }>();
  for (const { a, t } of validos) {
    if (!a.inicio) continue;
    const nome = a.equipamentos?.nome ?? "Livre (sem máquina)";
    const x = maq.get(nome) ?? { nome, minutos: 0, total: 0, atendimentos: 0 };
    x.minutos += t.minutos;
    x.total += t.valorUso;
    x.atendimentos += 1;
    maq.set(nome, x);
  }

  // Clientes
  const cli = new Map<string, { id: string; nome: string; minutos: number; total: number; vezes: number }>();
  for (const { a, t } of validos) {
    if (!a.cliente_id) continue;
    const x = cli.get(a.cliente_id) ?? { id: a.cliente_id, nome: a.nome, minutos: 0, total: 0, vezes: 0 };
    x.minutos += t.minutos;
    x.total += t.total;
    x.vezes += 1;
    cli.set(a.cliente_id, x);
  }
  const cadastrados = validos.filter((x) => x.a.cliente_id).length;

  const ordenar = <T,>(m: Iterable<T>, k: keyof T) => [...m].sort((x, y) => Number(y[k]) - Number(x[k]));
  return {
    periodo: p,
    vendido,
    uso,
    consumo,
    porForma,
    recebido,
    atendimentos: validos.length,
    cancelados,
    ticket: validos.length ? vendido / validos.length : 0,
    horasJogadas: validos.reduce((s, x) => s + x.t.minutos, 0),
    porDia: [...porDia.values()],
    semana,
    calor,
    produtos: ordenar(prod.values(), "qtd"),
    categorias: ordenar(cat.values(), "total"),
    maquinas: ordenar(maq.values(), "minutos"),
    clientes: ordenar(cli.values(), "minutos"),
    cadastrados,
    avulsos: validos.length - cadastrados,
    clientesNovos: novos.count ?? 0,
    minutosCirculando: (saldos.data ?? []).reduce((s, x) => s + Math.max(0, Number(x.saldo)), 0),
    fiadoAberto: fiados.reduce((s, f) => s + f.falta, 0),
    lista: validos.map(({ a, t }) => ({
      data: a.data,
      nome: a.nome,
      maquina: a.inicio ? (a.equipamentos?.nome ?? "Livre") : "Só consumo",
      minutos: t.minutos,
      uso: t.valorUso,
      consumo: t.consumo,
      total: t.total,
      pago: t.pago,
      status: t.status,
    })),
  };
}

export type Dados = Awaited<ReturnType<typeof dadosPeriodo>>;

// Períodos prontos: hoje, 7 dias, mês, mês passado (ou de/até digitados)
export function lerPeriodo(hoje: string, chave?: string, de?: string, ate?: string): Periodo & { chave: string } {
  const DATA = /^\d{4}-\d{2}-\d{2}$/;
  if (de && ate && DATA.test(de) && DATA.test(ate)) {
    const [x, y] = de <= ate ? [de, ate] : [ate, de];
    return { de: x, ate: y, nome: `${br(x)} a ${br(y)}`, chave: "custom" };
  }
  const mes = `${hoje.slice(0, 7)}-01`;
  switch (chave) {
    case "7d":
      return { de: somarDias(hoje, -6), ate: hoje, nome: "Últimos 7 dias", chave: "7d" };
    case "30d":
      return { de: somarDias(hoje, -29), ate: hoje, nome: "Últimos 30 dias", chave: "30d" };
    case "mes":
      return { de: mes, ate: hoje, nome: "Este mês", chave: "mes" };
    case "mespassado": {
      const fimAnt = somarDias(mes, -1);
      return { de: `${fimAnt.slice(0, 7)}-01`, ate: fimAnt, nome: "Mês passado", chave: "mespassado" };
    }
    default:
      return { de: hoje, ate: hoje, nome: "Hoje", chave: "hoje" };
  }
}

const br = (d: string) => d.split("-").reverse().join("/");
