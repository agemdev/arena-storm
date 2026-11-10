import { Suspense } from "react";
import Link from "next/link";
import { exigirAdmin } from "@/lib/auth";
import { reais } from "@/lib/formatos";
import { hhmm, hojeISO, SELECT_ATENDIMENTO, totais, type AtendimentoLinha } from "@/lib/caixa";
import { janelaDoDia, SELECT_AGENDA, SITUACOES, TIPOS_AGENDA, type AgendaLinha } from "@/lib/agenda";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AoVivo from "@/components/painel/AoVivo";

// Início do painel
export default function PainelInicio() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Carregando...</p>}>
      <Resumo />
    </Suspense>
  );
}

async function Resumo() {
  const { supabase, arenaNome } = await exigirAdmin();
  const dia = janelaDoDia(hojeISO());
  const [clientes, hoje, agenda] = await Promise.all([
    supabase.from("clientes").select("id", { count: "exact", head: true }),
    supabase.from("atendimentos").select(SELECT_ATENDIMENTO).eq("data", hojeISO()),
    supabase.from("agendamentos").select(SELECT_AGENDA).lt("inicio", dia.ate).gt("fim", dia.de).in("situacao", ["agendado", "confirmado"]).order("inicio"),
  ]);
  const agendaHoje = (agenda.data ?? []) as unknown as AgendaLinha[];
  const lista = ((hoje.data ?? []) as unknown as AtendimentoLinha[]).map(totais);
  const totalHoje = lista.reduce((s, t) => s + t.total, 0);
  const emUso = lista.filter((t) => t.emUso).length;
  const aReceber = lista.reduce((s, t) => s + Math.max(0, t.falta), 0);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">{arenaNome}</h1>
      <AoVivo />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Cartao href="/painel/caixa" titulo="Caixa de hoje" valor={reais(totalHoje)} />
        <Cartao href="/painel/caixa" titulo="Máquinas em uso" valor={String(emUso)} />
        <Cartao href="/painel/caixa" titulo="A receber hoje" valor={reais(aReceber)} />
        <Cartao href="/painel/clientes" titulo="Clientes cadastrados" valor={String(clientes.count ?? 0)} />
      </div>

      {/* Agenda de hoje (o que ainda vai acontecer) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Agenda de hoje</CardTitle>
          <Link href="/painel/agenda" className="text-sm text-cyan hover:underline">
            Abrir agenda
          </Link>
        </CardHeader>
        <CardContent>
          {agendaHoje.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nada agendado para hoje.</p>
          ) : (
            <ul className="divide-y divide-border">
              {agendaHoje.map((a) => (
                <li key={a.id}>
                  <Link href={`/painel/agenda?abrir=${a.id}`} className="flex flex-wrap items-center gap-3 py-2 text-sm hover:text-cyan">
                    <b className="w-28">
                      {hhmm(a.inicio)} → {hhmm(a.fim)}
                    </b>
                    <span>
                      {TIPOS_AGENDA[a.tipo].icone} {a.nome}
                    </span>
                    <span className="text-muted-foreground">· {a.agendamento_maquinas.length} máquina(s)</span>
                    <span className={`ml-auto rounded-full px-2 py-0.5 text-xs ${SITUACOES[a.situacao].cor}`}>{SITUACOES[a.situacao].nome}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Cartao({ href, titulo, valor }: { href: string; titulo: string; valor: string }) {
  return (
    <Link href={href}>
      <Card className="transition hover:bg-card-hover">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">{titulo}</CardTitle>
        </CardHeader>
        <CardContent className="font-display text-3xl font-bold text-cyan">{valor}</CardContent>
      </Card>
    </Link>
  );
}
