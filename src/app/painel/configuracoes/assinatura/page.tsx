import { Suspense } from "react";
import { exigirAdmin } from "@/lib/auth";
import { wa } from "@/lib/arena";
import { reais } from "@/lib/formatos";
import { dataBr, DIAS_TOLERANCIA, maisDias, NOME_SISTEMA, PLANOS_LICENCA, SITUACOES_LICENCA, SUPORTE_WHATSAPP, type PlanoLicenca, type SituacaoLicenca } from "@/lib/sistema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import GerarFatura from "./GerarFatura";

// Configurações → Assinatura: situação da licença do sistema, pagar e histórico
export default function AssinaturaPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold">Assinatura do sistema</h2>
        <p className="text-sm text-muted-foreground">Licença do {NOME_SISTEMA}: vencimento, pagamento e histórico.</p>
      </div>
      <Suspense fallback={<p className="text-muted-foreground">Carregando...</p>}>
        <Conteudo />
      </Suspense>
    </div>
  );
}

type Licenca = {
  plano: PlanoLicenca;
  valor: number;
  vence_em: string | null;
  asaas_assinatura_id: string | null;
  asaas_cliente_id: string | null;
  link_pagamento: string | null;
  cobranca_vence: string | null;
  email: string | null;
};

async function Conteudo() {
  const { supabase, arenaId, arenaNome } = await exigirAdmin();
  const [{ data: l }, { data: sit }, { data: pags }] = await Promise.all([
    supabase
      .from("licencas")
      .select("plano, valor, vence_em, asaas_assinatura_id, asaas_cliente_id, link_pagamento, cobranca_vence, email")
      .eq("arena_id", arenaId)
      .maybeSingle(),
    supabase.rpc("licenca_situacao", { p_arena: arenaId }),
    supabase.from("licenca_pagamentos").select("id, pago_em, valor, meses, vence_depois, origem").eq("arena_id", arenaId).order("pago_em", { ascending: false }).limit(24),
  ]);
  const lic = l as Licenca | null;
  const situacao = ((sit as { situacao: SituacaoLicenca }[] | null)?.[0]?.situacao ?? "ativa") as SituacaoLicenca;
  const suporte = wa(SUPORTE_WHATSAPP, `Olá! Sou da ${arenaNome} e tenho uma dúvida sobre a assinatura do ${NOME_SISTEMA}.`);

  if (!lic || lic.plano === "cortesia")
    return <p className="text-sm text-muted-foreground">Licença cortesia, sem vencimento. Nada a pagar. 🎉</p>;

  const s = SITUACOES_LICENCA[situacao];
  return (
    <>
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center gap-3">
          <CardTitle>Plano {PLANOS_LICENCA[lic.plano]?.nome}</CardTitle>
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${s.cor}`}>{s.nome}</span>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Info titulo="Valor" valor={reais(Number(lic.valor))} />
            <Info titulo="Vence em" valor={dataBr(lic.vence_em)} />
            <Info titulo="Pagamento" valor={lic.asaas_assinatura_id ? "Automático (Asaas)" : "Por fatura"} />
          </div>
          {lic.vence_em && ["tolerancia", "consulta", "apagar"].includes(situacao) && (
            <p className="text-sm text-destructive">
              Vencida. {situacao === "tolerancia" ? `Uso normal até ${dataBr(maisDias(lic.vence_em, DIAS_TOLERANCIA))}; depois fica só para consulta.` : "O sistema está só para consulta até pagar."}
            </p>
          )}

          {lic.link_pagamento ? (
            <div className="space-y-2 rounded-xl border border-green/40 bg-green/10 p-4">
              <p className="font-semibold">🧾 Fatura em aberto{lic.cobranca_vence ? ` · vence ${dataBr(lic.cobranca_vence)}` : ""}</p>
              <a href={lic.link_pagamento} target="_blank" rel="noopener" className="inline-block rounded-lg bg-green px-4 py-2 font-semibold text-black">
                💳 Pagar agora (Pix, boleto ou cartão)
              </a>
              <p className="text-xs text-muted-foreground">Depois de pagar, a licença renova sozinha (Pix e cartão: na hora; boleto: até 3 dias úteis).</p>
            </div>
          ) : lic.asaas_cliente_id ? (
            <div className="space-y-1">
              <GerarFatura />
              <p className="text-xs text-muted-foreground">
                {lic.asaas_assinatura_id ? "A próxima fatura chega sozinha no e-mail. Quer adiantar? Gere agora." : "Gere a fatura e pague por Pix, boleto ou cartão."}
                {lic.email ? ` Ela também vai para ${lic.email}.` : ""}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Para renovar, fale com o suporte pelo WhatsApp.</p>
          )}

          <a href={suporte} target="_blank" rel="noopener" className="inline-block text-sm text-cyan hover:underline">
            💬 Dúvidas sobre a assinatura? Fale com o suporte
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pagamentos</CardTitle>
        </CardHeader>
        <CardContent>
          {!pags?.length ? (
            <p className="text-sm text-muted-foreground">Nenhum pagamento ainda.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {pags.map((p) => (
                <li key={p.id} className="flex flex-wrap justify-between gap-2 py-2">
                  <span>
                    {dataBr(p.pago_em)} · {reais(Number(p.valor))} · {p.meses} {p.meses === 1 ? "mês" : "meses"}
                  </span>
                  <span className="text-muted-foreground">
                    válida até {dataBr(p.vence_depois)}
                    {p.origem === "asaas" ? " · online" : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function Info({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{titulo}</p>
      <p className="font-semibold">{valor}</p>
    </div>
  );
}
