// Regras da Agenda (servem no servidor e no navegador)
import { somarDias } from "@/lib/caixa";

export const TIPOS_AGENDA = {
  reserva: { nome: "Reserva", icone: "🎮", cor: "bg-cyan/25 border-cyan text-cyan" },
  corujao: { nome: "Corujão", icone: "🌙", cor: "bg-purple/25 border-purple text-purple" },
  campeonato: { nome: "Campeonato", icone: "🏆", cor: "bg-orange-400/25 border-orange-400 text-orange-300" },
  aniversario: { nome: "Aniversário", icone: "🎂", cor: "bg-pink-400/25 border-pink-400 text-pink-300" },
} as const;
export type TipoAgenda = keyof typeof TIPOS_AGENDA;

export const SITUACOES = {
  agendado: { nome: "Agendado", cor: "bg-muted text-muted-foreground" },
  confirmado: { nome: "Confirmado", cor: "bg-green/15 text-green" },
  realizado: { nome: "Realizado", cor: "bg-cyan/15 text-cyan" },
  faltou: { nome: "Faltou", cor: "bg-amber/15 text-amber" },
  cancelado: { nome: "Cancelado", cor: "bg-destructive/15 text-destructive" },
} as const;
export type Situacao = keyof typeof SITUACOES;
export const ATIVAS: Situacao[] = ["agendado", "confirmado"]; // prendem as máquinas

// O "dia" da agenda vai das 06:00 até 06:00 do dia seguinte (corujão entra no mesmo dia)
export const VIRADA = "06:00";
export function janelaDoDia(data: string) {
  return { de: `${data}T${VIRADA}:00-03:00`, ate: `${somarDias(data, 1)}T${VIRADA}:00-03:00` };
}

// Dia da agenda de um horário (antes das 6h conta como o dia anterior)
export function diaDaAgenda(ts: string) {
  const d = new Date(new Date(ts).getTime() - 3 * 3600_000 - 6 * 3600_000); // fuso -3 e virada 6h
  return d.toISOString().slice(0, 10);
}

// Corujão padrão
export const CORUJAO = { inicio: "22:00", fim: "06:00" };

export type AgendaLinha = {
  id: string;
  tipo: TipoAgenda;
  nome: string;
  cliente_id: string | null;
  whatsapp: string | null;
  inicio: string;
  fim: string;
  valor: number;
  plano_id: string | null;
  situacao: Situacao;
  observacao: string | null;
  agendamento_maquinas: { equipamento_id: string }[];
};

export const SELECT_AGENDA =
  "id, tipo, nome, cliente_id, whatsapp, inicio, fim, valor, plano_id, situacao, observacao, agendamento_maquinas(equipamento_id)";
