"use client";

import { useActionState, useState } from "react";
import { receber } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import UsarMinutos from "@/components/painel/UsarMinutos";
import { FORMAS, lerValor, type ComSaldo, type Forma } from "@/lib/caixa";
import { reais } from "@/lib/formatos";

type Props = {
  atendimentoId: string;
  falta: number;
  clienteId: string | null;
  minutosDe: string | null;
  comSaldo: ComSaldo[];
  pacoteDe: string | null;
  comPacote: ComSaldo[];
  valorHora: number;
  tempoAPagar: number; // R$ do tempo de jogo ainda em aberto (minutos/pacote só pagam isso)
};

// Botões de forma de pagamento + valor (já vem com o que falta)
export default function Receber({
  atendimentoId,
  falta,
  clienteId,
  minutosDe,
  comSaldo,
  pacoteDe,
  comPacote,
  valorHora,
  tempoAPagar,
}: Props) {
  const [res, acao, enviando] = useActionState(receber, null);
  const [forma, setForma] = useState<Forma | "">("");
  // Minutos: sai do escolhido no atendimento, senão do próprio cliente (se tiver saldo)
  const padrao =
    minutosDe ?? (comSaldo.some((c) => c.id === clienteId) ? clienteId! : "");
  const padraoPac =
    pacoteDe ?? (comPacote.some((c) => c.id === clienteId) ? clienteId! : "");
  const [pagador, setPagador] = useState(padrao);
  const [pagadorPac, setPagadorPac] = useState(padraoPac);
  const saldo = comSaldo.find((c) => c.id === pagador)?.saldo ?? 0;
  const saldoPac = comPacote.find((c) => c.id === pagadorPac)?.saldo ?? 0; // minutos de jogo
  const valorPac = Math.floor(((saldoPac * valorHora) / 60) * 100) / 100; // quanto o pacote cobre em R$
  const sugestaoMin =
    forma === "minutos" && pagador
      ? Math.min(falta, saldo)
      : forma === "pacote" && pagadorPac
        ? Math.min(tempoAPagar, valorPac)
        : falta;
  const quem = forma === "pacote" ? pagadorPac : pagador;
  const sugestao =
    sugestaoMin > 0 ? sugestaoMin.toFixed(2).replace(".", ",") : "";
  const [resto, setResto] = useState(""); // dividir: o que faltar vai nesta forma
  // O que a pessoa digitou (null = usa a sugestão). Em "Minutos" digita MINUTOS (R$ 1 = 1 min).
  const [digitado, setDigitado] = useState<string | null>(null);
  const escolherForma = (f: Forma) => {
    setForma(f);
    setDigitado(null);
  };
  // 1 min de saldo = 1 min de jogo (vale preço/hora ÷ 60)
  const valorMinuto = valorHora > 0 ? valorHora / 60 : 0;
  const minutosDoTempo = valorMinuto > 0 ? Math.ceil(tempoAPagar / valorMinuto - 0.0001) : 0;
  const minutosSugeridos = Math.max(0, Math.min(minutosDoTempo, saldo));
  const minutosUsar =
    forma === "minutos"
      ? digitado === null
        ? minutosSugeridos
        : Math.max(0, Math.floor(Number(digitado.replace(/\D/g, "")) || 0))
      : 0;
  // Valor em R$ que vai para o caixa (minutos: nunca mais que o que falta)
  const valorAtual =
    forma === "minutos"
      ? Math.min(Math.round(minutosUsar * valorMinuto * 100) / 100, tempoAPagar)
      : digitado === null
        ? sugestaoMin
        : lerValor(digitado) || 0;
  const podeDividir =
    (forma === "minutos" || forma === "pacote") &&
    !!quem &&
    valorAtual > 0 &&
    valorAtual < falta - 0.001;
  const faltaMinutos = forma === "minutos" && minutosUsar > saldo;

  return (
    <form
      key={res?.ok ? `${res.msg}${falta}` : "f"}
      action={(f) => {
        setDigitado(null); // depois de receber, volta para a sugestão
        acao(f);
      }}
      className="space-y-3"
    >
      <input type="hidden" name="atendimento_id" value={atendimentoId} />
      <input type="hidden" name="forma" value={forma} />
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(FORMAS) as Forma[]).map((f) => {
          const bloqueado =
            (f === "minutos" && comSaldo.length === 0) ||
            (f === "pacote" && (comPacote.length === 0 || !(valorHora > 0)));
          return (
            <button
              key={f}
              type="button"
              disabled={bloqueado}
              title={
                bloqueado
                  ? f === "pacote"
                    ? "Ninguém com pacote de horas (ou atendimento sem tempo)"
                    : "Nenhum cliente com saldo de minutos"
                  : undefined
              }
              onClick={() => escolherForma(f)}
              className={`rounded-xl border px-3 py-3 text-sm font-semibold transition disabled:opacity-40 ${
                forma === f
                  ? "border-purple bg-primary/20 text-purple"
                  : "border-border hover:bg-accent"
              }`}
            >
              {FORMAS[f]}
            </button>
          );
        })}
      </div>
      {forma === "minutos" && (
        <div className="space-y-1">
          <label
            htmlFor={`pagador-${atendimentoId}`}
            className="text-xs text-muted-foreground"
          >
            Minutos de quem? (pode ser outro cliente: amigo, promoção...)
          </label>
          <UsarMinutos
            id={`pagador-${atendimentoId}`}
            comSaldo={comSaldo}
            name="cliente_minutos_id"
            value={pagador}
            onChange={(v) => {
              setPagador(v);
              setDigitado(null);
            }}
            primeiro={clienteId}
            vazio="Escolha o cliente..."
          />
        </div>
      )}
      {forma === "pacote" && (
        <div className="space-y-1">
          <label
            htmlFor={`pac-${atendimentoId}`}
            className="text-xs text-muted-foreground"
          >
            Pacote de quem?
          </label>
          <UsarMinutos
            id={`pac-${atendimentoId}`}
            comSaldo={comPacote}
            name="cliente_minutos_id"
            value={pagadorPac}
            onChange={(v) => {
              setPagadorPac(v);
              setDigitado(null);
            }}
            primeiro={clienteId}
            vazio="Escolha o cliente..."
            horas
          />
        </div>
      )}
      {podeDividir && (
        <div className="space-y-1 rounded-lg border border-border p-2">
          <input type="hidden" name="resto_forma" value={resto} />
          <p className="text-xs text-muted-foreground">
            O resto (
            <b>R$ {(falta - valorAtual).toFixed(2).replace(".", ",")}</b>) pagar
            em:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {(["dinheiro", "pix", "cartao", ""] as const).map((f) => (
              <button
                key={f || "nao"}
                type="button"
                onClick={() => setResto(f)}
                className={`rounded-full border px-3 py-1 text-xs ${resto === f ? "border-purple bg-primary/20 text-purple" : "border-border hover:bg-accent"}`}
              >
                {f ? FORMAS[f] : "Depois"}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {forma === "minutos" ? (
          <>
            {/* Digita minutos; vai para o caixa o valor equivalente em R$ */}
            <input type="hidden" name="minutos" value={minutosUsar} />
            <Input
              value={digitado ?? String(minutosSugeridos)}
              onChange={(e) => setDigitado(e.target.value)}
              inputMode="numeric"
              aria-label="Minutos a usar"
              className="w-24"
            />
            <span className="text-sm">
              min de jogo = {reais(valorAtual)}
            </span>
          </>
        ) : (
          <Input
            name="valor"
            value={digitado ?? sugestao}
            onChange={(e) => setDigitado(e.target.value)}
            inputMode="decimal"
            placeholder="Valor"
            aria-label="Valor recebido"
            className="w-32"
          />
        )}
        <Button
          type="submit"
          disabled={
            enviando ||
            !forma ||
            ((forma === "minutos" || forma === "pacote") && !quem) ||
            faltaMinutos ||
            !(valorAtual > 0)
          }
        >
          {enviando ? "Registrando..." : "Receber"}
        </Button>
        {!forma && (
          <span className="text-xs text-muted-foreground">
            Escolha a forma de pagamento
          </span>
        )}
      </div>
      {forma === "pacote" && (
        <p className="text-xs text-muted-foreground">
          Desconta do pacote o tempo equivalente ao valor (
          {valorHora.toFixed(2).replace(".", ",")}/hora). Saldo:{" "}
          {Math.floor(saldoPac / 60)}:{String(saldoPac % 60).padStart(2, "0")}{" "}
          h.
        </p>
      )}
      {forma === "minutos" && (
        <p
          className={`text-xs ${faltaMinutos ? "text-destructive" : "text-muted-foreground"}`}
        >
          1 minuto de saldo = 1 minuto de jogo ({reais(valorMinuto)}/min). Minutos pagam só o tempo ({minutosDoTempo} min em aberto), não o consumo. Saldo de
          quem foi escolhido: {saldo} min.
          {faltaMinutos
            ? " Saldo insuficiente."
            : " Quer pagar só uma parte em minutos? Diminua os minutos e escolha como pagar o resto."}
        </p>
      )}
      {res && (
        <p className={`text-sm ${res.ok ? "text-green" : "text-destructive"}`}>
          {res.msg}
        </p>
      )}
    </form>
  );
}
