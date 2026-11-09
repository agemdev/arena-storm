"use server";

import { revalidatePath, updateTag } from "next/cache";
import { exigirAdmin } from "@/lib/auth";
import { normalizarWhats } from "@/lib/whatsapp";

export type Resultado = { ok: boolean; msg: string } | null;

const TIPOS_LOGO: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

const texto = (f: FormData, campo: string, max = 120) =>
  String(f.get(campo) ?? "").trim().replace(/\s+/g, " ").slice(0, max) || null;
const digitos = (f: FormData, campo: string) => String(f.get(campo) ?? "").replace(/\D/g, "") || null;

// Salva o perfil da arena (e troca o logotipo, se enviado)
export async function salvarPerfil(_: Resultado, form: FormData): Promise<Resultado> {
  const { supabase, arenaId } = await exigirAdmin();

  const nome = texto(form, "nome", 80);
  const cnpj = digitos(form, "cnpj");
  const telefone = digitos(form, "telefone");
  const whatsRaw = digitos(form, "whatsapp");
  const whatsapp = whatsRaw ? normalizarWhats(whatsRaw) : null;
  const email = texto(form, "email")?.toLowerCase() ?? null;
  const instagram = texto(form, "instagram", 60)?.replace(/^.*instagram\.com\//i, "").replace(/[@/]/g, "") || null;
  const cep = digitos(form, "cep");
  const cidade_id = Number(form.get("cidade_id")) || null;

  if (!nome || nome.length < 2) return { ok: false, msg: "Digite o nome da arena." };
  if (cnpj && cnpj.length !== 14) return { ok: false, msg: "CNPJ deve ter 14 números." };
  if (telefone && (telefone.length < 10 || telefone.length > 11)) return { ok: false, msg: "Telefone inválido." };
  if (whatsRaw && !whatsapp) return { ok: false, msg: "WhatsApp inválido." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, msg: "E-mail inválido." };
  if (cep && cep.length !== 8) return { ok: false, msg: "CEP deve ter 8 números." };
  if (!cidade_id) return { ok: false, msg: "Selecione a cidade." };

  const dados: Record<string, unknown> = {
    nome, cnpj, telefone, whatsapp, email, instagram, cep, cidade_id,
    logradouro: texto(form, "logradouro"),
    numero: texto(form, "numero", 20),
    complemento: texto(form, "complemento", 60),
    bairro: texto(form, "bairro", 60),
  };

  // Logotipo
  const { data: atual } = await supabase.from("arenas").select("logo_path").eq("id", arenaId).single();
  const logo = form.get("logo");
  let apagar: string | null = null;

  if (logo instanceof File && logo.size > 0) {
    const ext = TIPOS_LOGO[logo.type];
    if (!ext) return { ok: false, msg: "Logotipo deve ser PNG, JPG ou WEBP." };
    if (logo.size > 1024 * 1024) return { ok: false, msg: "Logotipo deve ter no máximo 1MB." };
    const caminho = `${arenaId}/logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("logos").upload(caminho, logo, { contentType: logo.type });
    if (error) return { ok: false, msg: "Erro ao enviar o logotipo." };
    dados.logo_path = caminho;
    apagar = atual?.logo_path ?? null;
  } else if (form.get("remover_logo") === "on") {
    dados.logo_path = null;
    apagar = atual?.logo_path ?? null;
  }

  const { error } = await supabase.from("arenas").update(dados).eq("id", arenaId);
  if (error) return { ok: false, msg: "Erro ao salvar. Tente de novo." };

  if (apagar) await supabase.storage.from("logos").remove([apagar]);

  updateTag("arena"); // atualiza o site público e o topo do painel
  revalidatePath("/painel", "layout");
  return { ok: true, msg: "Perfil salvo! O site já foi atualizado." };
}
