import type { SiteProps } from "@/lib/site";
import { wa } from "@/lib/arena";
import { agruparHorarios, horariosArena } from "@/lib/conteudo";
import { perfilArena } from "@/lib/perfil";
import Titulo from "./Titulo";

// Endereço, contatos e mapa (dados do Perfil da arena)
export default async function Local({ arenaId }: SiteProps) {
  const [p, horarios] = await Promise.all([perfilArena(arenaId), horariosArena(arenaId)]);
  const busca = encodeURIComponent(`${p.nome}, ${p.endereco}`);
  const mapa = `https://www.google.com/maps?q=${busca}&output=embed`;
  const rota = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.endereco)}`;

  return (
    <section id="local" className="scroll-mt-20 bg-elevated py-20">
      <div className="mx-auto max-w-6xl px-4">
        <Titulo tag="📍 Onde ficamos" titulo="Chega sem medo" texto="Venha conhecer a arena." />
        <div className="grid gap-6 md:grid-cols-[1fr_1.4fr]">
          <div className="rounded-2xl border border-white/5 bg-card p-6">
            <h3 className="text-xs tracking-wider text-dim uppercase">Endereço</h3>
            <p className="mt-1 font-semibold">{p.endereco}</p>
            <a href={rota} target="_blank" rel="noopener" className="mt-2 inline-block text-sm text-cyan hover:underline">
              Abrir rota no Google Maps →
            </a>
            <h3 className="mt-6 text-xs tracking-wider text-dim uppercase">Horários</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {agruparHorarios(horarios).map((h) => (
                <li key={h.dia} className="flex justify-between">
                  <span className="text-muted-foreground">{h.dia}</span>
                  <span className="font-semibold">{h.hora}</span>
                </li>
              ))}
            </ul>
            <h3 className="mt-6 text-xs tracking-wider text-dim uppercase">Contato</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {p.whatsapp && (
                <li>
                  💬{" "}
                  <a href={wa(p.whatsapp)} target="_blank" rel="noopener" className="hover:text-cyan">
                    {p.whatsappTexto}
                  </a>
                </li>
              )}
              {p.instagram && (
                <li>
                  📸{" "}
                  <a href={`https://www.instagram.com/${p.instagram}/`} target="_blank" rel="noopener" className="hover:text-cyan">
                    @{p.instagram}
                  </a>
                </li>
              )}
              {p.email && (
                <li>
                  ✉️{" "}
                  <a href={`mailto:${p.email}`} className="hover:text-cyan">
                    {p.email}
                  </a>
                </li>
              )}
            </ul>
          </div>
          <iframe src={mapa} title={`Mapa da ${p.nome}`} loading="lazy" className="h-80 w-full rounded-2xl border-0 md:h-full" />
        </div>
      </div>
    </section>
  );
}
