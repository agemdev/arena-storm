"use client";

import { Button } from "@/components/ui/button";

// Imprimir / salvar PDF (pelo navegador)
export function Imprimir() {
  return (
    <Button type="button" onClick={() => window.print()} className="print:hidden">
      🖨️ Imprimir / PDF
    </Button>
  );
}

type Valor = string | number;

// Baixa uma tabela como planilha CSV (abre no Excel). Separador ";" e vírgula decimal (padrão Brasil).
export function BaixarCsv({ nome, colunas, linhas }: { nome: string; colunas: string[]; linhas: Valor[][] }) {
  const baixar = () => {
    const celula = (v: Valor) => {
      const t = typeof v === "number" ? String(Math.round(v * 100) / 100).replace(".", ",") : v;
      return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
    };
    const texto = [colunas, ...linhas].map((l) => l.map(celula).join(";")).join("\r\n");
    const blob = new Blob(["﻿" + texto], { type: "text/csv;charset=utf-8" }); // BOM: acentos certos no Excel
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${nome}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Button type="button" variant="outline" size="sm" onClick={baixar} className="print:hidden">
      ⬇ Planilha (CSV)
    </Button>
  );
}
