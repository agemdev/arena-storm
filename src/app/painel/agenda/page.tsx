import { Suspense } from "react";
import Link from "next/link";
import { exigirAdmin } from "@/lib/auth";
import { dataExtenso, hhmm, hojeISO, somarDias } from "@/lib/caixa";
import { janelaDoDia, SELECT_AGENDA, SITUACOES, TIPOS_AGENDA, type AgendaLinha } from "@/lib/agenda";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import LinhaClicavel from "../caixa/LinhaClicavel";
import LinhaDoTempo, { type Bloco } from "./LinhaDoTempo";
import DetalheAgenda from "./Detalhe";
import AoVivo from "@/components/painel/AoVivo";

export default function AgendaPage({ searchParams }: PageProps<"/painel/agenda">) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Carregando agenda...</p>}>
      <Agenda searchParams={searchParams} />
    </Suspense>
  );
}

const H = 3600_000;

async function Agenda({ searchParams }: { searchParams: PageProps<"/painel/agenda">["searchParams"] }) {
  const { supabase, arenaId } = await exigirAdmin();
  const { data: d, abrir, erro, lista: listaOcupadas } = await searchParams;
  const hoje = hojeISO();
  const data = typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : hoje;
  const abrirId = typeof abrir === "string" && /^[0-9a-f-]{36}$/.test(abrir) ? abrir : null;
  const base = data === hoje ? "/painel/agenda" : `/painel/agenda?data=${data}`;
  const comAbrir = `${base}${base.includes("?") ? "&" : "?"}abrir=`;
  const { de, ate } = janelaDoDia(data);

  const [ags, equips, clientes, planos, horario] = await Promise.all([
    supabase.from("agendamentos").select(SELECT_AGENDA).lt("inicio", ate).gt("fim", de).order("inicio"),
    supabase.from("equipamentos").select("id, nome").eq("ativo", true).order("ordem"),
    supabase.from("clientes").select("id, nome, whatsapp").order("nome").limit(5000),
    supabase.from("planos").select("id, categoria, nome, preco, descricao").eq("arena_id", arenaId).eq("ativo", true).order("ordem"),
    supabase
      .from("horarios")
      .select("fechado, abre, fecha")
      .eq("arena_id", arenaId)
      .eq("dia", new Date(`${data}T12:00:00Z`).getUTCDay())
      .maybeSingle(),
  ]);
  const lista = (ags.data ?? []) as unknown as AgendaLinha[];
  const equipamentos = equips.data ?? [];
  const festas = (planos.data ?? []).filter((p) => p.categoria === "festa").map((p) => ({ ...p, preco: Number(p.preco) }));
  const valorCorujao = Number((planos.data ?? []).find((p) => /coruj/i.test(p.nome))?.preco ?? 0);

  // Blocos da régua (cancelado e faltou não aparecem: a máquina ficou livre)
  const visiveis = lista.filter((a) => a.situacao !== "cancelado" && a.situacao !== "faltou");
  const blocos: Bloco[] = visiveis.flatMap((a) =>
    a.agendamento_maquinas.map((m) => ({ id: a.id, tipo: a.tipo, nome: a.nome, situacao: a.situacao, equipamento_id: m.equipamento_id, inicio: a.inicio, fim: a.fim })),
  );

  // Régua: horário de funcionamento do dia, aumentada para caber os agendamentos
  const h = horario.data;
  const abre = h && !h.fechado ? h.abre!.slice(0, 5) : "09:00";
  const fecha = h && !h.fechado ? h.fecha!.slice(0, 5) : "22:00";
  let ini = new Date(`${data}T${abre}:00-03:00`).getTime();
  let fim = new Date(`${fecha <= abre ? somarDias(data, 1) : data}T${fecha}:00-03:00`).getTime();
  for (const a of visiveis) {
    ini = Math.min(ini, new Date(a.inicio).getTime());
    fim = Math.max(fim, new Date(a.fim).getTime());
  }
  ini = Math.max(Math.floor(ini / H) * H, new Date(de).getTime());
  fim = Math.min(Math.ceil(fim / H) * H, new Date(ate).getTime());

  const nomeMaq = (id: string) => equipamentos.find((e) => e.id === id)?.nome ?? "?";
  const aviso =
    erro === "choque"
      ? "Não deu para reativar: alguma máquina já foi reservada por outra pessoa nesse horário. Edite as máquinas ou o horário."
      : erro === "ocupadas"
        ? `Estas máquinas ainda estão em uso no Caixa e ficaram de fora: ${typeof listaOcupadas === "string" ? listaOcupadas : ""}. Encerre-as no Caixa e tente de novo.`
        : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold">Agenda</h1>
        <div className="flex items-center gap-1">
          <Link href={`/painel/agenda?data=${somarDias(data, -1)}`} className="rounded-lg px-2 py-1 hover:bg-accent" aria-label="Dia anterior">
            ◀
          </Link>
          <form>
            <input type="date" name="data" defaultValue={data} className="rounded-lg border border-input bg-input/30 px-2 py-1 text-sm" aria-label="Escolher dia" />
            <button type="submit" className="ml-1 text-sm text-cyan">Ir</button>
          </form>
          <Link href={`/painel/agenda?data=${somarDias(data, 1)}`} className="rounded-lg px-2 py-1 hover:bg-accent" aria-label="Próximo dia">
            ▶
          </Link>
        </div>
        <span className="text-sm text-muted-foreground">{dataExtenso(data)}</span>
        {data !== hoje && (
          <Link href="/painel/agenda" className="text-sm text-cyan hover:underline">
            Voltar para hoje
          </Link>
        )}
      </div>

      <LinhaDoTempo
        data={data}
        de={ini}
        ate={fim}
        equipamentos={equipamentos}
        blocos={blocos}
        abrirHref={comAbrir}
        clientes={clientes.data ?? []}
        festas={festas}
        valorCorujao={valorCorujao}
      />

      {/* Lista do dia */}
      <Card>
        <CardContent className="pt-2">
          {lista.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">Nenhum agendamento neste dia.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Horário</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Máquinas</TableHead>
                  <TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((a) => (
                  <LinhaClicavel key={a.id} href={comAbrir + a.id} className={a.situacao === "cancelado" || a.situacao === "faltou" ? "opacity-50" : ""}>
                    <TableCell className="whitespace-nowrap">
                      {hhmm(a.inicio)} → {hhmm(a.fim)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {TIPOS_AGENDA[a.tipo].icone} {TIPOS_AGENDA[a.tipo].nome}
                    </TableCell>
                    <TableCell className="font-medium">{a.nome}</TableCell>
                    <TableCell className="max-w-60 truncate text-muted-foreground">{a.agendamento_maquinas.map((m) => nomeMaq(m.equipamento_id)).join(", ")}</TableCell>
                    <TableCell>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SITUACOES[a.situacao].cor}`}>{SITUACOES[a.situacao].nome}</span>
                    </TableCell>
                  </LinhaClicavel>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AoVivo />

      {abrirId && (
        <Suspense fallback={null}>
          <DetalheAgenda
            key={abrirId}
            id={abrirId}
            fecharHref={base}
            aviso={aviso}
            clientes={clientes.data ?? []}
            equipamentos={equipamentos}
            festas={festas}
            valorCorujao={valorCorujao}
            reservas={blocos.filter((b) => b.situacao !== "realizado")}
          />
        </Suspense>
      )}
    </div>
  );
}
