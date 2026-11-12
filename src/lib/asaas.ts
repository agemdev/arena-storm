import "server-only";

// Ligação com o Asaas (cobrança das licenças). A chave fica só na Vercel: ASAAS_API_KEY.
const URL_API = process.env.ASAAS_URL ?? "https://api.asaas.com/v3"; // teste: https://api-sandbox.asaas.com/v3

export const asaasConfigurado = () => !!process.env.ASAAS_API_KEY;

// Plano da licença → ciclo da assinatura no Asaas
export const CICLOS = { mensal: "MONTHLY", trimestral: "QUARTERLY", semestral: "SEMIANNUALLY", anual: "YEARLY" } as const;

type Resposta<T> = { ok: true; dados: T } | { ok: false; erro: string };

export async function asaas<T>(metodo: "GET" | "POST" | "PUT" | "DELETE", caminho: string, corpo?: unknown): Promise<Resposta<T>> {
  const chave = process.env.ASAAS_API_KEY;
  if (!chave) return { ok: false, erro: "Chave do Asaas não configurada na Vercel (ASAAS_API_KEY)." };
  try {
    const r = await fetch(`${URL_API}${caminho}`, {
      method: metodo,
      headers: { "Content-Type": "application/json", "User-Agent": "GestorArenaGamer", access_token: chave },
      body: corpo ? JSON.stringify(corpo) : undefined,
      cache: "no-store",
    });
    const json = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = (json as { errors?: { description: string }[] }).errors?.map((e) => e.description).join(" ") || `erro ${r.status}`;
      return { ok: false, erro: `Asaas: ${msg}` };
    }
    return { ok: true, dados: json as T };
  } catch {
    return { ok: false, erro: "Não deu para falar com o Asaas. Tente de novo." };
  }
}
