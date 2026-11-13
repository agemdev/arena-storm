"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { gerarFatura, type Resultado } from "./actions";

// Botão "Gerar fatura": cria e já abre a página de pagamento do Asaas
export default function GerarFatura() {
  const [res, setRes] = useState<Resultado>(null);
  const [enviando, iniciar] = useTransition();
  return (
    <div className="space-y-2">
      <Button
        type="button"
        disabled={enviando}
        onClick={() =>
          iniciar(async () => {
            const r = await gerarFatura();
            setRes(r);
            if (r?.link) window.open(r.link, "_blank", "noopener");
          })
        }
      >
        {enviando ? "Gerando..." : "💳 Gerar fatura para renovar"}
      </Button>
      {res && (
        <p className={`text-sm ${res.ok ? "text-green" : "text-destructive"}`}>
          {res.msg}{" "}
          {res.link && (
            <a href={res.link} target="_blank" rel="noopener" className="underline">
              Abrir fatura
            </a>
          )}
        </p>
      )}
    </div>
  );
}
