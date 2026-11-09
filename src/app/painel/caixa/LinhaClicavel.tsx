"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = { href: string; className?: string; children: React.ReactNode };

// Linha da lista: clicar em qualquer parte abre a janela do atendimento
export default function LinhaClicavel({ href, className = "", children }: Props) {
  const router = useRouter();
  const [abrindo, iniciar] = useTransition();

  const abrir = (e: React.MouseEvent) => {
    // Botões e links da própria linha continuam funcionando normalmente
    if ((e.target as HTMLElement).closest("button, a, input, select, form, label")) return;
    iniciar(() => router.push(href, { scroll: false }));
  };

  return (
    <tr
      onClick={abrir}
      className={`cursor-pointer border-b transition-colors hover:bg-accent/60 ${abrindo ? "animate-pulse bg-accent/60" : ""} ${className}`}
    >
      {children}
    </tr>
  );
}
