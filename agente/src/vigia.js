// Proteção do programa: abre com o Windows e volta sozinho se for fechado à força.
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { app } = require("electron");

const NOME_INICIO = "ArenaStorm"; // nome na lista de "abrir com o Windows"
let filho = null;
let ligado = false;

const flag = () => path.join(app.getPath("userData"), "saida.ok");

// Só no programa instalado (em teste com npm não atrapalha)
function ativo() {
  return app.isPackaged || process.env.ARENA_VIGIA === "1";
}

function abrirComWindows(sim = true) {
  if (!app.isPackaged || process.env.ARENA_TESTE === "1") return; // teste: não mexe no Windows
  app.setLoginItemSettings({ openAtLogin: sim, path: process.execPath, name: NOME_INICIO });
}

function lancarVigia() {
  const script = path.join(__dirname, "vigia-processo.js");
  const args = process.argv.slice(1).filter((a) => !a.startsWith("--inspect"));
  filho = spawn(process.execPath, [script, String(process.pid), process.execPath, flag(), ...(app.isPackaged ? [] : args)], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" }, // roda como Node puro (sem janela)
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  filho.unref();
}

// Liga o vigia e confere a cada 5 s se ele continua vivo (se matarem o vigia, cria outro)
function ligar() {
  if (!ativo() || ligado) return;
  ligado = true;
  try {
    fs.rmSync(flag(), { force: true }); // abriu de novo: limpa saída antiga
  } catch {
    /* ok */
  }
  abrirComWindows(true);
  lancarVigia();
  setInterval(() => {
    if (app.saindo) return; // fechando de verdade: não recria o vigia
    try {
      process.kill(filho.pid, 0);
    } catch {
      lancarVigia();
    }
  }, 5000);
}

// Fechar de verdade (autorizado): avisa o vigia para não reabrir
function sairDeVerdade() {
  try {
    fs.mkdirSync(path.dirname(flag()), { recursive: true });
    fs.writeFileSync(flag(), String(Date.now()));
  } catch {
    /* ok */
  }
  app.saindo = true;
  app.quit();
}

module.exports = { ligar, sairDeVerdade, abrirComWindows };
