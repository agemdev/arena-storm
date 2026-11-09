import { TORNEIOS, wa } from "@/lib/arena";
import Titulo from "./Titulo";
import { perfilArena } from "@/lib/perfil";

// Próximos campeonatos (fixos até o M3)
export default async function Torneios() {
  const p = await perfilArena();
  return (
    <section id="torneios" className="mx-auto max-w-4xl scroll-mt-20 px-4 py-20">
      <Titulo tag="🏆 Campeonatos" titulo="Próximos torneios" texto="Inscreva sua crew e dispute com a comunidade." />
      <div className="space-y-4">
        {TORNEIOS.map((t) => (
          <div key={t.titulo} className="flex items-center gap-5 rounded-2xl border border-white/5 bg-card p-5">
            <div className="btn-primary grid h-16 w-16 shrink-0 place-items-center rounded-xl text-center leading-none">
              <div>
                <div className="font-display text-2xl font-bold">{t.dia}</div>
                <div className="text-xs font-semibold">{t.mes}</div>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-display text-lg font-bold">{t.titulo}</h3>
              <p className="text-sm text-muted-foreground">{t.texto}</p>
            </div>
            <a
              href={wa(p.whatsapp, `Olá! Quero me inscrever no torneio ${t.titulo} (${t.texto}).`)}
              target="_blank"
              rel="noopener"
              className="hidden rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10 sm:block"
            >
              Inscrever
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
