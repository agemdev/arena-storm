import { wa } from "@/lib/arena";
import { perfilArena } from "@/lib/perfil";
import Marca from "@/components/Marca";

const LINKS = [
  { href: "#estrutura", label: "Estrutura" },
  { href: "#fotos", label: "Fotos" },
  { href: "#precos", label: "Preços" },
  { href: "#torneios", label: "Torneios" },
  { href: "#local", label: "Local" },
];

// Barra do topo (fixa)
export default async function Header() {
  const p = await perfilArena();
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <a href="#" className="text-lg">
          <Marca nome={p.nome} logoUrl={p.logoUrl} tamanho={40} />
        </a>
        <nav className="hidden gap-6 text-sm text-muted-foreground md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-text">
              {l.label}
            </a>
          ))}
        </nav>
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
