import { HORARIOS, JOGOS, NUMEROS, wa } from "@/lib/arena";
import { perfilArena } from "@/lib/perfil";

// Topo da página: chamada principal + horários + faixa de jogos
export default async function Hero() {
  const p = await perfilArena();
  return (
    <section className="hero-bg">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:grid-cols-2 md:py-24">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan/20 bg-cyan/5 px-3 py-1 text-xs font-semibold tracking-wider text-cyan">
            ● GAME CENTER{p.cidade && ` · ${p.cidade.toUpperCase()}`}
          </span>
          <h1 className="mt-5 font-display text-4xl leading-tight font-bold sm:text-6xl">
            O melhor <span className="text-gradient">lobby gamer</span> da região
          </h1>
          <p className="mt-5 max-w-lg text-muted-foreground">
            PCs gamer, PlayStation 5, simulador de corrida, realidade virtual e um espaço completo pra você e sua crew.
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
            {NUMEROS.map((n) => (
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
            {HORARIOS.map((h) => (
              <li key={h.dia} className="flex justify-between py-3 text-sm">
                <span className="text-muted-foreground">{h.dia}</span>
                <span className="font-semibold">{h.hora}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 rounded-xl bg-purple-strong/10 p-4 text-sm text-muted-foreground">
            🌙 <b className="text-text">Corujão</b> das 22h às 6h. Reserve com antecedência!
          </p>
        </div>
      </div>

      {/* Faixa de jogos */}
      <div className="overflow-hidden border-y border-white/5 bg-elevated py-4">
        <div className="marquee flex w-max gap-8 text-sm font-semibold whitespace-nowrap text-dim">
          {[...JOGOS, ...JOGOS].map((j, i) => (
            <span key={i} aria-hidden={i >= JOGOS.length}>
              {j} <span className="ml-8 text-purple">•</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
