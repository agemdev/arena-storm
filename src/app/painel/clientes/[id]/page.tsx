import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirAdmin } from "@/lib/auth";
import { listarCidadesDoEstado, listarEstados } from "@/lib/locais";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ClienteForm from "../ClienteForm";
import DarMinutos from "./DarMinutos";
import AjustarSaldo from "./AjustarSaldo";
import VenderPacote from "./VenderPacote";
import { duracao, FUSO } from "@/lib/caixa";

type Params = PageProps<"/painel/clientes/[id]">["params"];

// Editar um cliente
export default function EditarCliente({
  params,
}: PageProps<"/painel/clientes/[id]">) {
  return (
    <div className="space-y-6">
      <Link
        href="/painel/clientes"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Voltar
      </Link>
      <Suspense
        fallback={<p className="text-muted-foreground">Carregando...</p>}
      >
        <Formulario params={params} />
      </Suspense>
    </div>
  );
}

async function Formulario({ params }: { params: Params }) {
  const { id } = await params;
  const { supabase, cidadePadrao } = await exigirAdmin();
  const { data } = await supabase
    .from("clientes")
    .select("id, nome, whatsapp, descricao, cidade_id, cidades(uf)")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();

  const c = data as unknown as typeof data & { cidades: { uf: string } | null };
  // Cliente antigo sem cidade → usa a cidade padrão da arena
  const uf = c.cidades?.uf ?? cidadePadrao.uf;
  const cidadeId = c.cidade_id ?? cidadePadrao.id;
  const [estados, cidades, extrato, extratoPacote, pacotes] = await Promise.all([
    listarEstados(),
    listarCidadesDoEstado(uf),
    supabase
      .from("minutos_lancamentos")
      .select("id, minutos, motivo, obs, criado_em")
      .eq("cliente_id", c.id)
      .order("criado_em", { ascending: false }),
    supabase
      .from("pacote_lancamentos")
      .select("id, minutos, motivo, obs, criado_em")
      .eq("cliente_id", c.id)
      .order("criado_em", { ascending: false }),
    supabase.from("planos").select("id, nome, preco, pacote_minutos").eq("ativo", true).not("pacote_minutos", "is", null).order("ordem"),
  ]);
  const lancamentos = extrato.data ?? [];
  const saldo = lancamentos.reduce((s, l) => s + l.minutos, 0);
  const lancPacote = extratoPacote.data ?? [];
  const saldoPacote = lancPacote.reduce((s, l) => s + l.minutos, 0);
  const dia = (ts: string) => new Date(ts).toLocaleDateString("pt-BR", { timeZone: FUSO });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Editar cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <ClienteForm
            cliente={{
              id: c.id,
              nome: c.nome,
              whatsapp: c.whatsapp.replace(/^55/, ""),
              descricao: c.descricao,
            }}
            estados={estados}
            cidades={cidades}
            uf={uf}
            cidadeId={cidadeId}
          />
        </CardContent>
      </Card>

      {/* Banco de Minutos: R$ 1 gasto = 1 min */}
      <Card>
        <CardHeader>
          <CardTitle>
            Banco de Minutos · <span className="text-cyan">{saldo} min</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <DarMinutos clienteId={c.id} />
            <AjustarSaldo clienteId={c.id} tipo="minutos" atual={String(saldo)} />
          </div>
          {lancamentos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum lançamento ainda. Cada R$ 1 pago no caixa vira 1 minuto.
            </p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {lancamentos.slice(0, 30).map((l) => (
                <li key={l.id} className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">
                    {new Date(l.criado_em).toLocaleDateString("pt-BR", {
                      timeZone: FUSO,
                    })}{" "}
                    · {MOTIVOS[l.motivo as keyof typeof MOTIVOS]}
                    {l.obs && ` (${l.obs})`}
                  </span>
                  <span className={l.minutos > 0 ? "text-green" : "text-amber"}>
                    {l.minutos > 0 ? "+" : ""}
                    {l.minutos} min
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Pacote de horas: tempo de jogo comprado, desconta o tempo usado */}
      <Card>
        <CardHeader>
          <CardTitle>
            Pacote de horas · <span className="text-cyan">{duracao(Math.max(0, saldoPacote))} h</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <VenderPacote clienteId={c.id} pacotes={(pacotes.data ?? []).map((p) => ({ ...p, preco: Number(p.preco), pacote_minutos: p.pacote_minutos! }))} />
          <AjustarSaldo clienteId={c.id} tipo="pacote" atual={duracao(Math.max(0, saldoPacote))} />
          {lancPacote.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum pacote ainda.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {lancPacote.slice(0, 30).map((l) => (
                <li key={l.id} className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">
                    {dia(l.criado_em)} · {MOTIVOS_PACOTE[l.motivo as keyof typeof MOTIVOS_PACOTE]}
                    {l.obs && ` (${l.obs})`}
                  </span>
                  <span className={l.minutos > 0 ? "text-green" : "text-amber"}>
                    {l.minutos > 0 ? "+" : "−"}
                    {duracao(Math.abs(l.minutos))} h
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

const MOTIVOS_PACOTE = {
  compra: "📦 Compra",
  uso: "Usado",
  estorno: "Estorno",
  ajuste: "✏️ Ajuste",
};

const MOTIVOS = {
  bonus: "Bônus de compra",
  uso: "Usado no caixa",
  estorno: "Estorno",
  ajuste: "✏️ Ajuste",
  promocao: "🎁 Promoção",
};
