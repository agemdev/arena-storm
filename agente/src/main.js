// Arena Storm — programa dos PCs. Um só programa com dois modos:
//   "pc"       → PC de jogo (bloqueio, contador, avisos, acesso mestre)
//   "servidor" → PC Servidor (hub entre a nuvem e os PCs)
// Teste: npm run pc  /  npm run servidor
const fs = require("node:fs");
const path = require("node:path");
const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require("electron");

// ---------- Qual modo? (argumento --modo=... ou o que foi escolhido na 1ª vez) ----------
// ARENA_TESTE=1 → pasta temporária e tela de bloqueio pequena (para testar sem travar o computador)
const TESTE = process.env.ARENA_TESTE === "1";
const pastaBase = TESTE ? path.join(require("node:os").tmpdir(), "ArenaStormTeste") : path.join(app.getPath("appData"), "ArenaStorm");
const arquivoModo = path.join(pastaBase, "modo.json");
const argModo = process.argv.find((a) => a.startsWith("--modo="))?.split("=")[1];
let modo = ["pc", "servidor"].includes(argModo) ? argModo : null;
if (!modo) {
  try {
    modo = JSON.parse(fs.readFileSync(arquivoModo, "utf8")).modo;
  } catch {
    modo = null;
  }
}
// Cada modo tem sua pasta (dá para testar os dois no mesmo computador)
app.setPath("userData", path.join(pastaBase, modo ?? "inicio"));

if (!app.requestSingleInstanceLock()) app.quit();

const PRELOAD = path.join(__dirname, "preload.js");
const ICONE = path.join(__dirname, "..", "assets", "logo.jpg");
let pc = null;
let hub = null;
let janelaServidor = null;
let tray = null;

app.whenReady().then(async () => {
  if (!modo) return escolherModo();
  if (modo === "pc") return iniciarPC();
  return iniciarServidor();
});

// Programa de PC não fecha quando as janelas somem
app.on("window-all-closed", (e) => e.preventDefault?.());

// ---------- 1ª vez: escolher o modo ----------
function escolherModo() {
  const j = new BrowserWindow({ width: 520, height: 420, resizable: false, autoHideMenuBar: true, icon: ICONE, webPreferences: { preload: PRELOAD } });
  j.loadFile(path.join(__dirname, "telas", "inicio.html"));
  ipcMain.handle("inicio:modo", (_e, escolhido) => {
    if (!["pc", "servidor"].includes(escolhido)) return;
    fs.mkdirSync(pastaBase, { recursive: true });
    fs.writeFileSync(arquivoModo, JSON.stringify({ modo: escolhido }));
    app.relaunch({ args: process.argv.slice(1).filter((a) => !a.startsWith("--modo=")).concat(`--modo=${escolhido}`) });
    app.exit(0);
  });
}

// ---------- Modo PC ----------
function iniciarPC() {
  const { PC } = require("./pc");
  pc = new PC();
  pc.iniciar();
  ipcMain.handle("mestre:acao", (_e, dados) => pc.acaoMestre(dados));
  ipcMain.handle("mestre:fechar", (e) => BrowserWindow.fromWebContents(e.sender)?.close());
}

// ---------- Modo Servidor ----------
async function iniciarServidor() {
  const nuvem = require("./nuvem");
  janelaServidor = new BrowserWindow({
    width: 720,
    height: 620,
    autoHideMenuBar: true,
    icon: ICONE,
    title: "Arena Storm — Servidor",
    webPreferences: { preload: PRELOAD },
  });
  janelaServidor.loadFile(path.join(__dirname, "telas", "servidor.html"));
  // Fechar a janela só esconde (o Servidor continua rodando na bandeja)
  janelaServidor.on("close", (e) => {
    if (!app.saindo) {
      e.preventDefault();
      janelaServidor.hide();
    }
  });
  criarBandeja();

  ipcMain.handle("servidor:entrar", async (_e, { email, senha }) => {
    try {
      await nuvem.entrar(email, senha);
      ligarHub();
      return { ok: true };
    } catch (e) {
      return { ok: false, msg: e.message };
    }
  });
  ipcMain.handle("servidor:sair", async () => {
    await nuvem.sair();
    app.relaunch();
    app.exit(0);
  });

  janelaServidor.webContents.once("did-finish-load", async () => {
    let user = null;
    try {
      user = await nuvem.usuario();
    } catch (e) {
      janelaServidor.webContents.send("servidor:erro", e.message);
      return;
    }
    if (user) ligarHub(user.email);
    else janelaServidor.webContents.send("servidor:login");
  });
}

function ligarHub(email) {
  if (hub) return;
  const { Hub } = require("./hub");
  hub = new Hub();
  hub.on("status", (s) => janelaServidor?.webContents.send("servidor:status", { ...s, email }));
  hub.on("log", (l) => janelaServidor?.webContents.send("servidor:log", l));
  hub.iniciar();
}

function criarBandeja() {
  const img = nativeImage.createFromPath(ICONE).resize({ width: 16, height: 16 });
  tray = new Tray(img);
  tray.setToolTip("Arena Storm — Servidor");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Abrir", click: () => janelaServidor?.show() },
      {
        label: "Fechar o Servidor",
        click: () => {
          app.saindo = true;
          app.quit();
        },
      },
    ]),
  );
  tray.on("double-click", () => janelaServidor?.show());
}
