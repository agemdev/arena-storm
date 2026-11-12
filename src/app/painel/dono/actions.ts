"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { exigirDono } from "@/lib/auth";
import { lerValor } from "@/lib/caixa";
import { normalizarWhats } from "@/lib/whatsapp";
import { NOME_SISTEMA, PLANOS_LICENCA } from "@/lib/sistema";
import { asaas, CICLOS } from "@/lib/asaas";

export type Resultado = { ok: boolean; msg: string } | null;

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const atualizar = () => {
  revalidatePath("/painel", "layout");
  updateTag("arena"); // site: arena nova/apagada
};
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

// ---------- Cobrança automática (Asaas) ----------

// Gera o código secreto do webhook (aparece uma vez para copiar no Asaas)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function gerarTokenWebhook(_: Resultado): Promise<Resultado> {
  const { supabase } = await exigirDono();
  const { data, error } = await supabase.rpc("gerar_token_asaas");
  if (error) return { ok: false, msg: erroBanco(error.message) };
  return { ok: true, msg: String(data) };
}

// Liga a cobrança automática: cria o cliente e a assinatura no Asaas
export async function ativarCobranca(_: Resultado, form: FormData): Promise<Resultado> {
  const { supabase } = await exigirDono();
  const arenaId = String(form.get("arena_id"));
  const doc = String(form.get("cpf_cnpj") ?? "").replace(/\D/g, "");
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const celular = String(form.get("celular") ?? "").replace(/\D/g, "");
  const nome = String(form.get("responsavel") ?? "").trim();
  const plano = String(form.get("plano"));
  const valor = lerValor(String(form.get("valor") ?? ""));
  const primeira = String(form.get("primeira") ?? "");

  if (nome.length < 3) return { ok: false, msg: "Nome do responsável (quem paga)." };
  if (doc.length !== 11 && doc.length !== 14) return { ok: false, msg: "CPF (11 números) ou CNPJ (14 números)." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, msg: "E-mail inválido (a fatura vai para ele)." };
  if (!(plano in CICLOS)) return { ok: false, msg: "Escolha mensal, trimestral, semestral ou anual." };
  if (!(valor > 0)) return { ok: false, msg: "Valor da licença." };
  if (!DATA.test(primeira)) return { ok: false, msg: "Data da primeira cobrança." };

  const { data: l } = await supabase.from("licencas").select("asaas_cliente_id, asaas_assinatura_id, arenas(nome)").eq("arena_id", arenaId).single();
  if (!l) return { ok: false, msg: "Licença não encontrada." };
  if (l.asaas_assinatura_id) return { ok: false, msg: "A cobrança automática já está ligada. Desligue antes para mudar." };
  const arenaNome = (l.arenas as unknown as { nome: string } | null)?.nome ?? "Arena";

  // Guarda os dados de quem paga
  await supabase.from("licencas").update({ responsavel: nome, cpf_cnpj: doc, email, celular: celular || null, plano, valor }).eq("arena_id", arenaId);

  let clienteId = l.asaas_cliente_id as string | null;
  if (!clienteId) {
    const c = await asaas<{ id: string }>("POST", "/customers", {
      name: nome,
      cpfCnpj: doc,
      email,
      mobilePhone: celular || undefined,
      company: arenaNome,
      externalReference: arenaId,
    });
    if (!c.ok) return { ok: false, msg: c.erro };
    clienteId = c.dados.id;
    await supabase.from("licencas").update({ asaas_cliente_id: clienteId }).eq("arena_id", arenaId);
  }

  const a = await asaas<{ id: string }>("POST", "/subscriptions", {
    customer: clienteId,
    billingType: "UNDEFINED", // o cliente escolhe Pix, boleto ou cartão na fatura
    value: valor,
    nextDueDate: primeira,
    cycle: CICLOS[plano as keyof typeof CICLOS],
    description: `Licença ${PLANOS_LICENCA[plano as keyof typeof PLANOS_LICENCA].nome} – ${NOME_SISTEMA} – ${arenaNome}`,
    externalReference: arenaId,
  });
  if (!a.ok) return { ok: false, msg: a.erro };
  await supabase.from("licencas").update({ asaas_assinatura_id: a.dados.id }).eq("arena_id", arenaId);
  atualizar();
  return { ok: true, msg: "Cobrança automática ligada! O Asaas envia a fatura ao e-mail do cliente." };
}

// Desliga a cobrança automática (remove a assinatura no Asaas; cobranças já pagas não mudam)
export async function cancelarCobranca(_: Resultado, form: FormData): Promise<Resultado> {
  const { supabase } = await exigirDono();
  const arenaId = String(form.get("arena_id"));
  const { data: l } = await supabase.from("licencas").select("asaas_assinatura_id").eq("arena_id", arenaId).single();
  if (!l?.asaas_assinatura_id) return { ok: false, msg: "Não há cobrança automática ligada." };
  const r = await asaas("DELETE", `/subscriptions/${l.asaas_assinatura_id}`);
  if (!r.ok) return { ok: false, msg: r.erro };
  await supabase
    .from("licencas")
    .update({ asaas_assinatura_id: null, cobranca_id: null, cobranca_vence: null, link_pagamento: null })
    .eq("arena_id", arenaId);
  atualizar();
  return { ok: true, msg: "Cobrança automática desligada." };
}
