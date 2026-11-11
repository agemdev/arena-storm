// Configuração local do programa (arquivo JSON na pasta do usuário do Windows)
const fs = require("node:fs");
const path = require("node:path");
const { app } = require("electron");

function arquivo() {
  return path.join(app.getPath("userData"), "config.json");
}

function ler() {
  try {
    return JSON.parse(fs.readFileSync(arquivo(), "utf8"));
  } catch {
    return {};
  }
}

function salvar(dados) {
  const atual = { ...ler(), ...dados };
  fs.mkdirSync(path.dirname(arquivo()), { recursive: true });
  fs.writeFileSync(arquivo(), JSON.stringify(atual, null, 2));
  return atual;
}

// Endereço e chave pública do Supabase (só o Servidor usa). Procura, nesta ordem:
// nuvem.json junto do programa → nuvem.json salvo antes → .env.local do site (teste) → pergunta ao site da arena
const SITE = "https://arena-storm.vercel.app";
let nuvemCache = null;

function lerJson(arq) {
  try {
    const j = JSON.parse(fs.readFileSync(arq, "utf8"));
    return j.url && j.chave ? j : null;
  } catch {
    return null;
  }
}

function nuvemLocal() {
  const salvo = path.join(app.getPath("userData"), "nuvem.json");
  const achado = lerJson(path.join(__dirname, "..", "nuvem.json")) ?? lerJson(path.join(process.resourcesPath ?? "", "nuvem.json")) ?? lerJson(salvo);
  if (achado) return achado;
  try {
    const env = fs.readFileSync(path.join(__dirname, "..", "..", ".env.local"), "utf8");
    const pegar = (k) => env.match(new RegExp(`^${k}=(.*)$`, "m"))?.[1]?.trim().replace(/^"|"$/g, "");
    const j = { url: pegar("NEXT_PUBLIC_SUPABASE_URL"), chave: pegar("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") };
    return j.url && j.chave ? j : null;
  } catch {
    return null;
  }
}

// Chamar uma vez ao abrir o Servidor (precisa de internet só na 1ª vez; depois fica salvo)
async function prepararNuvem() {
  nuvemCache = nuvemLocal();
  if (nuvemCache) return nuvemCache;
  const r = await fetch(`${SITE}/api/agente`);
  if (!r.ok) throw new Error(`Não consegui falar com o site da arena (${r.status}). Verifique a internet.`);
  const j = await r.json();
  if (!j.url || !j.chave) throw new Error("O site não informou o endereço da nuvem.");
  fs.mkdirSync(app.getPath("userData"), { recursive: true });
  fs.writeFileSync(path.join(app.getPath("userData"), "nuvem.json"), JSON.stringify({ url: j.url, chave: j.chave }));
  nuvemCache = j;
  return j;
}

function nuvem() {
  return nuvemCache ?? nuvemLocal() ?? { url: null, chave: null };
}

module.exports = { ler, salvar, nuvem, prepararNuvem, arquivo };
