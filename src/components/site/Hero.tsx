import { wa } from "@/lib/arena";
import { conteudoSite, type SiteProps } from "@/lib/site";
import { agruparHorarios, horariosArena } from "@/lib/conteudo";
import { perfilArena } from "@/lib/perfil";

// Topo da página: chamada principal + horários + faixa de jogos
export default async function Hero({ arenaId }: SiteProps) {
  const [p, horarios, c] = await Promise.all([perfilArena(arenaId), horariosArena(arenaId), conteudoSite(arenaId)]);
  const JOGOS = c.jogos;
  return (
    <section className="hero-bg">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:grid-cols-2 md:py-24">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan/20 bg-cyan/5 px-3 py-1 text-xs font-semibold tracking-wider text-cyan">
            ● GAME CENTER{p.cidade && ` · ${p.cidade.toUpperCase()}`}
          </span>
          <h1 className="mt-5 font-display text-4xl leading-tight font-bold sm:text-6xl">
            {/* *texto* = parte colorida */}
            {c.titulo.split("*").map((t, i) => (i % 2 ? <span key={i} className="text-gradient">{t}</span> : t))}
          </h1>
          <p className="mt-5 max-w-lg text-muted-foreground">
            {c.chamada}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={wa(p.whatsapp, `Olá! Quero reservar um horário na ${p.nome}.`)}
              target="_blank"
              rel="noopener"
              className="btn-primary rounded-xl px-6 py-3 font-semibold"
            >
              🎮 Reservar pelo WhatsApp
            </a>
            <a href="#precos" className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-semibold hover:bg-white/10">
              Ver preços
            </a>
          </div>
          <dl className="mt-10 flex gap-8">
            {c.numeros.map((n) => (
              <div key={n.label} className="flex flex-col">
                <dt className="order-2 text-xs tracking-wider text-dim uppercase">{n.label}</dt>
                <dd className="font-display text-3xl font-bold text-cyan">{n.valor}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="glow rounded-3xl bg-card p-6 sm:p-8">
          <p className="font-display text-lg font-bold">🕒 Horário de funcionamento</p>
          <ul className="mt-4 divide-y divide-white/5">
            {agruparHorarios(horarios).map((h) => (
              <li key={h.dia} className="flex justify-between py-3 text-sm">
                <span className="text-muted-foreground">{h.dia}</span>
                <span className="font-semibold">{h.hora}</span>
              </li>
            ))}
          </ul>
          {c.aviso && <p className="mt-4 rounded-xl bg-purple-strong/10 p-4 text-sm text-muted-foreground">{c.aviso}</p>}
        </div>
      </div>

      {/* Faixa de jogos */}
      {JOGOS.length > 0 && (
      <div className="overflow-hidden border-y border-white/5 bg-elevated py-4">
        <div className="marquee flex w-max gap-8 text-sm font-semibold whitespace-nowrap text-dim">
          {[...JOGOS, ...JOGOS].map((j, i) => (
            <span key={i} aria-hidden={i >= JOGOS.length}>
              {j} <span className="ml-8 text-purple">•</span>
            </span>
          ))}
        </div>
      </div>
      )}
    </section>
  );
}
