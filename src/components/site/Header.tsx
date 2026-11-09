import { wa } from "@/lib/arena";

const LINKS = [
  { href: "#estrutura", label: "Estrutura" },
  { href: "#fotos", label: "Fotos" },
  { href: "#precos", label: "Preços" },
  { href: "#torneios", label: "Torneios" },
  { href: "#local", label: "Local" },
];

// Barra do topo (fixa)
export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <a href="#" className="flex items-center gap-2 font-display text-lg font-bold">
          <span className="btn-primary grid h-8 w-8 place-items-center rounded-lg text-sm">⚡</span>
          Arena <span className="text-cyan">Storm</span>
        </a>
        <nav className="hidden gap-6 text-sm text-muted-foreground md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-text">
              {l.label}
            </a>
          ))}
        </nav>
        <a
          href={wa("Olá! Quero reservar um horário na Arena Storm.")}
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
