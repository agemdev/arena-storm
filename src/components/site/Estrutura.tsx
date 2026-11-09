import { EQUIPAMENTOS } from "@/lib/arena";
import Titulo from "./Titulo";

// Equipamentos da arena
export default function Estrutura() {
  return (
    <section id="estrutura" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
      <Titulo
        tag="✦ Estrutura"
        titulo="Nível profissional"
        texto="Hardware de ponta, ambiente climatizado e uma vibe que não tem igual na região."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {EQUIPAMENTOS.map((e) => (
          <div key={e.titulo} className="rounded-2xl border border-white/5 bg-card p-6 transition hover:bg-card-hover">
            <div className="text-3xl">{e.icone}</div>
            <h3 className="mt-4 font-display text-lg font-bold">{e.titulo}</h3>
            <p className="mt-2 text-sm text-muted">{e.texto}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
