import { ENDERECO, HORARIOS } from "@/lib/arena";
import Titulo from "./Titulo";

const MAPA = `https://www.google.com/maps?q=${encodeURIComponent("Arena Storm, " + ENDERECO)}&output=embed`;
const ROTA = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ENDERECO)}`;

// Endereço + mapa
export default function Local() {
  return (
    <section id="local" className="scroll-mt-20 bg-elevated py-20">
      <div className="mx-auto max-w-6xl px-4">
        <Titulo tag="📍 Onde ficamos" titulo="Chega sem medo" texto="No centro de Tianguá, fácil de achar e com estacionamento na porta." />
        <div className="grid gap-6 md:grid-cols-[1fr_1.4fr]">
          <div className="rounded-2xl border border-white/5 bg-card p-6">
            <h3 className="text-xs tracking-wider text-dim uppercase">Endereço</h3>
            <p className="mt-1 font-semibold">{ENDERECO}</p>
            <a href={ROTA} target="_blank" rel="noopener" className="mt-2 inline-block text-sm text-cyan hover:underline">
              Abrir rota no Google Maps →
            </a>
            <h3 className="mt-6 text-xs tracking-wider text-dim uppercase">Horários</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {HORARIOS.map((h) => (
                <li key={h.dia} className="flex justify-between">
                  <span className="text-muted">{h.dia}</span>
                  <span className="font-semibold">{h.hora}</span>
                </li>
              ))}
            </ul>
            <ul className="mt-6 grid grid-cols-2 gap-2 text-sm text-muted">
              <li>❄️ Climatizado</li>
              <li>🍔 Lanches e bebidas</li>
              <li>👨‍👩‍👧 Espaço pra grupos</li>
              <li>🚗 Estacionamento</li>
            </ul>
          </div>
          <iframe
            src={MAPA}
            title="Mapa da Arena Storm"
            loading="lazy"
            className="h-80 w-full rounded-2xl border-0 md:h-full"
          />
        </div>
      </div>
    </section>
  );
}
