import Image from "next/image";
import Titulo from "./Titulo";
import { perfilArena } from "@/lib/perfil";
import { conteudoSite, type SiteProps } from "@/lib/site";

// Fotos do site (Configurações → Site). Sem fotos, a seção some.
export default async function Galeria({ arenaId }: SiteProps) {
  const [{ instagram }, { fotos: FOTOS }] = await Promise.all([perfilArena(arenaId), conteudoSite(arenaId)]);
  if (!FOTOS.length) return null;
  return (
    <section id="fotos" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-20">
      <Titulo tag="📸 Fotos" titulo="Por dentro da arena" />
      <div className="grid auto-rows-[160px] grid-cols-2 gap-3 md:auto-rows-[200px] md:grid-cols-4">
        {FOTOS.map((f) => (
          <div
            key={f.url}
            className={`relative overflow-hidden rounded-2xl ${f.grande ? "col-span-2 row-span-2" : ""}`}
          >
            <Image
              src={f.url}
              alt={f.alt}
              fill
              sizes={f.grande ? "(min-width: 768px) 50vw, 100vw" : "(min-width: 768px) 25vw, 50vw"}
              className="object-cover object-top transition duration-500 hover:scale-105"
            />
          </div>
        ))}
      </div>
      {instagram && (
        <div className="mt-8 text-center">
          <a
            href={`https://www.instagram.com/${instagram}/`}
            target="_blank"
            rel="noopener"
            className="inline-block rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-semibold hover:bg-white/10"
          >
            Ver mais no Instagram @{instagram}
          </a>
        </div>
      )}
    </section>
  );
}
