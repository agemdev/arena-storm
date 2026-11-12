"use client";

import { useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/native-select";
import { enviarFotos, salvarTextos } from "./actions";

export type Textos = { titulo: string; chamada: string; aviso: string; numeros: string; estrutura: string; jogos: string; torneios: string; faq: string };

function Campo({ id, rotulo, ajuda, children }: { id: string; rotulo: string; ajuda?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{rotulo}</Label>
      {children}
      {ajuda && <p className="text-xs text-muted-foreground">{ajuda}</p>}
    </div>
  );
}

// Textos do site (uma linha por item; partes separadas por "|")
export function FormTextos({ t }: { t: Textos }) {
  const [res, acao, enviando] = useActionState(salvarTextos, null);
  return (
    <form action={acao} className="space-y-4">
      <Campo id="s-titulo" rotulo="Título principal" ajuda="Coloque entre *asteriscos* a parte colorida. Ex.: O melhor *lobby gamer* da região">
        <Input id="s-titulo" name="titulo" defaultValue={t.titulo} maxLength={80} />
      </Campo>
      <Campo id="s-chamada" rotulo="Frase abaixo do título">
        <Textarea id="s-chamada" name="chamada" rows={2} defaultValue={t.chamada} maxLength={200} />
      </Campo>
      <Campo id="s-aviso" rotulo="Aviso abaixo dos horários (opcional)" ajuda="Ex.: 🌙 Corujão das 22h às 6h. Reserve com antecedência!">
        <Input id="s-aviso" name="aviso" defaultValue={t.aviso} maxLength={150} />
      </Campo>
      <Campo id="s-numeros" rotulo="Números em destaque (até 4)" ajuda="Uma linha cada: número | texto. Ex.: 10 | PCs gamer">
        <Textarea id="s-numeros" name="numeros" rows={3} defaultValue={t.numeros} />
      </Campo>
      <Campo id="s-estrutura" rotulo="Estrutura (cartões)" ajuda="Uma linha cada: emoji | título | texto. Ex.: 🎮 | 4 PlayStation 5 | Os competitivos do momento">
        <Textarea id="s-estrutura" name="estrutura" rows={6} defaultValue={t.estrutura} />
      </Campo>
      <Campo id="s-jogos" rotulo="Jogos (faixa que corre)" ajuda="Separe por vírgula.">
        <Textarea id="s-jogos" name="jogos" rows={2} defaultValue={t.jogos} />
      </Campo>
      <Campo id="s-torneios" rotulo="Próximos torneios" ajuda="Uma linha cada: data | nome | detalhes. Ex.: 20/12/2026 | Camp de FC 26 | Inscrição R$ 20. Os que já passaram somem sozinhos.">
        <Textarea id="s-torneios" name="torneios" rows={3} defaultValue={t.torneios} />
      </Campo>
      <Campo id="s-faq" rotulo="Perguntas frequentes" ajuda="Uma linha cada: pergunta | resposta">
        <Textarea id="s-faq" name="faq" rows={6} defaultValue={t.faq} />
      </Campo>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={enviando}>
          {enviando ? "Salvando..." : "Salvar textos"}
        </Button>
        {res && <p className={`text-sm ${res.ok ? "text-green" : "text-destructive"}`}>{res.msg}</p>}
      </div>
    </form>
  );
}

// Reduz a foto no navegador (máx. 1600 px, JPG) para enviar rápido
async function reduzir(f: File): Promise<File> {
  try {
    const img = await createImageBitmap(f);
    const escala = Math.min(1, 1600 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * escala);
    c.height = Math.round(img.height * escala);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, "image/jpeg", 0.85));
    return blob ? new File([blob], f.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }) : f;
  } catch {
    return f;
  }
}

export function EnviarFotos() {
  const [res, acao, enviando] = useActionState(enviarFotos, null);
  const [preparando, setPreparando] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);
  const enviar = async () => {
    const lista = Array.from(entrada.current?.files ?? []);
    if (!lista.length) return;
    setPreparando(true);
    const f = new FormData();
    for (const x of lista) f.append("fotos", await reduzir(x));
    setPreparando(false);
    acao(f);
    if (entrada.current) entrada.current.value = "";
  };
  return (
    <div className="flex flex-wrap items-center gap-3">
      <input ref={entrada} type="file" accept="image/jpeg,image/png,image/webp" multiple aria-label="Escolher fotos" className="text-sm" />
      <Button type="button" onClick={enviar} disabled={enviando || preparando}>
        {preparando ? "Preparando..." : enviando ? "Enviando..." : "Enviar fotos"}
      </Button>
      {res && <p className={`text-sm ${res.ok ? "text-green" : "text-destructive"}`}>{res.msg}</p>}
    </div>
  );
}
