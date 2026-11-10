// Conexão do Servidor com a nuvem (Supabase). O login fica salvo (sem guardar a senha).
const fs = require("node:fs");
const path = require("node:path");
const { app } = require("electron");
const { createClient } = require("@supabase/supabase-js");
const config = require("./config");

// Guarda a sessão do login num arquivo (em vez do navegador)
const arquivoSessao = () => path.join(app.getPath("userData"), "sessao.json");
const armazenamento = {
  getItem: (k) => {
    try {
      return JSON.parse(fs.readFileSync(arquivoSessao(), "utf8"))[k] ?? null;
    } catch {
      return null;
    }
  },
  setItem: (k, v) => {
    let tudo = {};
    try {
      tudo = JSON.parse(fs.readFileSync(arquivoSessao(), "utf8"));
    } catch {
      /* primeiro login */
    }
    tudo[k] = v;
    fs.writeFileSync(arquivoSessao(), JSON.stringify(tudo));
  },
  removeItem: (k) => armazenamento.setItem(k, undefined),
};

let cliente = null;
function supabase() {
  if (cliente) return cliente;
  const { url, chave } = config.nuvem();
  if (!url || !chave) throw new Error("Endereço da nuvem não configurado (nuvem.json).");
  cliente = createClient(url, chave, {
    auth: { storage: armazenamento, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
  return cliente;
}

async function entrar(email, senha) {
  const { data, error } = await supabase().auth.signInWithPassword({ email, password: senha });
  if (error) throw new Error(error.message === "Invalid login credentials" ? "E-mail ou senha errados." : error.message);
  return data.user;
}

async function usuario() {
  const { data } = await supabase().auth.getSession();
  return data.session?.user ?? null;
}

async function sair() {
  await supabase().auth.signOut();
}

module.exports = { supabase, entrar, usuario, sair };
