import { Suspense } from "react";
import { exigirAdmin } from "@/lib/auth";
import { CONTEUDO_PADRAO, DOMINIO_SISTEMA, type ConteudoSite } from "@/lib/site";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mexerFoto } from "./actions";
import { EnviarFotos, FormTextos } from "./Formularios";

// Configurações → Site: textos e fotos do site público da arena
export default function SitePage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold">Site da arena</h2>
        <p className="text-sm text-muted-foreground">Textos e fotos do site público. Nome, logotipo, endereço, horários e preços vêm das outras abas.</p>
      </div>
      <Suspense fallback={<p className="text-muted-foreground">Carregando...</p>}>
        <Conteudo />
      </Suspense>
    </div>
  );
}

async function Conteudo() {
  const { supabase, arenaId } = await exigirAdmin();
  const [{ data }, { data: arena }] = await Promise.all([
    supabase.from("site_conteudo").select("*").eq("arena_id", arenaId).maybeSingle(),
    supabase.from("arenas").select("slug").eq("id", arenaId).single(),
  ]);
  const c: ConteudoSite = data ? { ...CONTEUDO_PADRAO, ...data } : CONTEUDO_PADRAO;
  const slug = arena?.slug as string | null;
  const endereco = slug ? (DOMINIO_SISTEMA ? `https://${slug}.${DOMINIO_SISTEMA}` : `/s/${slug}`) : null;

  const textos = {
    titulo: c.titulo,
    chamada: c.chamada,
    aviso: c.aviso ?? "",
    numeros: c.numeros.map((n) => `${n.valor} | ${n.label}`).join("\n"),
    estrutura: c.estrutura.map((e) => `${e.icone} | ${e.titulo} | ${e.texto}`).join("\n"),
    jogos: c.jogos.join(", "),
    torneios: c.torneios.map((t) => `${t.data.split("-").reverse().join("/")} | ${t.titulo} | ${t.texto}`).join("\n"),
    faq: c.faq.map((f) => `${f.p} | ${f.r}`).join("\n"),
  };

  return (
    <>
      {endereco && (
        <p className="text-sm">
          🌐 Seu site:{" "}
          <a href={endereco} target="_blank" className="text-cyan hover:underline">
            {endereco} ↗
          </a>
        </p>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Textos</CardTitle>
        </CardHeader>
        <CardContent>
          <FormTextos t={textos} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Fotos ({c.fotos.length}/16)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <EnviarFotos />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {c.fotos.map((f, i) => (
              <div key={f.url} className="space-y-1 rounded-lg border border-border p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.url} alt={f.alt} className="aspect-video w-full rounded object-cover" />
                <form action={mexerFoto} className="flex gap-1">
                  <input type="hidden" name="url" value={f.url} />
                  <input type="hidden" name="acao" value="legenda" />
                  <input name="alt" defaultValue={f.alt} aria-label="Legenda" className="w-full rounded border border-border bg-transparent px-1 text-xs" />
                  <button type="submit" className="text-xs text-cyan">
                    ok
                  </button>
                </form>
                <div className="flex flex-wrap gap-1 text-xs">
                  {[
                    ["subir", "◀", i === 0],
                    ["descer", "▶", i === c.fotos.length - 1],
                    ["grande", f.grande ? "★ Grande" : "☆ Grande", false],
                    ["remover", "🗑", false],
                  ].map(([acao, rotulo, desligado]) => (
                    <form key={acao as string} action={mexerFoto}>
                      <input type="hidden" name="url" value={f.url} />
                      <input type="hidden" name="acao" value={acao as string} />
                      <button type="submit" disabled={desligado as boolean} className="rounded border border-border px-1.5 py-0.5 hover:bg-accent disabled:opacity-30">
                        {rotulo}
                      </button>
                    </form>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {c.fotos.length === 0 && <p className="text-sm text-muted-foreground">Sem fotos: a seção de fotos não aparece no site.</p>}
        </CardContent>
      </Card>
    </>
  );
}
