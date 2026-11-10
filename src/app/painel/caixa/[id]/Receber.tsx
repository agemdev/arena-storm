"use client";

import { useActionState, useState } from "react";
import { receber } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import UsarMinutos from "@/components/painel/UsarMinutos";
import { FORMAS, type ComSaldo, type Forma } from "@/lib/caixa";

type Props = {
  atendimentoId: string;
  falta: number;
  clienteId: string | null;
  minutosDe: string | null;
  comSaldo: ComSaldo[];
  pacoteDe: string | null;
  comPacote: ComSaldo[];
  valorHora: number;
};

// Botões de forma de pagamento + valor (já vem com o que falta)
export default function Receber({ atendimentoId, falta, clienteId, minutosDe, comSaldo, pacoteDe, comPacote, valorHora }: Props) {
  const [res, acao, enviando] = useActionState(receber, null);
  const [forma, setForma] = useState<Forma | "">("");
  // Minutos: sai do escolhido no atendimento, senão do próprio cliente (se tiver saldo)
  const padrao = minutosDe ?? (comSaldo.some((c) => c.id === clienteId) ? clienteId! : "");
  const padraoPac = pacoteDe ?? (comPacote.some((c) => c.id === clienteId) ? clienteId! : "");
  const [pagador, setPagador] = useState(padrao);
  const [pagadorPac, setPagadorPac] = useState(padraoPac);
  const saldo = comSaldo.find((c) => c.id === pagador)?.saldo ?? 0;
  const saldoPac = comPacote.find((c) => c.id === pagadorPac)?.saldo ?? 0; // minutos de jogo
  const valorPac = Math.floor(((saldoPac * valorHora) / 60) * 100) / 100; // quanto o pacote cobre em R$
  const sugestaoMin =
    forma === "minutos" && pagador ? Math.min(falta, saldo) : forma === "pacote" && pagadorPac ? Math.min(falta, valorPac) : falta;
  const quem = forma === "pacote" ? pagadorPac : pagador;
  const sugestao = sugestaoMin > 0 ? sugestaoMin.toFixed(2).replace(".", ",") : "";

  return (
    <form key={res?.ok ? `${res.msg}${falta}` : "f"} action={acao} className="space-y-3">
      <input type="hidden" name="atendimento_id" value={atendimentoId} />
      <input type="hidden" name="forma" value={forma} />
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(FORMAS) as Forma[]).map((f) => {
          const bloqueado = (f === "minutos" && comSaldo.length === 0) || (f === "pacote" && (comPacote.length === 0 || !(valorHora > 0)));
          return (
            <button
              key={f}
              type="button"
              disabled={bloqueado}
              title={bloqueado ? (f === "pacote" ? "Ninguém com pacote de horas (ou atendimento sem tempo)" : "Nenhum cliente com saldo de minutos") : undefined}
              onClick={() => setForma(f)}
              className={`rounded-xl border px-3 py-3 text-sm font-semibold transition disabled:opacity-40 ${
                forma === f ? "border-purple bg-primary/20 text-purple" : "border-border hover:bg-accent"
              }`}
            >
              {FORMAS[f]}
            </button>
          );
        })}
      </div>
      {forma === "minutos" && (
        <div className="space-y-1">
          <label htmlFor={`pagador-${atendimentoId}`} className="text-xs text-muted-foreground">
            Minutos de quem? (pode ser outro cliente: amigo, promoção...)
          </label>
          <UsarMinutos
            id={`pagador-${atendimentoId}`}
            comSaldo={comSaldo}
            name="cliente_minutos_id"
            value={pagador}
            onChange={setPagador}
            primeiro={clienteId}
            vazio="Escolha o cliente..."
          />
        </div>
      )}
      {forma === "pacote" && (
        <div className="space-y-1">
          <label htmlFor={`pac-${atendimentoId}`} className="text-xs text-muted-foreground">
            Pacote de quem?
          </label>
          <UsarMinutos
            id={`pac-${atendimentoId}`}
            comSaldo={comPacote}
            name="cliente_minutos_id"
            value={pagadorPac}
            onChange={setPagadorPac}
            primeiro={clienteId}
            vazio="Escolha o cliente..."
            horas
          />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Input key={`${forma}${quem}`} name="valor" inputMode="decimal" defaultValue={sugestao} placeholder="Valor" aria-label="Valor recebido" className="w-32" />
        <Button type="submit" disabled={enviando || !forma || ((forma === "minutos" || forma === "pacote") && !quem)}>
          {enviando ? "Registrando..." : "Receber"}
        </Button>
        {!forma && <span className="text-xs text-muted-foreground">Escolha a forma de pagamento</span>}
      </div>
      {forma === "pacote" && (
        <p className="text-xs text-muted-foreground">
          Desconta do pacote o tempo equivalente ao valor ({valorHora.toFixed(2).replace(".", ",")}/hora). Saldo: {Math.floor(saldoPac / 60)}:
          {String(saldoPac % 60).padStart(2, "0")} h.
        </p>
      )}
      {forma === "minutos" && <p className="text-xs text-muted-foreground">R$ 1 = 1 minuto. Desconta do saldo de quem foi escolhido ({saldo} min).</p>}
      {res && <p className={`text-sm ${res.ok ? "text-green" : "text-destructive"}`}>{res.msg}</p>}
    </form>
  );
}
