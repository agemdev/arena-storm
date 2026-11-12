import type { SiteProps } from "@/lib/site";
import Link from "next/link";
import { wa } from "@/lib/arena";
import { perfilArena } from "@/lib/perfil";
import Marca from "@/components/Marca";

const LINKS = [
  { href: "/#estrutura", label: "Estrutura" },
  { href: "/#precos", label: "Preços" },
  { href: "/#torneios", label: "Torneios" },
  { href: "/ranking", label: "Ranking" },
  { href: "/saldo", label: "Meu saldo" },
  { href: "/#local", label: "Local" },
];

// Barra do topo (fixa)
export default async function Header({ arenaId, base }: SiteProps) {
  const p = await perfilArena(arenaId);
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href={base || "/"} className="text-lg">
          <Marca nome={p.nome} logoUrl={p.logoUrl} tamanho={40} />
        </Link>
        <nav className="hidden gap-6 text-sm text-muted-foreground md:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={base + l.href} className="hover:text-text">
              {l.label}
            </Link>
          ))}
        </nav>
        {/* Celular: atalhos (o menu completo só aparece no computador) */}
        <div className="flex gap-3 text-sm text-muted-foreground md:hidden">
          <Link href={`${base}/ranking`}>🏆</Link>
          <Link href={`${base}/saldo`}>⏱️ Saldo</Link>
        </div>
        <a
          href={wa(p.whatsapp, `Olá! Quero reservar um horário na ${p.nome}.`)}
          target="_blank"
          rel="noopener"
          className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold"
        >
          Reservar
        </a>
      </div>
    </header>
  );
}
