"use server";

import { redirect } from "next/navigation";
import { criarSupabase } from "@/lib/supabase/server";

// Entrar com e-mail e senha
export async function entrar(_: string | null, form: FormData) {
  const email = String(form.get("email") ?? "").trim();
  const senha = String(form.get("senha") ?? "");
  if (!email || !senha) return "Preencha e-mail e senha.";

  const supabase = await criarSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) return "E-mail ou senha incorretos.";

  redirect("/painel");
}

// Sair do painel
export async function sair() {
  const supabase = await criarSupabase();
  await supabase.auth.signOut();
  redirect("/login");
}
