"use client";

import { useActionState, useState } from "react";
import { salvarHorarios } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { agruparHorarios, DIAS, type Horario } from "@/lib/formatos";

const ORDEM = [1, 2, 3, 4, 5, 6, 0]; // segunda → domingo
const curta = (t: string | null) => (t ?? "").slice(0, 5); // "09:00:00" → "09:00"

export default function HorariosForm({ inicial }: { inicial: Horario[] }) {
  const [res, acao, enviando] = useActionState(salvarHorarios, null);
  const [dias, setDias] = useState<Horario[]>(() =>
    ORDEM.map((d) => {
      const h = inicial.find((x) => x.dia === d);
      return { dia: d, fechado: h?.fechado ?? false, abre: curta(h?.abre ?? "09:00"), fecha: curta(h?.fecha ?? "22:00") };
    }),
  );

  const mudar = (dia: number, campo: Partial<Horario>) =>
    setDias((lista) => lista.map((h) => (h.dia === dia ? { ...h, ...campo } : h)));

  // Repete o horário de segunda em terça a sexta
  const copiarSegunda = () => {
    const seg = dias.find((h) => h.dia === 1)!;
    setDias((lista) => lista.map((h) => (h.dia >= 2 && h.dia <= 5 ? { ...h, fechado: seg.fechado, abre: seg.abre, fecha: seg.fecha } : h)));
  };

  return (
    <form action={acao} className="space-y-6">
      <div className="divide-y divide-border rounded-xl border border-border">
        {dias.map((h) => (
          <div key={h.dia} className="grid grid-cols-[6rem_1fr] items-center gap-3 p-3 sm:grid-cols-[7rem_7rem_1fr]">
            <span className="font-medium">{DIAS[h.dia]}</span>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                name={`fechado_${h.dia}`}
                checked={h.fechado}
                onChange={(e) => mudar(h.dia, { fechado: e.target.checked })}
              />
              Fechado
            </label>
            <div className={`col-span-2 flex items-center gap-2 sm:col-span-1 ${h.fechado ? "opacity-40" : ""}`}>
              <Input
                type="time"
                name={`abre_${h.dia}`}
                value={h.abre ?? ""}
                onChange={(e) => mudar(h.dia, { abre: e.target.value })}
                disabled={h.fechado}
                aria-label={`${DIAS[h.dia]}: abre`}
                className="w-32"
              />
              <span className="text-muted-foreground">até</span>
              <Input
                type="time"
                name={`fecha_${h.dia}`}
                value={h.fecha ?? ""}
                onChange={(e) => mudar(h.dia, { fecha: e.target.value })}
                disabled={h.fechado}
                aria-label={`${DIAS[h.dia]}: fecha`}
                className="w-32"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={enviando}>
          {enviando ? "Salvando..." : "Salvar horários"}
        </Button>
        <Button type="button" variant="outline" onClick={copiarSegunda}>
          Copiar segunda para terça–sexta
        </Button>
        {res && <p className={`text-sm ${res.ok ? "text-green" : "text-destructive"}`}>{res.msg}</p>}
      </div>

      {/* Prévia de como fica no site */}
      <div className="rounded-xl bg-input/20 p-4">
        <p className="mb-2 text-xs tracking-wider text-dim uppercase">Como aparece no site</p>
        <ul className="space-y-1 text-sm">
          {agruparHorarios(dias).map((g) => (
            <li key={g.dia} className="flex justify-between gap-4">
              <span className="text-muted-foreground">{g.dia}</span>
              <span className="font-semibold">{g.hora}</span>
            </li>
          ))}
        </ul>
      </div>
    </form>
  );
}
