"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { exigirDono } from "@/lib/auth";
import { lerValor } from "@/lib/caixa";
import { normalizarWhats } from "@/lib/whatsapp";
import { PLANOS_LICENCA } from "@/lib/sistema";

export type Resultado = { ok: boolean; msg: string } | null;

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const atualizar = () => revalidatePath("/painel", "layout");
const erroBanco = (m: string) => m.replace(/^.*?:\s*/, "");

// Cria o login do admin da arena (o admin pode trocar a senha depois). Sem chave secreta: usa o cadastro normal.
async function criarLogin(email: string, senha: string): Promise<{ erro: string } | { id: string; confirmar: boolean }> {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb.auth.signUp({ email, password: senha });
  if (error) return { erro: error.message.includes("already") ? "Esse e-mail já tem login." : `Não deu para criar o login: ${error.message}` };
  // E-mail já cadastrado: o Supabase devolve usuário sem "identities"
  if (!data.user || data.user.identities?.length === 0) return { erro: "Esse e-mail já tem login. Use “Adicionar admin” com outro e-mail." };
  return { id: data.user.id, confirmar: !data.session };
}

// Nova arena + licença + login do admin
export async function criarArena(_: Resultado, form: FormData): Promise<Resultado> {
  const { supabase } = await exigirDono();
  const nome = String(form.get("nome") ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
  const slug = String(form.get("slug") ?? "").trim().toLowerCase();
  const whats = String(form.get("whatsapp") ?? "");
  const whatsapp = whats ? normalizarWhats(whats) : null;
  const plano = String(form.get("plano"));
  const valor = lerValor(String(form.get("valor") ?? "0"));
  const vence = String(form.get("vence_em") ?? "");
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const senha = String(form.get("senha") ?? "");

  if (nome.length < 2) return { ok: false, msg: "Digite o nome da arena." };
  if (slug && !/^[a-z0-9]([a-z0-9-]{1,38}[a-z0-9])$/.test(slug)) return { ok: false, msg: "Endereço: só letras minúsculas, números e hífen (3 a 40)." };
  if (whats && !whatsapp) return { ok: false, msg: "WhatsApp inválido." };
  if (!(plano in PLANOS_LICENCA)) return { ok: false, msg: "Escolha o plano." };
  if (plano !== "cortesia" && !DATA.test(vence)) return { ok: false, msg: "Informe o vencimento da licença." };
  if (!(valor >= 0)) return { ok: false, msg: "Valor inválido." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, msg: "E-mail do admin inválido." };
  if (senha.length < 8) return { ok: false, msg: "Senha provisória: mínimo 8 caracteres." };

  const { data: arenaId, error } = await supabase.rpc("criar_arena", {
    p_nome: nome,
    p_slug: slug,
    p_whatsapp: whatsapp,
    p_plano: plano,
    p_valor: valor,
    p_vence_em: plano === "cortesia" ? null : vence,
    p_responsavel: String(form.get("responsavel") ?? ""),
    p_contato: String(form.get("contato") ?? ""),
  });
  if (error?.code === "23505") return { ok: false, msg: "Esse endereço (apelido) já é de outra arena." };
  if (error) return { ok: false, msg: `Erro ao criar a arena: ${erroBanco(error.message)}` };

  const login = await criarLogin(email, senha);
  atualizar();
  if ("erro" in login) return { ok: false, msg: `Arena criada, mas o login não: ${login.erro} Use “Adicionar admin” na lista.` };
  const { error: e2 } = await supabase.rpc("vincular_admin", { p_arena: arenaId, p_user: login.id });
  if (e2) return { ok: false, msg: `Arena e login criados, mas não deu para ligar os dois: ${erroBanco(e2.message)}` };
  return {
    ok: true,
    msg: `${nome} criada! Login: ${email}${login.confirmar ? " (o admin precisa confirmar pelo link enviado ao e-mail antes de entrar)" : ""}.`,
  };
}

// Pagamento recebido → soma o período na licença
export async function registrarPagamento(_: Resultado, form: FormData): Promise<Resultado> {
  const { supabase } = await exigirDono();
  const plano = String(form.get("plano"));
  const valor = lerValor(String(form.get("valor") ?? ""));
  const pagoEm = String(form.get("pago_em") ?? "");
  if (!(plano in PLANOS_LICENCA) || plano === "cortesia") return { ok: false, msg: "Escolha o período pago." };
  if (!(valor >= 0)) return { ok: false, msg: "Valor inválido." };
  const { data, error } = await supabase.rpc("registrar_pagamento_licenca", {
    p_arena: String(form.get("arena_id")),
    p_plano: plano,
    p_valor: valor,
    p_pago_em: DATA.test(pagoEm) ? pagoEm : null,
    p_obs: String(form.get("obs") ?? ""),
  });
  if (error) return { ok: false, msg: erroBanco(error.message) };
  atualizar();
  return { ok: true, msg: `Pagamento registrado. Novo vencimento: ${String(data).split("-").reverse().join("/")}.` };
}

// Corrigir licença à mão (plano, valor, vencimento, observação)
export async function editarLicenca(_: Resultado, form: FormData): Promise<Resultado> {
  const { supabase } = await exigirDono();
  const plano = String(form.get("plano"));
  const vence = String(form.get("vence_em") ?? "");
  const valor = lerValor(String(form.get("valor") ?? "0"));
  if (!(plano in PLANOS_LICENCA)) return { ok: false, msg: "Plano inválido." };
  if (plano !== "cortesia" && !DATA.test(vence)) return { ok: false, msg: "Informe o vencimento." };
  const { error } = await supabase
    .from("licencas")
    .update({
      plano,
      valor: valor >= 0 ? valor : 0,
      vence_em: plano === "cortesia" ? null : vence,
      responsavel: String(form.get("responsavel") ?? "").trim() || null,
      contato: String(form.get("contato") ?? "").trim() || null,
      obs: String(form.get("obs") ?? "").trim().slice(0, 300) || null,
      atualizado_em: new Date().toISOString(),
    })
    .eq("arena_id", String(form.get("arena_id")));
  if (error) return { ok: false, msg: "Erro ao salvar a licença." };
  atualizar();
  return { ok: true, msg: "Licença salva." };
}

// Mais um admin para a arena
export async function adicionarAdmin(_: Resultado, form: FormData): Promise<Resultado> {
  const { supabase } = await exigirDono();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const senha = String(form.get("senha") ?? "");
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, msg: "E-mail inválido." };
  if (senha.length < 8) return { ok: false, msg: "Senha provisória: mínimo 8 caracteres." };
  const login = await criarLogin(email, senha);
  if ("erro" in login) return { ok: false, msg: login.erro };
  const { error } = await supabase.rpc("vincular_admin", { p_arena: String(form.get("arena_id")), p_user: login.id });
  if (error) return { ok: false, msg: erroBanco(error.message) };
  atualizar();
  return { ok: true, msg: `Admin ${email} adicionado${login.confirmar ? " (precisa confirmar pelo e-mail)" : ""}.` };
}

// Apagar de vez (só "pronta para apagar" + nome digitado igual)
export async function apagarArena(_: Resultado, form: FormData): Promise<Resultado> {
  const { supabase } = await exigirDono();
  const { error } = await supabase.rpc("apagar_arena", { p_arena: String(form.get("arena_id")), p_confirma_nome: String(form.get("confirma") ?? "") });
  if (error) return { ok: false, msg: erroBanco(error.message) };
  atualizar();
  return { ok: true, msg: "Arena apagada." };
}
