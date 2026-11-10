"use client";

import { useActionState, useEffect, useState } from "react";
import { salvarAgendamento } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, Textarea } from "@/components/ui/native-select";
import BuscaCliente, { type ClienteOpcao } from "@/components/painel/BuscaCliente";
import CampoMascara from "@/components/painel/CampoMascara";
import { CORUJAO, TIPOS_AGENDA, type TipoAgenda } from "@/lib/agenda";
import { DURACOES, paraTimestamp, somarMinutosHora } from "@/lib/caixa";
import { reais } from "@/lib/formatos";

export type Festa = { id: string; nome: string; preco: number; descricao: string | null };
export type ReservaDia = { id: string; equipamento_id: string; inicio: string; fim: string };
export type Inicial = {
  id?: string;
  tipo: TipoAgenda;
  nome: string;
  cliente: ClienteOpcao | null;
  whatsapp: string;
  data: string;
  inicio: string; // "20:00"
  fim: string;
  valor: string;
  plano_id: string;
  observacao: string;
  maquinas: string[];
};

type Props = {
  inicial: Inicial;
  clientes: ClienteOpcao[];
  equipamentos: { id: string; nome: string }[];
  festas: Festa[];
  valorCorujao: number;
  reservas: ReservaDia[];
  onSalvo?: () => void;
};

// Mesmo cálculo do servidor: antes das 6h = madrugada do dia seguinte
function intervalo(data: string, ini: string, fim: string) {
  let i = paraTimestamp(data, ini);
  if (ini < "06:00") i = paraTimestamp(data, ini, paraTimestamp(data, "23:59"));
  return [new Date(i).getTime(), new Date(paraTimestamp(data, fim, i)).getTime()];
}

