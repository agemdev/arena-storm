"use server";

import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/auth";
import { asaas } from "@/lib/asaas";
import { NOME_SISTEMA, PLANOS_LICENCA, type PlanoLicenca } from "@/lib/sistema";
import { hojeISO } from "@/lib/caixa";

export type Resultado = { ok: boolean; msg: string; link?: string } | null;

// A arena gera a própria fatura para renovar (Pix, boleto ou cartão). Quando pagar, a licença renova sozinha.
export async function gerarFatura(): Promise<Resultado> {
  const { supabase, arenaId, arenaNome } = await exigirAdmin();
  const { data: l } = await supabase.from("licencas").select("plano, valor, asaas_cliente_id, link_pagamento").eq("arena_id", arenaId).maybeSingle();
  if (!l) return { ok: false, msg: "Licença não encontrada. Fale com o suporte." };
  if (l.link_pagamento) return { ok: true, msg: "Já existe uma fatura em aberto.", link: l.link_pagamento };
  if (!l.asaas_cliente_id || !(Number(l.valor) > 0) || l.plano === "cortesia")
    return { ok: false, msg: "Pagamento online ainda não liberado para sua arena. Fale com o suporte pelo WhatsApp." };

  const f = await asaas<{ invoiceUrl: string }>("POST", "/payments", {
    customer: l.asaas_cliente_id,
    billingType: "UNDEFINED",
    value: Number(l.valor),
    dueDate: hojeISO(),
    description: `Licença ${PLANOS_LICENCA[l.plano as PlanoLicenca]?.nome ?? ""} – ${NOME_SISTEMA} – ${arenaNome}`,
    externalReference: arenaId,
  });
  if (!f.ok) return { ok: false, msg: "Não deu para gerar a fatura agora. Tente de novo ou fale com o suporte." };
  revalidatePath("/painel", "layout");
  return { ok: true, msg: "Fatura gerada! Também foi enviada para o seu e-mail.", link: f.dados.invoiceUrl };
}
