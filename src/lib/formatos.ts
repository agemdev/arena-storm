// Tipos e formatações usados no site e no painel (pode rodar no navegador)

export const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export type Horario = { dia: number; fechado: boolean; abre: string | null; fecha: string | null };
export type Plano = {
  id: string;
  categoria: "plano" | "festa";
  nome: string;
  preco: number;
  unidade: string | null;
  descricao: string | null;
  itens: string[];
  destaque: boolean;
  ativo: boolean;
  ordem: number;
  pacote_minutos?: number | null; // pacote de horas: minutos de jogo que dá
};

// "09:00:00" → "9h" · "09:30" → "9h30"
export function hora(t: string | null) {
  if (!t) return "";
  const [h, m] = t.split(":");
  return `${Number(h)}h${m !== "00" ? m : ""}`;
}

// R$ 1.234,50 (sem centavos quando inteiro)
export function reais(v: number) {
  return Number(v).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: Number.isInteger(Number(v)) ? 0 : 2,
  });
}

// Junta dias seguidos com o mesmo horário: "Segunda a Sexta · 9h — 22h"
export function agruparHorarios(lista: Horario[]) {
  const ordem = [1, 2, 3, 4, 5, 6, 0]; // semana começando na segunda
  const porDia = new Map(lista.map((h) => [h.dia, h]));
  const texto = (h?: Horario) => (!h || h.fechado ? "Fechado" : `${hora(h.abre)} — ${hora(h.fecha)}`);

  const grupos: { dias: number[]; hora: string }[] = [];
  for (const d of ordem) {
    const t = texto(porDia.get(d));
    const ultimo = grupos.at(-1);
    if (ultimo && ultimo.hora === t) ultimo.dias.push(d);
    else grupos.push({ dias: [d], hora: t });
  }
  return grupos.map((g) => ({
    dia: g.dias.length === 1 ? DIAS[g.dias[0]] : `${DIAS[g.dias[0]]} a ${DIAS[g.dias.at(-1)!]}`,
    hora: g.hora,
  }));
}

// Minutos jogados → "12h05" / "45 min"
export function horas(minutos: number) {
  if (minutos < 60) return `${minutos} min`;
  const m = minutos % 60;
  return `${Math.floor(minutos / 60)}h${m ? String(m).padStart(2, "0") : ""}`;
}
