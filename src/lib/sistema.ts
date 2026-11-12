// Dados do SISTEMA (o produto vendido para as arenas). Mudou o nome ou o suporte? Edite aqui.

export const NOME_SISTEMA = "Gestor de Arena Gamer e Esports";
export const SUPORTE_WHATSAPP = "5588992320187"; // WhatsApp do suporte/renovação

export const PLANOS_LICENCA = {
  mensal: { nome: "Mensal", meses: 1 },
  trimestral: { nome: "Trimestral", meses: 3 },
  semestral: { nome: "Semestral", meses: 6 },
  anual: { nome: "Anual", meses: 12 },
  cortesia: { nome: "Cortesia (sem vencimento)", meses: 0 },
} as const;
export type PlanoLicenca = keyof typeof PLANOS_LICENCA;

export const SITUACOES_LICENCA = {
  ativa: { nome: "Em dia", cor: "bg-green/15 text-green" },
  avisar: { nome: "Vence logo", cor: "bg-amber/20 text-amber" },
  tolerancia: { nome: "Vencida (tolerância)", cor: "bg-destructive/20 text-destructive" },
  consulta: { nome: "Só consulta", cor: "bg-zinc-500/25 text-zinc-300" },
  apagar: { nome: "Pronta para apagar", cor: "bg-destructive/30 text-destructive" },
} as const;
export type SituacaoLicenca = keyof typeof SITUACOES_LICENCA;

// Regras (iguais às do banco): tolerância e prazo até poder apagar
export const DIAS_TOLERANCIA = 5;
export const DIAS_ATE_APAGAR = 90;

// "2026-12-01" → "01/12/2026"
export const dataBr = (d: string | null) => (d ? d.split("-").reverse().join("/") : "—");

// "2026-12-01" + n dias
export function maisDias(d: string, n: number) {
  const x = new Date(`${d}T12:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
}
