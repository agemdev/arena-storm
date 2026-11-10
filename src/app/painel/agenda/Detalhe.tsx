import { exigirAdmin } from "@/lib/auth";
import { reais } from "@/lib/formatos";
import { hhmm, dataExtenso } from "@/lib/caixa";
import { diaDaAgenda, SELECT_AGENDA, SITUACOES, TIPOS_AGENDA, type AgendaLinha } from "@/lib/agenda";
import { formatarWhats } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";
import Janela from "@/components/painel/Janela";
import type { ClienteOpcao } from "@/components/painel/BuscaCliente";
import { excluirAgendamento, iniciarNoCaixa, mudarSituacao } from "./actions";
import FormAgendamento, { type Festa, type ReservaDia } from "./FormAgendamento";

type Props = {
  id: string;
  fecharHref: string;
  aviso?: string | null;
  clientes: ClienteOpcao[];
  equipamentos: { id: string; nome: string }[];
  festas: Festa[];
  valorCorujao: number;
  reservas: ReservaDia[];
};

// Janela de um agendamento: dados, situação, iniciar no Caixa, editar
export default async function DetalheAgenda({ id, fecharHref, aviso, clientes, equipamentos, festas, valorCorujao, reservas }: Props) {
  const { supabase } = await exigirAdmin();
  const { data } = await supabase.from("agendamentos").select(SELECT_AGENDA).eq("id", id).maybeSingle();
  if (!data)
    return (
      <Janela fecharHref={fecharHref} titulo={<h2 className="font-display text-xl font-bold">Agendamento não encontrado</h2>}>
        <p className="text-muted-foreground">Ele pode ter sido excluído.</p>
      </Janela>
    );

  const a = data as unknown as AgendaLinha;
  const tipo = TIPOS_AGENDA[a.tipo];
  const ativo = a.situacao === "agendado" || a.situacao === "confirmado";
  const nomesMaq = a.agendamento_maquinas.map((m) => equipamentos.find((e) => e.id === m.equipamento_id)?.nome ?? "?");
  const cliente = clientes.find((c) => c.id === a.cliente_id) ?? null;

  const situacao = (s: keyof typeof SITUACOES, rotulo: string, variante: "outline" | "ghost" | "destructive" = "outline") => (
    <form action={mudarSituacao}>
      <input type="hidden" name="id" value={a.id} />
      <input type="hidden" name="situacao" value={s} />
      <Button type="submit" variant={variante}>
        {rotulo}
      </Button>
    </form>
  );

  const titulo = (
    <div className="flex flex-wrap items-center gap-3">
      <span className={`rounded-full border px-2 py-0.5 text-sm font-semibold ${tipo.cor}`}>
        {tipo.icone} {tipo.nome}
      </span>
      <h2 className="font-display text-2xl font-bold">{a.nome}</h2>
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SITUACOES[a.situacao].cor}`}>{SITUACOES[a.situacao].nome}</span>
    </div>
  );

  return (
    <Janela key={a.id} fecharHref={fecharHref} titulo={titulo} largura="max-w-3xl">
      <div className="space-y-5">
        {aviso && <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{aviso}</p>}

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <Item rotulo="Quando">
            {dataExtenso(diaDaAgenda(a.inicio))} · <b>{hhmm(a.inicio)} → {hhmm(a.fim)}</b>
          </Item>
          <Item rotulo={`Máquinas (${nomesMaq.length})`}>{nomesMaq.join(", ")}</Item>
          <Item rotulo="WhatsApp">
            {a.whatsapp ? (
              <a href={`https://wa.me/${a.whatsapp}`} target="_blank" rel="noopener noreferrer" className="text-green hover:underline">
                {formatarWhats(a.whatsapp)}
              </a>
            ) : (
              "—"
            )}
            {cliente && <span className="ml-2 rounded-full bg-green/15 px-2 py-0.5 text-xs text-green">Cliente cadastrado</span>}
          </Item>
          <Item rotulo="Valor combinado">{Number(a.valor) > 0 ? reais(Number(a.valor)) : "—"}</Item>
          {a.observacao && (
            <div className="sm:col-span-2">
              <Item rotulo="Observação">{a.observacao}</Item>
            </div>
          )}
        </dl>

        {/* Ações */}
        <div className="flex flex-wrap gap-2">
          {ativo && (
            <form action={iniciarNoCaixa}>
              <input type="hidden" name="id" value={a.id} />
              <Button type="submit">▶ Cliente chegou: iniciar no Caixa</Button>
            </form>
          )}
          {a.situacao === "agendado" && situacao("confirmado", "✓ Confirmar")}
          {ativo && situacao("faltou", "Faltou", "ghost")}
          {ativo && situacao("cancelado", "Cancelar", "destructive")}
          {(a.situacao === "cancelado" || a.situacao === "faltou") && situacao("agendado", "Reativar")}
        </div>
        {ativo && (
          <p className="text-xs text-muted-foreground">
            “Iniciar no Caixa” abre um atendimento por máquina, com o fim às {hhmm(a.fim)}.{" "}
            {a.tipo !== "reserva" && Number(a.valor) > 0 ? `O valor de ${reais(Number(a.valor))} entra como pacote.` : "Cobra por hora normalmente."}
          </p>
        )}

        {/* Editar */}
        {a.situacao !== "realizado" && (
          <details className="rounded-xl border border-border p-4">
            <summary className="cursor-pointer font-semibold">Editar agendamento</summary>
            <div className="mt-4">
              <FormAgendamento
                inicial={{
                  id: a.id,
                  tipo: a.tipo,
                  nome: a.nome,
                  cliente,
                  whatsapp: a.whatsapp?.replace(/^55/, "") ?? "",
                  data: diaDaAgenda(a.inicio),
                  inicio: hhmm(a.inicio),
                  fim: hhmm(a.fim),
                  valor: String(a.valor).replace(".", ","),
                  plano_id: a.plano_id ?? "",
                  observacao: a.observacao ?? "",
                  maquinas: a.agendamento_maquinas.map((m) => m.equipamento_id),
                }}
                clientes={clientes}
                equipamentos={equipamentos}
                festas={festas}
                valorCorujao={valorCorujao}
                reservas={reservas}
              />
            </div>
          </details>
        )}

        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">Excluir (lançado por engano)</summary>
          <form action={excluirAgendamento} className="mt-2 space-y-2 rounded-lg border border-destructive/30 p-3">
            <input type="hidden" name="id" value={a.id} />
            <p className="text-muted-foreground">Apaga de vez, sem histórico. Para manter o registro, use “Cancelar”.</p>
            <Button type="submit" variant="destructive" size="sm">
              Excluir de vez
            </Button>
          </form>
        </details>
      </div>
    </Janela>
  );
}

function Item({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{rotulo}</dt>
      <dd>{children}</dd>
    </div>
  );
}
