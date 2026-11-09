"use client";

import { useActionState, useState } from "react";
import { salvarAtendimento } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, Textarea } from "@/components/ui/native-select";
import { calcularUso, duracao, lerValor, paraTimestamp } from "@/lib/caixa";

type Props = {
  id: string;
  data: string;
  nome: string;
  equipamentoId: string;
  inicio: string; // "14:15"
  fim: string;
  valorHora: string;
  valorUso: string;
  observacao: string;
  equipamentos: { id: string; nome: string }[];
};

// Corrigir horários/valores. O valor do uso recalcula sozinho ao mudar os horários.
export default function EditarAtendimento(p: Props) {
  const [res, acao, enviando] = useActionState(salvarAtendimento, null);
  const [equip, setEquip] = useState(p.equipamentoId);
  const [ini, setIni] = useState(p.inicio);
  const [fim, setFim] = useState(p.fim);
  const [vh, setVh] = useState(p.valorHora);
  const [valor, setValor] = useState(p.valorUso);

  const recalcular = (i: string, f: string, h: string) => {
    if (!i || !f) return;
    const tIni = paraTimestamp(p.data, i);
    const r = calcularUso(tIni, paraTimestamp(p.data, f, tIni), lerValor(h) || 0);
    setValor(String(r.valor).replace(".", ","));
  };
  const tempo =
    ini && fim ? duracao(calcularUso(paraTimestamp(p.data, ini), paraTimestamp(p.data, fim, paraTimestamp(p.data, ini)), 0).minutos) : null;

  return (
    <form action={acao} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <input type="hidden" name="id" value={p.id} />
      <div className="space-y-2">
        <Label htmlFor="e-nome">Nome</Label>
        <Input id="e-nome" name="nome" defaultValue={p.nome} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="e-equip">Máquina</Label>
        <NativeSelect id="e-equip" name="equipamento_id" value={equip} onChange={(e) => setEquip(e.target.value)}>
          <option value="">Só consumo (sem máquina)</option>
          {p.equipamentos.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome}
            </option>
          ))}
        </NativeSelect>
      </div>
      {equip && (
        <>
          <div className="space-y-2">
            <Label htmlFor="e-vh">R$ / hora</Label>
            <Input
              id="e-vh"
              name="valor_hora"
              inputMode="decimal"
              value={vh}
              onChange={(e) => {
                setVh(e.target.value);
                recalcular(ini, fim, e.target.value);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="e-ini">Início</Label>
            <Input
              id="e-ini"
              name="inicio"
              type="time"
              value={ini}
              required
              onChange={(e) => {
                setIni(e.target.value);
                recalcular(e.target.value, fim, vh);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="e-fim">Fim {!fim && <span className="text-muted-foreground">(em uso)</span>}</Label>
            <Input
              id="e-fim"
              name="fim"
              type="time"
              value={fim}
              onChange={(e) => {
                setFim(e.target.value);
                recalcular(ini, e.target.value, vh);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="e-valor">Valor do uso (R$) {tempo && <span className="text-muted-foreground">· {tempo}</span>}</Label>
            <Input
              id="e-valor"
              name="valor_uso"
              inputMode="decimal"
              value={valor}
              disabled={!fim}
              onChange={(e) => setValor(e.target.value)}
            />
          </div>
        </>
      )}
      <div className="space-y-2 sm:col-span-2 lg:col-span-3">
        <Label htmlFor="e-obs">Observação</Label>
        <Textarea id="e-obs" name="observacao" rows={2} maxLength={300} defaultValue={p.observacao} />
      </div>
      <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-3">
        <Button type="submit" variant="outline" disabled={enviando}>
          {enviando ? "Salvando..." : "Salvar alterações"}
        </Button>
        {res && <p className={`text-sm ${res.ok ? "text-green" : "text-destructive"}`}>{res.msg}</p>}
      </div>
    </form>
  );
}
