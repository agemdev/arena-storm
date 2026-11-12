import { supabasePublico } from "@/lib/supabase/publico";

// Avisos do Asaas (webhook): pagamento criado, pago, vencido... → atualiza a licença da arena.
// O código secreto vem no header "asaas-access-token" e é conferido no banco.
export async function POST(request: Request) {
  const token = request.headers.get("asaas-access-token") ?? "";
  let corpo: { event?: string; payment?: unknown };
  try {
    corpo = await request.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  // Só eventos de cobrança interessam; os outros são aceitos e ignorados
  if (!corpo.payment || !corpo.event?.startsWith("PAYMENT_")) return Response.json({ ok: true, resultado: "ignorado" });

  const { data, error } = await supabasePublico().rpc("asaas_evento", { p_token: token, p_evento: corpo.event, p_pagamento: corpo.payment });
  if (error?.code === "28000") return Response.json({ ok: false }, { status: 401 });
  if (error) return Response.json({ ok: false }, { status: 500 }); // o Asaas tenta de novo depois
  return Response.json({ ok: true, resultado: data });
}
