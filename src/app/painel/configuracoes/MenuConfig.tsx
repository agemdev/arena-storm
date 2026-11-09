"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Clock, Tag } from "lucide-react";

// Itens da barra lateral. Nova página de configuração? Adicione aqui.
const ITENS = [
  { href: "/painel/configuracoes/perfil", label: "Perfil da arena", icone: Building2 },
  { href: "/painel/configuracoes/horarios", label: "Horários", icone: Clock },
  { href: "/painel/configuracoes/precos", label: "Preços e pacotes", icone: Tag },
];

// Barra lateral no computador; abas roláveis no celular
export default function MenuConfig() {
  const rota = usePathname();
  return (
    <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-col md:px-0">
      {ITENS.map(({ href, label, icone: Icone }) => {
        const ativo = rota.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={ativo ? "page" : undefined}
            className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition ${
              ativo ? "bg-primary/15 font-semibold text-purple" : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <Icone className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
