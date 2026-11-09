import { FESTAS, PLANOS, wa } from "@/lib/arena";
import Titulo from "./Titulo";
import { perfilArena } from "@/lib/perfil";

// Tabela de preços. Todo botão abre o WhatsApp.
export default async function Precos() {
  const p = await perfilArena();
  return (
    <section id="precos" className="scroll-mt-20 bg-elevated py-20">
      <div className="mx-auto max-w-6xl px-4">
        <Titulo tag="💰 Valores" titulo="Planos pra todo estilo de jogo" texto="Escolha o plano e reserve pelo WhatsApp." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLANOS.map((plano) => (
            <div
              key={plano.nome}
              className={`flex flex-col rounded-2xl bg-card p-6 ${plano.destaque ? "glow" : "border border-white/5"}`}
            >
              {plano.destaque && (
                <span className="mb-3 w-fit rounded-full bg-purple-strong/20 px-3 py-1 text-xs font-semibold text-purple">
                  Mais pedido
                </span>
              )}
              <h3 className="font-display text-lg font-bold">{plano.nome}</h3>
              <p className="mt-3">
                <span className="font-display text-4xl font-bold">{plano.preco}</span>
                <span className="text-sm text-dim">{plano.unidade}</span>
              </p>
              <ul className="mt-5 flex-1 space-y-2 text-sm text-muted-foreground">
                {plano.itens.map((i) => (
                  <li key={i}>✓ {i}</li>
                ))}
              </ul>
              <a
                href={wa(p.whatsapp, `Olá! Quero reservar o plano ${plano.nome} (${plano.preco}).`)}
                target="_blank"
                rel="noopener"
                className={`mt-6 rounded-xl py-2.5 text-center text-sm font-semibold ${plano.destaque ? "btn-primary" : "border border-white/10 bg-white/5 hover:bg-white/10"}`}
              >
                Quero esse
              </a>
            </div>
          ))}
        </div>

        {/* Festas de aniversário */}
        <div className="mt-6 grid gap-4 rounded-2xl border border-pink/20 bg-pink/5 p-6 md:grid-cols-[1fr_auto_auto] md:items-center">
          <div>
            <h3 className="font-display text-lg font-bold">🎂 Festa de aniversário</h3>
            <p className="mt-1 text-sm text-muted-foreground">Pacotes de grupo e de 3h também sob consulta.</p>
          </div>
          {FESTAS.map((f) => (
            <a
              key={f.nome}
              href={wa(p.whatsapp, `Olá! Quero saber do pacote ${f.nome} (${f.preco}).`)}
              target="_blank"
              rel="noopener"
              className="rounded-xl bg-card px-5 py-3 hover:bg-card-hover"
            >
              <span className="block font-display text-xl font-bold">{f.preco}</span>
              <span className="text-xs text-muted-foreground">{f.texto}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
