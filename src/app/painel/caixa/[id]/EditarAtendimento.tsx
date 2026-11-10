"use client";

import { useActionState, useState } from "react";
import { salvarAtendimento } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, Textarea } from "@/components/ui/native-select";
import { calcularUso, duracao, DURACOES, lerValor, paraTimestamp, somarMinutosHora, type ComSaldo } from "@/lib/caixa";
import UsarMinutos from "@/components/painel/UsarMinutos";
import { reais } from "@/lib/formatos";

type Props = {
  id: string;
  data: string;
  nome: string;
  modo: string; // id da máquina, "livre" ou "" (só consumo)
  emUso: boolean;
  inicio: string; // "14:15"
  fimPrevisto: string;
  fim: string;
  valorHora: string;
  observacao: string;
  equipamentos: { id: string; nome: string }[];
  minutosDe: string;
  clienteId: string | null;
  comSaldo: ComSaldo[];
};

// Corrigir dados a qualquer momento (mesmo em uso). O valor do uso é recalculado pelos horários.
export default function EditarAtendimento(p: Props) {
  const [res, acao, enviando] = useActionState(salvarAtendimento, null);
  const [modo, setModo] = useState(p.modo);
  const [ini, setIni] = useState(p.inicio);
  const [prev, setPrev] = useState(p.fimPrevisto);
  const [fim, setFim] = useState(p.fim);
  const [vh, setVh] = useState(p.valorHora);
  const [minDe, setMinDe] = useState(p.minutosDe);
  const comTempo = modo !== "";
  const encerrado = !p.emUso && !!p.fim;

  // Prévia do valor quando já está encerrado
  let previa: string | null = null;
  if (comTempo && encerrado && ini && fim) {
    const tIni = paraTimestamp(p.data, ini);
    const r = calcularUso(tIni, paraTimestamp(p.data, fim, tIni), lerValor(vh) || 0);
    previa = `${duracao(r.minutos)} · ${reais(r.valor)}`;
  }

  return (
    <form action={acao} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <input type="hidden" name="id" value={p.id} />
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="e-nome">Nome</Label>
        <Input id="e-nome" name="nome" defaultValue={p.nome} required />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="e-equip">Máquina</Label>
        <NativeSelect id="e-equip" name="equipamento_id" value={modo} onChange={(e) => setModo(e.target.value)}>
          <option value="livre">Livre (qualquer máquina)</option>
          {p.equipamentos.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome}
            </option>
          ))}
          <option value="">Só consumo (sem tempo)</option>
        </NativeSelect>
      </div>

      {comTempo && (
        <>
          <div className="space-y-2">
            <Label htmlFor="e-ini">Início</Label>
            <Input id="e-ini" name="inicio" type="time" value={ini} required onChange={(e) => setIni(e.target.value)} />
          </div>
          {encerrado ? (
            <div className="space-y-2">
              <Label htmlFor="e-fim">Fim</Label>
              <Input id="e-fim" name="fim" type="time" value={fim} required onChange={(e) => setFim(e.target.value)} />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="e-prev">Fim previsto</Label>
              <Input id="e-prev" name="fim_previsto" type="time" value={prev} onChange={(e) => setPrev(e.target.value)} title="Vazio = tempo livre" />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="e-vh">R$ / hora</Label>
            <Input id="e-vh" name="valor_hora" inputMode="decimal" value={vh} onChange={(e) => setVh(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Valor do uso</Label>
            <p className="flex h-8 items-center text-sm text-muted-foreground">{previa ?? "calculado ao encerrar"}</p>
          </div>
          {!encerrado && (
            <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-4">
              <span className="text-xs text-muted-foreground">Fim a partir do início:</span>
              {DURACOES.map((d) => (
                <button
                  key={d.min}
                  type="button"
                  onClick={() => setPrev(somarMinutosHora(ini, d.min))}
                  className="rounded-full border border-border px-3 py-1 text-xs hover:bg-accent"
                >
                  {d.label}
                </button>
              ))}
              <button type="button" onClick={() => setPrev("")} className="rounded-full border border-border px-3 py-1 text-xs hover:bg-accent">
                Livre
              </button>
            </div>
          )}
        </>
      )}

      {comTempo && (
        <div className="space-y-2 sm:col-span-2 lg:col-span-4">
          <Label htmlFor="e-min">Pagar com minutos de</Label>
          <UsarMinutos id="e-min" comSaldo={p.comSaldo} name="minutos_de" value={minDe} onChange={setMinDe} primeiro={p.clienteId} />
          <p className="text-xs text-muted-foreground">
            {encerrado ? "Já encerrado: para cobrar agora, use Receber → Minutos." : "Ao encerrar, desconta sozinho até o saldo dar."}
          </p>
        </div>
      )}
      <div className="space-y-2 sm:col-span-2 lg:col-span-4">
        <Label htmlFor="e-obs">Observação</Label>
        <Textarea id="e-obs" name="observacao" rows={2} maxLength={300} defaultValue={p.observacao} />
      </div>
      <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-4">
        <Button type="submit" variant="outline" disabled={enviando}>
          {enviando ? "Salvando..." : "Salvar alterações"}
        </Button>
        {res && <p className={`text-sm ${res.ok ? "text-green" : "text-destructive"}`}>{res.msg}</p>}
      </div>
    </form>
  );
}
