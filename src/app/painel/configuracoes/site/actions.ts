"use server";

import { revalidatePath, updateTag } from "next/cache";
import { exigirAdmin } from "@/lib/auth";
import type { Foto } from "@/lib/site";

export type Resultado = { ok: boolean; msg: string } | null;

const PAGINA = "/painel/configuracoes/site";
const limpar = (v: FormDataEntryValue | null, max = 300) => String(v ?? "").trim().replace(/[ \t]+/g, " ").slice(0, max);
// Uma linha = um item; partes separadas por "|"
const linhas = (v: FormDataEntryValue | null) =>
  String(v ?? "")
    .split("\n")
    .map((l) => l.split("|").map((x) => x.trim()))
    .filter((p) => p.some(Boolean))
    .slice(0, 30);

function salvo() {
  updateTag("arena"); // atualiza o site público
  revalidatePath(PAGINA);
}

// Textos do site
export async function salvarTextos(_: Resultado, form: FormData): Promise<Resultado> {
  const { supabase, arenaId } = await exigirAdmin();

  const torneios = [];
  for (const [data, titulo, texto] of linhas(form.get("torneios"))) {
    const m = data?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m || !titulo) return { ok: false, msg: `Torneio inválido: "${data ?? ""}". Use: 20/12/2026 | Nome | detalhes` };
    torneios.push({ data: `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`, titulo: titulo.slice(0, 60), texto: (texto ?? "").slice(0, 120) });
  }

  const dados = {
    arena_id: arenaId,
    titulo: limpar(form.get("titulo"), 80),
    chamada: limpar(form.get("chamada"), 200),
    aviso: limpar(form.get("aviso"), 150),
    numeros: linhas(form.get("numeros"))
      .filter(([v, l]) => v && l)
      .slice(0, 4)
      .map(([valor, label]) => ({ valor: valor.slice(0, 8), label: label.slice(0, 30) })),
    estrutura: linhas(form.get("estrutura"))
      .filter(([, t]) => t)
      .map(([icone, titulo, texto]) => ({ icone: (icone || "⭐").slice(0, 4), titulo: titulo.slice(0, 40), texto: (texto ?? "").slice(0, 200) })),
    jogos: String(form.get("jogos") ?? "")
      .split(/[\n,]/)
      .map((j) => j.trim().slice(0, 30))
      .filter(Boolean)
      .slice(0, 40),
    torneios,
    faq: linhas(form.get("faq"))
      .filter(([p, r]) => p && r)
      .map(([p, r]) => ({ p: p.slice(0, 120), r: r.slice(0, 500) })),
    atualizado_em: new Date().toISOString(),
  };
  const { error } = await supabase.from("site_conteudo").upsert(dados);
  if (error) return { ok: false, msg: "Erro ao salvar (licença em dia?)." };
  salvo();
  return { ok: true, msg: "Site atualizado!" };
}

async function fotosAtuais(arenaId: string, supabase: Awaited<ReturnType<typeof exigirAdmin>>["supabase"]) {
  const { data } = await supabase.from("site_conteudo").select("fotos").eq("arena_id", arenaId).maybeSingle();
  return ((data?.fotos ?? []) as Foto[]).slice();
}

async function gravarFotos(arenaId: string, supabase: Awaited<ReturnType<typeof exigirAdmin>>["supabase"], fotos: Foto[]) {
  const { error } = await supabase.from("site_conteudo").upsert({ arena_id: arenaId, fotos, atualizado_em: new Date().toISOString() });
  if (!error) salvo();
  return error;
}

// Enviar fotos (já chegam reduzidas pelo navegador)
export async function enviarFotos(_: Resultado, form: FormData): Promise<Resultado> {
  const { supabase, arenaId } = await exigirAdmin();
  const arquivos = form.getAll("fotos").filter((f): f is File => f instanceof File && f.size > 0);
  if (!arquivos.length) return { ok: false, msg: "Escolha as fotos." };
  const fotos = await fotosAtuais(arenaId, supabase);
  if (fotos.length + arquivos.length > 16) return { ok: false, msg: "Máximo de 16 fotos no site." };

  for (const f of arquivos) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type) || f.size > 3 * 1024 * 1024) return { ok: false, msg: `${f.name}: use JPG/PNG até 3 MB.` };
    const caminho = `${arenaId}/${crypto.randomUUID()}.${f.type.split("/")[1].replace("jpeg", "jpg")}`;
    const { error } = await supabase.storage.from("fotos").upload(caminho, f, { contentType: f.type });
    if (error) return { ok: false, msg: "Erro ao enviar a foto (licença em dia?)." };
    fotos.push({ url: supabase.storage.from("fotos").getPublicUrl(caminho).data.publicUrl, alt: "Foto da arena" });
  }
  const error = await gravarFotos(arenaId, supabase, fotos);
  if (error) return { ok: false, msg: "Fotos enviadas, mas não salvas no site." };
  return { ok: true, msg: `${arquivos.length} foto(s) adicionada(s)!` };
}

// Remover / destacar / mover / legenda de uma foto
export async function mexerFoto(form: FormData) {
  const { supabase, arenaId } = await exigirAdmin();
  const fotos = await fotosAtuais(arenaId, supabase);
  const i = fotos.findIndex((f) => f.url === String(form.get("url")));
  if (i < 0) return;
  const acao = String(form.get("acao"));
  if (acao === "remover") {
    const [f] = fotos.splice(i, 1);
    // Foto do Storage desta arena: apaga o arquivo também
    const marca = `/storage/v1/object/public/fotos/`;
    if (f.url.includes(marca)) await supabase.storage.from("fotos").remove([f.url.split(marca)[1]]);
  } else if (acao === "grande") fotos[i] = { ...fotos[i], grande: !fotos[i].grande };
  else if (acao === "subir" && i > 0) [fotos[i - 1], fotos[i]] = [fotos[i], fotos[i - 1]];
  else if (acao === "descer" && i < fotos.length - 1) [fotos[i + 1], fotos[i]] = [fotos[i], fotos[i + 1]];
  else if (acao === "legenda") fotos[i] = { ...fotos[i], alt: limpar(form.get("alt"), 80) || "Foto da arena" };
  await gravarFotos(arenaId, supabase, fotos);
}
