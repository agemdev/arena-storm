"use client";

import { useEffect, useId } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

type Props = {
  titulo?: React.ReactNode;
  onFechar?: () => void; // fechar por estado (cliente)
  fecharHref?: string; // ou fechar voltando para um endereço (servidor)
  largura?: string;
  children: React.ReactNode;
};

// Janelas abertas (a de cima é a que fecha no Esc)
const pilha: string[] = [];

// Janela flutuante sobre a tela (fecha no X, no Esc ou clicando fora)
export default function Janela({ titulo, onFechar, fecharHref, largura = "max-w-lg", children }: Props) {
  const router = useRouter();
  const eu = useId();
  const fechar = () => (onFechar ? onFechar() : fecharHref && router.push(fecharHref, { scroll: false }));

  useEffect(() => {
    pilha.push(eu);
    document.body.style.overflow = "hidden"; // trava a rolagem do fundo
    return () => {
      pilha.splice(pilha.indexOf(eu), 1);
      if (!pilha.length) document.body.style.overflow = "";
    };
  }, [eu]);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && pilha.at(-1) === eu && fechar();
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  });

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/70 p-3 backdrop-blur-sm sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && fechar()}
      onClick={(e) => e.stopPropagation()} // não deixa o clique "vazar" para a linha da lista
    >
      <div role="dialog" aria-modal="true" className={`relative w-full ${largura} rounded-2xl border border-border bg-elevated p-5 shadow-2xl sm:p-6`}>
        <button onClick={fechar} className="absolute top-3 right-3 rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Fechar">
          <X className="size-5" />
        </button>
        {titulo && <div className="mb-4 pr-8">{titulo}</div>}
        {children}
      </div>
    </div>
  );
}
