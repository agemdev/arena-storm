"use client";

import { useActionState } from "react";
import { consultarSaldo } from "./actions";
import { horas } from "@/lib/formatos";

// Formulário de consulta de saldo (site)
export default function Consulta() {
  const [res, acao, enviando] = useActionState(consultarSaldo, null);
  return (
    <div className="mx-auto max-w-md space-y-6">
      <form action={acao} className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-card p-6">
        <label htmlFor="whatsapp" className="text-sm font-semibold">
          Seu WhatsApp (o do cadastro)
        </label>
        <input
          id="whatsapp"
          name="whatsapp"
          inputMode="tel"
          placeholder="(88) 9 9999-9999"
          required
          className="rounded-xl border border-white/10 bg-bg px-4 py-3 text-lg outline-none focus:border-purple"
        />
        <button type="submit" disabled={enviando} className="btn-primary rounded-xl px-4 py-3 font-semibold disabled:opacity-60">
          {enviando ? "Consultando..." : "Consultar saldo"}
        </button>
        {res && !res.ok && <p className="text-sm text-amber">{res.msg}</p>}
      </form>

      {res?.ok && (
        <div className="space-y-3 rounded-2xl border border-purple/30 bg-card p-6 text-center">
          <p className="text-lg">
            Olá, <b>{res.saldo.nome}</b>! 👋
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Caixa titulo="Banco de minutos" valor={`${res.saldo.minutos} min`} dica={`vale R$ ${res.saldo.minutos},00 em jogo`} />
            <Caixa titulo="Pacote de horas" valor={horas(res.saldo.pacote)} dica={res.saldo.pacote ? "para jogar" : "sem pacote"} />
          </div>
          <p className="text-sm text-muted-foreground">Neste mês você jogou {horas(res.saldo.minutos_mes)}.</p>
        </div>
      )}
    </div>
  );
}

function Caixa({ titulo, valor, dica }: { titulo: string; valor: string; dica: string }) {
  return (
    <div className="rounded-xl bg-white/[0.04] p-4">
      <p className="text-xs text-muted-foreground">{titulo}</p>
      <p className="font-display text-2xl font-bold text-cyan">{valor}</p>
      <p className="text-xs text-muted-foreground">{dica}</p>
    </div>
  );
}
