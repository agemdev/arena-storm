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

// Endereço e chave pública do Supabase (só o Servidor usa).
// Em teste: lê do .env.local do site. No instalador (6b): arquivo nuvem.json junto do programa.
function nuvem() {
  const candidatos = [path.join(__dirname, "..", "nuvem.json"), path.join(process.resourcesPath ?? "", "nuvem.json")];
  for (const c of candidatos) {
    try {
      return JSON.parse(fs.readFileSync(c, "utf8"));
    } catch {
      /* tenta o próximo */
    }
  }
  try {
    const env = fs.readFileSync(path.join(__dirname, "..", "..", ".env.local"), "utf8");
    const pegar = (k) => env.match(new RegExp(`^${k}=(.*)$`, "m"))?.[1]?.trim().replace(/^"|"$/g, "");
    return { url: pegar("NEXT_PUBLIC_SUPABASE_URL"), chave: pegar("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") };
  } catch {
    return { url: null, chave: null };
  }
}

module.exports = { ler, salvar, nuvem, arquivo };
