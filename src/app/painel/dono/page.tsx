import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { exigirDono } from "@/lib/auth";
import { hojeISO } from "@/lib/caixa";
import { reais } from "@/lib/formatos";
import { dataBr, maisDias, NOME_SISTEMA, PLANOS_LICENCA, SITUACOES_LICENCA, type PlanoLicenca, type SituacaoLicenca } from "@/lib/sistema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Apagar, Cobranca, EditarLicenca, NovaArena, NovoAdmin, Pagamento, TokenWebhook, type ArenaDono } from "./Formularios";
import { asaasConfigurado } from "@/lib/asaas";

export const metadata: Metadata = { title: "Dono do sistema" };

type Linha = ArenaDono & { whatsapp: string | null; situacao: SituacaoLicenca; dias: number | null; admins: string | null };

// Painel do Dono do Sistema: arenas clientes, licenças e pagamentos
export default function DonoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">👑 Dono do sistema</h1>
        <p className="text-sm text-muted-foreground">{NOME_SISTEMA} · arenas clientes e licenças</p>
      </div>
      <Suspense fallback={<p className="text-muted-foreground">Carregando...</p>}>
        <Conteudo />
      </Suspense>
    </div>
  );
}

async function Conteudo() {
  const { supabase } = await exigirDono();
  const [{ data }, { data: tokenOk }] = await Promise.all([supabase.rpc("arenas_do_sistema"), supabase.rpc("token_asaas_definido")]);
  const chaveOk = asaasConfigurado();
  const arenas = (data ?? []) as Linha[];
  const hoje = hojeISO();

  // Receita por mês (licenças pagas e em uso)
  const pagantes = arenas.filter((a) => a.plano && a.plano !== "cortesia" && ["ativa", "avisar", "tolerancia"].includes(a.situacao));
  const porMes = pagantes.reduce((s, a) => s + Number(a.valor ?? 0) / PLANOS_LICENCA[a.plano as PlanoLicenca].meses, 0);
  const conta = (s: SituacaoLicenca[]) => arenas.filter((a) => s.includes(a.situacao)).length;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Numero titulo="Arenas" valor={String(arenas.length)} />
        <Numero titulo="Receita por mês (média)" valor={reais(porMes)} />
        <Numero titulo="Vencendo / tolerância" valor={String(conta(["avisar", "tolerancia"]))} alerta />
        <Numero titulo="Só consulta / apagar" valor={String(conta(["consulta", "apagar"]))} alerta />
      </div>

      {/* Ligação com o Asaas (cobrança automática) */}
      <details className="rounded-xl border border-border bg-card p-4" open={!chaveOk || !tokenOk}>
        <summary className="cursor-pointer font-semibold">
          🔁 Cobrança automática (Asaas) · {chaveOk && tokenOk ? <span className="text-green">pronta</span> : <span className="text-amber">falta configurar</span>}
        </summary>
        <div className="mt-3 space-y-3 text-sm">
          <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
            <li>
              Chave da API na Vercel (variável <code>ASAAS_API_KEY</code>): {chaveOk ? <b className="text-green">✓ configurada</b> : <b className="text-amber">falta</b>}
            </li>
            <li>
              No Asaas → Integrações → Webhooks: URL <code className="select-all">https://arena-storm.vercel.app/api/asaas</code>, eventos de cobrança, e o código abaixo como token.
            </li>
          </ol>
          <TokenWebhook definido={!!tokenOk} />
        </div>
      </details>

      <details className="rounded-xl border border-border bg-card p-4">
        <summary className="cursor-pointer font-semibold">+ Nova arena cliente</summary>
        <div className="mt-4">
          <NovaArena venceSugerido={maisDias(hoje, 30)} />
        </div>
      </details>

      <div className="space-y-3">
        {arenas.map((a) => {
          const s = SITUACOES_LICENCA[a.situacao] ?? SITUACOES_LICENCA.ativa;
          return (
            <Card key={a.id}>
              <CardHeader className="flex flex-row flex-wrap items-center gap-3">
                <CardTitle className="text-lg">{a.nome}</CardTitle>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${s.cor}`}>{s.nome}</span>
                <span className="text-sm text-muted-foreground">
                  {a.plano ? PLANOS_LICENCA[a.plano as PlanoLicenca]?.nome : "sem licença"}
                  {a.valor ? ` · ${reais(Number(a.valor))}` : ""}
                  {a.vence_em ? ` · vence ${dataBr(a.vence_em)}${a.dias !== null && a.dias >= 0 ? ` (${a.dias} dias)` : ""}` : ""}
                </span>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-muted-foreground">
                  {a.slug && <>🌐 {a.slug} · </>}
                  {a.responsavel && <>👤 {a.responsavel} · </>}
                  {a.contato && <>📞 {a.contato} · </>}
                  🔑 {a.admins ?? "sem admin"}
                  {a.obs && <> · 📝 {a.obs}</>}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Painel titulo="💰 Registrar pagamento">
                    <Pagamento a={a} hoje={hoje} />
                  </Painel>
                  {a.plano !== "cortesia" && (
                    <Painel titulo={a.asaas_assinatura_id ? "🔁 Cobrança automática ✓" : "🔁 Cobrança automática"}>
                      <Cobranca a={a} hoje={hoje} />
                    </Painel>
                  )}
                  <Painel titulo="✏️ Editar licença">
                    <EditarLicenca a={a} />
                  </Painel>
                  <Painel titulo="🔑 Admins">
                    <NovoAdmin arenaId={a.id} />
                  </Painel>
                  <Link href={`/painel/dono/backup/${a.id}`} className="rounded-lg border border-border px-3 py-1.5 hover:bg-accent">
                    💾 Backup
                  </Link>
                </div>
                {a.situacao === "apagar" && <Apagar a={a} />}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}

function Painel({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <details className="group w-full rounded-lg border border-border open:bg-muted/30 sm:w-auto sm:open:w-full">
      <summary className="cursor-pointer px-3 py-1.5">{titulo}</summary>
      <div className="p-3 pt-1">{children}</div>
    </details>
  );
}

function Numero({ titulo, valor, alerta }: { titulo: string; valor: string; alerta?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{titulo}</p>
      <p className={`font-display text-2xl font-bold ${alerta && valor !== "0" ? "text-amber" : "text-cyan"}`}>{valor}</p>
    </div>
  );
}
