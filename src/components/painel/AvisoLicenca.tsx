import Link from "next/link";
import { exigirAdmin } from "@/lib/auth";
import { wa } from "@/lib/arena";
import { dataBr, DIAS_ATE_APAGAR, DIAS_TOLERANCIA, maisDias, NOME_SISTEMA, SUPORTE_WHATSAPP } from "@/lib/sistema";

// Faixa no topo do painel: licença vencendo, vencida ou só consulta (+ link para o dono do sistema)
export default async function AvisoLicenca() {
  const { supabase, arenaId, arenaNome } = await exigirAdmin();
  const [{ data }, dono] = await Promise.all([
    supabase.rpc("licenca_situacao", { p_arena: arenaId }),
    supabase.from("donos_sistema").select("user_id").maybeSingle(),
  ]);
  const l = (data as { plano: string; vence_em: string | null; situacao: string; dias: number | null; link_pagamento: string | null }[] | null)?.[0];
  const linkDono = dono.data ? (
    <Link href="/painel/dono" className="ml-auto shrink-0 rounded-full bg-purple/20 px-3 py-0.5 text-xs font-semibold text-purple print:hidden">
      👑 Dono do sistema
    </Link>
  ) : null;
  if (!l || l.situacao === "ativa" || !l.vence_em) return linkDono ? <div className="mx-auto flex max-w-6xl px-4 pt-3">{linkDono}</div> : null;

  const renovar = wa(SUPORTE_WHATSAPP, `Olá! Quero renovar a licença do ${NOME_SISTEMA} da ${arenaNome}.`);
  const fimTolerancia = maisDias(l.vence_em, DIAS_TOLERANCIA);
  const apagaEm = maisDias(fimTolerancia, DIAS_ATE_APAGAR);
  const textos: Record<string, { cor: string; msg: string }> = {
    avisar: {
      cor: "border-amber/50 bg-amber/15 text-amber",
      msg: `⚠️ Sua licença vence ${l.dias === 0 ? "hoje" : `em ${l.dias} dia(s)`} (${dataBr(l.vence_em)}). Renove para não parar.`,
    },
    tolerancia: {
      cor: "border-destructive/50 bg-destructive/15 text-destructive",
      msg: `⛔ Licença vencida em ${dataBr(l.vence_em)}. Você pode usar normalmente até ${dataBr(fimTolerancia)}; depois o sistema fica só para consulta.`,
    },
    consulta: {
      cor: "border-destructive/60 bg-destructive/25 text-destructive",
      msg: `🔒 Licença vencida: o sistema está SÓ PARA CONSULTA (não dá para lançar). Os dados serão apagados a partir de ${dataBr(apagaEm)} se não renovar.`,
    },
    apagar: {
      cor: "border-destructive bg-destructive/30 text-destructive",
      msg: `🔒 Licença vencida há mais de 3 meses: os dados podem ser apagados a qualquer momento. Renove ou peça um backup.`,
    },
  };
  const t = textos[l.situacao];
  if (!t) return null;
  return (
    <div className={`border-b px-4 py-2 text-sm print:hidden ${t.cor}`}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
        <span className="font-semibold">{t.msg}</span>
        {l.link_pagamento && (
          <a href={l.link_pagamento} target="_blank" rel="noopener" className="rounded-full bg-green px-3 py-0.5 font-semibold text-black">
            💳 Pagar agora (Pix, boleto ou cartão)
          </a>
        )}
        <Link href="/painel/configuracoes/assinatura" className="rounded-full bg-background/60 px-3 py-0.5 font-semibold underline">
          Assinatura
        </Link>
        <a href={renovar} target="_blank" rel="noopener" className="rounded-full bg-background/60 px-3 py-0.5 font-semibold underline">
          {l.link_pagamento ? "Dúvidas? WhatsApp" : "Renovar pelo WhatsApp"}
        </a>
        {linkDono}
      </div>
    </div>
  );
}
