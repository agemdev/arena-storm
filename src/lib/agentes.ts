// Programa dos PCs: regras de "ligado / desligado"
import { FUSO } from "@/lib/caixa";

export const HUB_LIMITE_MS = 3 * 60_000; // Servidor manda "estou vivo" a cada 1 min

// Servidor ligado = deu sinal nos últimos 3 minutos
export function servidorLigado(hubContato: string | null, agora = Date.now()) {
  return !!hubContato && agora - new Date(hubContato).getTime() < HUB_LIMITE_MS;
}

// PC ligado = o Servidor diz que está conectado (e o próprio Servidor está vivo)
export function pcLigado(online: boolean, hubContato: string | null, agora = Date.now()) {
  return online && servidorLigado(hubContato, agora);
}

// "10/11 14:20"
export function quando(ts: string | null) {
  if (!ts) return "nunca";
  return new Date(ts).toLocaleString("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
