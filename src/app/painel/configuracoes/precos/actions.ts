"use server";

import { revalidatePath, updateTag } from "next/cache";
import { exigirAdmin } from "@/lib/auth";

export type Resultado = { ok: boolean; msg: string } | null;

const texto = (f: FormData, campo: string, max: number) =>
  String(f.get(campo) ?? "").trim().replace(/\s+/g, " ").slice(0, max) || null;

// Cria, edita ou exclui um plano/pacote (botão "acao" decide)
export async function salvarPlano(_: Resultado, form: FormData): Promise<Resultado> {
  const { supabase, arenaId } = await exigirAdmin();
  const id = String(form.get("id") ?? "");

  if (form.get("acao") === "excluir" && id) {
    const { error } = await supabase.from("planos").delete().eq("id", id);
    if (error) return { ok: false, msg: "Erro ao excluir." };
    updateTag("arena");
    revalidatePath("/painel/configuracoes/precos");
    return { ok: true, msg: "Excluído." };
  }

  const categoria = form.get("categoria") === "festa" ? "festa" : "plano";
  const nome = texto(form, "nome", 60);
  // Aceita "12", "12,50" ou "1.234,50"
  const preco = Number(String(form.get("preco") ?? "").replace(/\./g, "").replace(",", "."));
  const itens = String(form.get("itens") ?? "")
    .split("\n")
    .map((i) => i.trim())
    .filter(Boolean)
    .slice(0, 8);

  if (!nome || nome.length < 2) return { ok: false, msg: "Digite o nome." };
  if (!Number.isFinite(preco) || preco < 0) return { ok: false, msg: "Preço inválido. Ex: 12 ou 12,50" };

  const dados = {
    categoria,
    nome,
    preco,
    unidade: texto(form, "unidade", 20),
    descricao: texto(form, "descricao", 120),
    itens,
    destaque: form.get("destaque") === "on",
    ativo: form.get("ativo") === "on",
    ordem: Number(form.get("ordem")) || 0,
  };

  const { error } = id
    ? await supabase.from("planos").update(dados).eq("id", id)
    : await supabase.from("planos").insert({ arena_id: arenaId, ...dados });
  if (error) return { ok: false, msg: "Erro ao salvar. Tente de novo." };

  updateTag("arena"); // atualiza o site
  revalidatePath("/painel/configuracoes/precos");
  return { ok: true, msg: id ? "Salvo!" : `${nome} criado!` };
}
