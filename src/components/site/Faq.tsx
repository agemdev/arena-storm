import { conteudoSite, type SiteProps } from "@/lib/site";
import Titulo from "./Titulo";

// Perguntas frequentes (abre/fecha sem JavaScript)
export default async function Faq({ arenaId }: SiteProps) {
  const { faq: FAQ } = await conteudoSite(arenaId);
  if (!FAQ.length) return null;
  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-20">
      <Titulo tag="❓ Dúvidas" titulo="Perguntas frequentes" />
      <div className="space-y-3">
        {FAQ.map((f) => (
          <details key={f.p} className="group rounded-2xl border border-white/5 bg-card p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
              {f.p}
              <span className="text-purple transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-sm text-muted-foreground">{f.r}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
