// Regras e formatos do Caixa (servem no servidor e no navegador)

export const FUSO = "America/Fortaleza"; // UTC-3, sem horário de verão
const OFFSET = "-03:00";

export const FORMAS = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  cartao: "Cartão",
  minutos: "Minutos",
} as const;
export type Forma = keyof typeof FORMAS;

export const TIPOS_EQUIP = {
  pc: "PC",
  console: "Console",
  simulador: "Simulador",
  vr: "Realidade virtual",
  outro: "Outro",
} as const;

// Data de hoje no fuso da arena: "2026-11-09"
export function hojeISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(new Date());
}

// "2026-11-09" ± dias
export function somarDias(data: string, dias: number) {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

// "2026-11-09" → "09/11/2026 (segunda)"
export function dataExtenso(data: string) {
  const d = new Date(`${data}T12:00:00Z`);
  const dia = d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
  const sem = d.toLocaleDateString("pt-BR", { timeZone: "UTC", weekday: "long" });
  return `${dia} (${sem})`;
}

// Data/hora do banco → "14:15" no fuso da arena
export function hhmm(ts: string | null) {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" });
}

// "14:15" do dia do caixa → data/hora ISO. Se "fim" for menor que "inicio", vira o dia seguinte (igual = 0h).
export function paraTimestamp(data: string, hora: string, depoisDe?: string) {
  let ts = new Date(`${data}T${hora}:00${OFFSET}`);
  if (depoisDe && ts < new Date(depoisDe)) ts = new Date(ts.getTime() + 24 * 60 * 60 * 1000);
  return ts.toISOString();
}

// Tempo de uso e valor: proporcional ao minuto, arredondado para R$ 0,50
export function calcularUso(inicio: string | null, fim: string | null, valorHora: number) {
  if (!inicio) return { minutos: 0, valor: 0 };
  const ate = fim ? new Date(fim) : new Date();
  const minutos = Math.max(0, Math.round((ate.getTime() - new Date(inicio).getTime()) / 60000));
  const valor = Math.round(((minutos * valorHora) / 60) * 2) / 2;
  return { minutos, valor };
}

// 125 → "2:05"
export function duracao(minutos: number) {
  return `${Math.floor(minutos / 60)}:${String(minutos % 60).padStart(2, "0")}`;
}

// Converte "12,50" / "1.234,50" / "12.5" em número
export function lerValor(texto: string) {
  const t = texto.trim();
  const n = t.includes(",") ? Number(t.replace(/\./g, "").replace(",", ".")) : Number(t);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
}

// Linha do caixa como vem do banco
export type AtendimentoLinha = {
  id: string;
  data: string;
  nome: string;
  cliente_id: string | null;
  equipamento_id: string | null;
  inicio: string | null;
  fim: string | null;
  fim_previsto: string | null;
  valor_hora: number;
  valor_uso: number;
  observacao: string | null;
  ajuste: number;
  ajuste_motivo: string | null;
  cancelado_em: string | null;
  cancelado_motivo: string | null;
  criado_em: string;
  equipamentos: { nome: string } | null;
  consumos: { total: number }[];
  pagamentos: { forma: Forma; valor: number }[];
};

// Totais de um atendimento. Em uso → estima o valor até agora.
export function totais(a: AtendimentoLinha) {
  const cancelado = !!a.cancelado_em;
  const emUso = !cancelado && !!a.inicio && !a.fim;
  const uso = calcularUso(a.inicio, a.fim, Number(a.valor_hora));
  const valorUso = emUso ? uso.valor : Number(a.valor_uso);
  const consumo = a.consumos.reduce((s, c) => s + Number(c.total), 0);
  const ajuste = Number(a.ajuste ?? 0);
  const total = cancelado ? 0 : Math.max(0, valorUso + consumo + ajuste);
  const pago = a.pagamentos.reduce((s, p) => s + Number(p.valor), 0);
  const falta = Math.round((total - pago) * 100) / 100;
  const status = cancelado ? "cancelado" : emUso ? "em_uso" : falta > 0 ? "falta" : "pago";
  return { cancelado, emUso, minutos: uso.minutos, valorUso, consumo, ajuste, total, pago, falta, status } as const;
}

export const SELECT_ATENDIMENTO =
  "id, data, nome, cliente_id, equipamento_id, inicio, fim, fim_previsto, valor_hora, valor_uso, observacao, ajuste, ajuste_motivo, cancelado_em, cancelado_motivo, criado_em, equipamentos(nome), consumos(total), pagamentos(forma, valor)";

// Aviso de tempo acabando: quantos minutos antes
export const AVISO_MINUTOS = 5;

// Minutos que faltam até o fim previsto (negativo = passou)
export function minutosRestantes(fimPrevisto: string | null, agora = Date.now()) {
  if (!fimPrevisto) return null;
  return Math.ceil((new Date(fimPrevisto).getTime() - agora) / 60000);
}

// Durações rápidas para o "fim previsto"
export const DURACOES = [
  { min: 30, label: "30 min" },
  { min: 60, label: "1h" },
  { min: 90, label: "1h30" },
  { min: 120, label: "2h" },
  { min: 180, label: "3h" },
];

// "14:15" + 60 → "15:15"
export function somarMinutosHora(hora: string, minutos: number) {
  const [h, m] = hora.split(":").map(Number);
  const t = (h * 60 + m + minutos) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}