// Formulário de novo agendamento / edição
export default function FormAgendamento({ inicial, clientes, equipamentos, festas, valorCorujao, reservas, onSalvo }: Props) {
  const [res, acao, enviando] = useActionState(salvarAgendamento, null);
  const [tipo, setTipo] = useState<TipoAgenda>(inicial.tipo);
  const [data, setData] = useState(inicial.data);
  const [ini, setIni] = useState(inicial.inicio);
  const [fim, setFim] = useState(inicial.fim);
  const [valor, setValor] = useState(inicial.valor);
  const [planoId, setPlanoId] = useState(inicial.plano_id);
  const [maquinas, setMaquinas] = useState<Set<string>>(new Set(inicial.maquinas));
  const [whats, setWhats] = useState({ chave: "i", valor: inicial.whatsapp });

  useEffect(() => {
    if (res?.ok) onSalvo?.();
  }, [res, onSalvo]);

  // Máquinas que já têm outra reserva nesse horário
  const ocupadas = new Set<string>();
  if (ini && fim && ini !== fim) {
    const [a, b] = intervalo(data, ini, fim);
    for (const r of reservas) {
      if (r.id === inicial.id) continue;
      if (new Date(r.inicio).getTime() < b && new Date(r.fim).getTime() > a) ocupadas.add(r.equipamento_id);
    }
  }

  const trocarTipo = (t: TipoAgenda) => {
    setTipo(t);
    if (t === "corujao") {
      setIni(CORUJAO.inicio);
      setFim(CORUJAO.fim);
      if (!valor || valor === "0") setValor(String(valorCorujao).replace(".", ","));
    }
  };

  const escolherFesta = (id: string) => {
    setPlanoId(id);
    const f = festas.find((x) => x.id === id);
    if (!f) return;
    setValor(String(f.preco).replace(".", ","));
    const horas = Number(f.descricao?.match(/(\d+)\s*hora/)?.[1]);
    if (horas && ini) setFim(somarMinutosHora(ini, horas * 60));
  };

  const alternar = (id: string) =>
    setMaquinas((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const livres = equipamentos.filter((e) => !ocupadas.has(e.id));

  return (
    <form action={acao} className="grid gap-4 sm:grid-cols-6">
      {inicial.id && <input type="hidden" name="id" value={inicial.id} />}
      <input type="hidden" name="tipo" value={tipo} />
      {[...maquinas].map((m) => (
        <input key={m} type="hidden" name="maquinas" value={m} />
      ))}

      {/* Tipo */}
      <div className="flex flex-wrap gap-2 sm:col-span-6">
        {(Object.keys(TIPOS_AGENDA) as TipoAgenda[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => trocarTipo(t)}
            className={`rounded-xl border px-3 py-2 text-sm font-semibold ${t === tipo ? TIPOS_AGENDA[t].cor : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            {TIPOS_AGENDA[t].icone} {TIPOS_AGENDA[t].nome}
          </button>
        ))}
      </div>

      <div className="sm:col-span-4">
        {tipo === "campeonato" ? (
          <div className="space-y-2">
            <Label htmlFor="ag-nome">Nome do campeonato</Label>
            <Input id="ag-nome" name="nome" defaultValue={inicial.nome} placeholder="Ex.: Copa FIFA Storm" required />
          </div>
        ) : (
          <BuscaCliente
            clientes={clientes}
            nomeInicial={inicial.nome}
            clienteInicial={inicial.cliente}
            onEscolher={(c) => c && setWhats({ chave: c.id, valor: c.whatsapp.replace(/^55(?=\d{10,11}$)/, "") })}
          />
        )}
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="ag-whats">WhatsApp</Label>
        <CampoMascara key={whats.chave} id="ag-whats" name="whatsapp" tipo="telefone" valorInicial={whats.valor} />
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="ag-data">Dia</Label>
        <Input id="ag-data" name="data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="ag-ini">Início</Label>
        <Input id="ag-ini" name="inicio" type="time" value={ini} onChange={(e) => setIni(e.target.value)} required />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="ag-fim">Fim</Label>
        <Input id="ag-fim" name="fim" type="time" value={fim} onChange={(e) => setFim(e.target.value)} required />
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:col-span-6">
        <span className="text-xs text-muted-foreground">Quanto tempo?</span>
        {DURACOES.map((d) => (
          <button key={d.min} type="button" onClick={() => setFim(somarMinutosHora(ini, d.min))} className="rounded-full border border-border px-3 py-1 text-xs hover:bg-accent">
            {d.label}
          </button>
        ))}
        <span className="text-xs text-muted-foreground">· Antes das 6h conta como madrugada do dia seguinte.</span>
      </div>

      {/* Máquinas */}
      <div className="space-y-2 sm:col-span-6">
        <div className="flex flex-wrap items-center gap-3">
          <Label>Máquinas ({maquinas.size})</Label>
          <button type="button" onClick={() => setMaquinas(new Set(livres.map((e) => e.id)))} className="text-xs text-cyan hover:underline">
            Todas livres
          </button>
          <button type="button" onClick={() => setMaquinas(new Set())} className="text-xs text-muted-foreground hover:underline">
            Limpar
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {equipamentos.map((e) => {
            const sel = maquinas.has(e.id);
            const ocup = ocupadas.has(e.id);
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => alternar(e.id)}
                disabled={ocup && !sel}
                className={`rounded-lg border px-2 py-2 text-sm ${
                  sel ? (ocup ? "border-destructive bg-destructive/15 text-destructive" : "border-cyan bg-cyan/15 text-cyan") : "border-border hover:bg-accent"
                } disabled:opacity-35`}
                title={ocup ? "Já reservada nesse horário" : undefined}
              >
                {e.nome}
                {ocup && <span className="block text-[10px]">reservada</span>}
              </button>
            );
          })}
        </div>
      </div>

      {tipo === "aniversario" && festas.length > 0 && (
        <div className="space-y-2 sm:col-span-3">
          <Label htmlFor="ag-festa">Pacote de festa</Label>
          <NativeSelect id="ag-festa" name="plano_id" value={planoId} onChange={(e) => escolherFesta(e.target.value)}>
            <option value="">Escolha...</option>
            {festas.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome} · {reais(f.preco)}
                {f.descricao ? ` · ${f.descricao}` : ""}
              </option>
            ))}
          </NativeSelect>
        </div>
      )}
      <div className="space-y-2 sm:col-span-3">
        <Label htmlFor="ag-valor">Valor combinado (R$)</Label>
        <Input id="ag-valor" name="valor" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0" />
        <p className="text-xs text-muted-foreground">
          {tipo === "reserva" ? "Reserva: no Caixa cobra por hora normalmente." : "Ao iniciar no Caixa, vira um pacote com este valor."}
        </p>
      </div>

      <div className="space-y-2 sm:col-span-6">
        <Label htmlFor="ag-obs">Observação</Label>
        <Textarea id="ag-obs" name="observacao" rows={2} maxLength={500} defaultValue={inicial.observacao} placeholder="Ex.: sinal de R$ 50 pago no Pix" />
      </div>

      <div className="flex items-center gap-3 sm:col-span-6">
        <Button type="submit" disabled={enviando}>
          {enviando ? "Salvando..." : inicial.id ? "Salvar alterações" : "Agendar"}
        </Button>
        {res && !res.ok && <p className="text-sm text-destructive">{res.msg}</p>}
      </div>
    </form>
  );
}
