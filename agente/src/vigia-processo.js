// VIGIA (processo escondido, sem janela): se o programa for fechado à força
// (ex.: Gerenciador de Tarefas), abre de novo em 2 segundos.
// Saída autorizada (acesso mestre / desinstalar) deixa um arquivo "saida.ok" → o vigia só sai.
const fs = require("node:fs");
const { spawn } = require("node:child_process");

const [pai, exe, flag, ...args] = process.argv.slice(2);

setInterval(() => {
  try {
    process.kill(Number(pai), 0); // ainda está vivo?
    return;
  } catch {
    /* morreu */
  }
  if (fs.existsSync(flag)) {
    try {
      fs.unlinkSync(flag);
    } catch {
      /* ok */
    }
    process.exit(0);
  }
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE; // o programa reaberto é o normal (com janelas)
  spawn(exe, args, { detached: true, stdio: "ignore", windowsHide: true, env }).unref();
  process.exit(0);
}, 2000);
