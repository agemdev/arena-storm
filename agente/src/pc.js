// MODO PC: obedece ao Caixa (via Servidor).
// Livre = tela de bloqueio · Em uso = contador no canto · 5 min = faixa amarela · Acabou = faixa vermelha fixa (deixa jogar)
// Ctrl + Alt + Shift + A = acesso mestre (senha do painel)
const os = require("node:os");
const path = require("node:path");
const dgram = require("node:dgram");
const { BrowserWindow, Notification, globalShortcut, screen, app, shell } = require("electron");
const WebSocket = require("ws");
const bcrypt = require("bcryptjs");
const P = require("./protocolo");
const config = require("./config");

const PRELOAD = path.join(__dirname, "preload.js");
const tela = (nome) => path.join(__dirname, "telas", nome);
const NOMES_SITUACAO = { manutencao: "Manutenção", funcionario: "Funcionário", sem_cobranca: "Uso sem cobrança" };

class PC {
  constructor() {
    const c = config.ler();
    this.hubIp = c.hubIp ?? null;
    this.ipManual = !!c.ipManual; // IP digitado no acesso mestre (não procura sozinho)
    this.agenteId = c.agenteId ?? null;
    this.equipamentoId = c.equipamentoId ?? null;
    this.maquina = c.maquina ?? null; // {id, nome}
    this.maquinas = c.maquinas ?? [];
    this.arena = c.arena ?? { nome: "Arena Storm" };
    this.senhaHash = c.senhaHash ?? null;
    this.estado = c.ultimoEstado ?? null;
    this.desativado = c.desativado ? "sempre" : null; // "sempre" | "ate_reiniciar" | null
    this.ws = null;
    this.conectado = false;
    this.offset = 0; // diferença do relógio do Servidor
    this.pendentes = []; // mensagens para mandar quando reconectar
    this.modoAnterior = null;
    this.janelas = {};
  }

  // ---------- Início ----------
  iniciar() {
    this.criarJanelas();
    const ok = globalShortcut.register(P.ATALHO_MESTRE, () => this.abrirMestre());
    if (!ok) console.log("Atalho Ctrl+Alt+Shift+A ocupado por outro programa");
    this.conectar();
    setInterval(() => this.atualizarTela(), 1000);
    this.atualizarTela();
  }

  agora() {
    return Date.now() + this.offset;
  }

  // ---------- Conexão com o Servidor ----------
  async conectar() {
    const ip = this.hubIp || (await this.descobrir());
    if (!ip) return setTimeout(() => this.conectar(), 3000);
    const ws = new WebSocket(`ws://${ip}:${P.PORTA_WS}`, { handshakeTimeout: 4000 });
    this.ws = ws;
    let pulso;
    ws.on("open", () => {
      this.conectado = true;
      if (this.hubIp !== ip) this.guardar({ hubIp: ip });
      this.hubIp = ip;
      this.enviar({
        t: "ola",
        nomePc: os.hostname(),
        versao: app.getVersion(),
        agenteId: this.agenteId,
        equipamentoId: this.equipamentoId,
        estado: this.desativado ? "desativado" : "ativo",
      });
      for (const m of this.pendentes.splice(0)) this.enviar(m);
      pulso = setInterval(() => this.enviar({ t: "pulso", estado: this.desativado ? "desativado" : "ativo" }), P.PULSO_MS);
      this.atualizarTela();
    });
    ws.on("message", (bruto) => {
      try {
        this.receber(JSON.parse(bruto.toString()));
      } catch {
        /* mensagem estranha: ignora */
      }
    });
    const fechou = () => {
      clearInterval(pulso);
      if (this.ws !== ws) return;
      this.conectado = false;
      this.ws = null;
      this.atualizarTela();
      // Se o IP salvo não responde mais, procura de novo na rede
      this.falhas = (this.falhas ?? 0) + 1;
      if (this.falhas >= 3 && !this.ipManual) this.hubIp = null;
      setTimeout(() => this.conectar(), 3000);
    };
    ws.on("close", fechou);
    ws.on("error", () => {}); // o "close" vem logo depois
  }

  // Grita na rede "cadê o Servidor?" e espera 2 s pela resposta
  descobrir() {
    return new Promise((resolve) => {
      const udp = dgram.createSocket("udp4");
      const fim = (ip) => {
        clearTimeout(t);
        try {
          udp.close();
        } catch {
          /* já fechado */
        }
        resolve(ip);
      };
      const t = setTimeout(() => fim(null), 2000);
      udp.on("message", (msg, rinfo) => msg.toString() === P.RESPOSTA && fim(rinfo.address));
      udp.on("error", () => fim(null));
      udp.bind(() => {
        udp.setBroadcast(true);
        udp.send(P.PERGUNTA, P.PORTA_DESCOBERTA, "255.255.255.255");
      });
    });
  }

  enviar(msg) {
    if (this.ws?.readyState === 1) this.ws.send(JSON.stringify(msg));
    else if (["mestre", "escolher", "estado_agente"].includes(msg.t)) this.pendentes.push(msg);
  }

  receber(msg) {
    switch (msg.t) {
      case "boas_vindas":
        this.falhas = 0;
        this.arena = msg.arena ?? this.arena;
        this.maquinas = msg.maquinas ?? [];
        if (msg.senhaHash) this.senhaHash = msg.senhaHash;
        this.guardar({ arena: this.arena, maquinas: this.maquinas, senhaHash: this.senhaHash });
        // Primeira vez: precisa dizer qual máquina é este PC
        if (!this.equipamentoId) this.abrirMestre("escolher");
        break;
      case "registrado":
        this.agenteId = msg.agenteId;
        this.guardar({ agenteId: this.agenteId });
        break;
      case "maquina":
        this.equipamentoId = msg.equipamentoId;
        this.guardar({ equipamentoId: this.equipamentoId });
        break;
      case "estado":
        this.offset = (msg.horaServidor ?? Date.now()) - Date.now();
        if (msg.senhaHash) this.senhaHash = msg.senhaHash;
        if (msg.arena) this.arena = msg.arena;
        this.maquina = msg.maquina ?? this.maquina;
        this.estado = msg.estado;
        this.guardar({ ultimoEstado: this.estado, maquina: this.maquina, senhaHash: this.senhaHash, arena: this.arena });
        this.atualizarTela();
        break;
      case "erro":
        this.janelas.mestre?.webContents.send("mestre:erro", msg.msg);
        break;
    }
  }

  guardar(dados) {
    config.salvar(dados);
  }

  // ---------- O que mostrar agora ----------
  modo() {
    if (this.desativado) return { modo: "desativado" };
    if (!this.equipamentoId) return { modo: "configurar" };
    const e = this.estado;
    if (!e) return { modo: "livre" };
    if (e.modo === "uso") {
      if (!e.fimPrevisto) return { ...e, modo: "uso" };
      const restaMs = new Date(e.fimPrevisto).getTime() - this.agora();
      if (restaMs <= 0) return { modo: "acabou", cliente: e.cliente };
      if (restaMs <= P.AVISO_MIN * 60_000) return { ...e, modo: "aviso", restaMs };
      return { ...e, modo: "uso", restaMs };
    }
    return e; // livre | acabou | liberado
  }

  atualizarTela() {
    const m = this.modo();
    const base = { arena: this.arena, maquina: this.maquina?.nome ?? "", conectado: this.conectado, agora: this.agora() };
    const { bloqueio, faixa, contador } = this.janelas;

    // Tela de bloqueio: só quando livre (ninguém jogando)
    const bloquear = m.modo === "livre" || m.modo === "configurar";
    this.mostrar(bloqueio, bloquear, true);
    bloqueio.webContents.send("dados", { ...base, ...m });

    // Faixa no topo: aviso (amarelo) e acabou (vermelho) — não bloqueia o jogo
    const comFaixa = m.modo === "aviso" || m.modo === "acabou";
    this.mostrar(faixa, comFaixa);
    faixa.webContents.send("dados", { ...base, ...m });

    // Contador no canto durante o uso
    const comContador = m.modo === "uso" || m.modo === "liberado";
    this.mostrar(contador, comContador);
    contador.webContents.send("dados", { ...base, ...m, nomeSituacao: NOMES_SITUACAO[m.motivo] });

    // Notificação do Windows ao mudar para aviso/acabou (aparece mesmo em tela cheia)
    if (m.modo !== this.modoAnterior) {
      console.log(`[modo] ${m.modo}${m.restaMs != null ? ` (faltam ${Math.ceil(m.restaMs / 60000)} min)` : ""}`);
      if (m.modo === "aviso") this.notificar("⏰ Seu tempo está acabando", `Faltam ${Math.ceil(m.restaMs / 60000)} min. Quer continuar? Fale com o atendente.`);
      if (m.modo === "acabou") this.notificar("⛔ Tempo esgotado", "Procure o atendente para continuar ou fechar a conta.");
      this.modoAnterior = m.modo;
    }
  }

  mostrar(janela, visivel, focar = false) {
    if (!janela || janela.isDestroyed()) return;
    if (visivel && !janela.isVisible()) {
      if (focar) {
        janela.show();
        janela.focus();
      } else janela.showInactive();
      janela.setAlwaysOnTop(true, "screen-saver");
    } else if (!visivel && janela.isVisible()) janela.hide();
  }

  notificar(titulo, corpo) {
    if (Notification.isSupported()) new Notification({ title: titulo, body: corpo, urgency: "critical" }).show();
  }

  // ---------- Janelas ----------
  criarJanelas() {
    const { bounds } = screen.getPrimaryDisplay();
    const comum = { frame: false, skipTaskbar: true, show: false, alwaysOnTop: true, webPreferences: { preload: PRELOAD } };

    const teste = process.env.ARENA_TESTE === "1"; // teste: janela pequena em vez de tela cheia
    const bloqueio = new BrowserWindow({
      ...comum,
      ...(teste ? { width: 640, height: 420 } : { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height, kiosk: true, fullscreen: true }),
      backgroundColor: "#07070c",
    });
    bloqueio.loadFile(tela("bloqueio.html"));

    const faixa = new BrowserWindow({ ...comum, x: bounds.x, y: bounds.y, width: bounds.width, height: 78, transparent: true, focusable: false, resizable: false });
    faixa.setIgnoreMouseEvents(true); // o clique passa para o jogo
    faixa.loadFile(tela("faixa.html"));

    const contador = new BrowserWindow({ ...comum, x: bounds.x + bounds.width - 250, y: bounds.y + 10, width: 240, height: 64, transparent: true, focusable: false, resizable: false });
    contador.setIgnoreMouseEvents(true);
    contador.loadFile(tela("contador.html"));

    // Ninguém fecha essas janelas (só pelo acesso mestre)
    for (const j of [bloqueio, faixa, contador]) j.on("close", (e) => !app.saindo && e.preventDefault());
    this.janelas = { bloqueio, faixa, contador };
  }

  abrirMestre(inicio = "senha") {
    if (this.janelas.mestre && !this.janelas.mestre.isDestroyed()) {
      this.janelas.mestre.show();
      this.janelas.mestre.focus();
      return;
    }
    const j = new BrowserWindow({
      width: 480,
      height: 620,
      frame: false,
      alwaysOnTop: true,
      resizable: false,
      skipTaskbar: false,
      backgroundColor: "#0f0f17",
      webPreferences: { preload: PRELOAD },
    });
    j.setAlwaysOnTop(true, "screen-saver", 1); // fica acima da tela de bloqueio
    j.loadFile(tela("mestre.html"), { query: { inicio } });
    j.on("closed", () => {
      this.janelas.mestre = null;
      this.senhaDigitada = null;
    });
    this.janelas.mestre = j;
  }

  // Chamado pela janela do acesso mestre
  async acaoMestre(dados) {
    switch (dados.acao) {
      case "entrar": {
        if (!this.senhaHash) return { ok: false, msg: "Ainda sem senha: conecte ao Servidor pelo menos uma vez." };
        const ok = await bcrypt.compare(String(dados.senha ?? ""), this.senhaHash);
        if (!ok) return { ok: false, msg: "Senha errada." };
        this.senhaDigitada = String(dados.senha);
        return { ok: true, ...this.resumo() };
      }
      case "resumo":
        return { ok: true, ...this.resumo() };
    }
    if (!this.senhaDigitada) return { ok: false, msg: "Digite a senha primeiro." };
    const senha = this.senhaDigitada;
    switch (dados.acao) {
      case "situacao": {
        // Já libera neste PC (mesmo sem Servidor) e avisa o Servidor
        this.estado = dados.situacao === "normal" ? { modo: "livre" } : { modo: "liberado", motivo: dados.situacao, obs: dados.obs };
        this.enviar({ t: "mestre", senha, situacao: dados.situacao, obs: dados.obs });
        this.atualizarTela();
        return { ok: true, msg: dados.situacao === "normal" ? "Voltou ao normal." : `Liberado: ${NOMES_SITUACAO[dados.situacao]}.` };
      }
      case "escolher": {
        const m = this.maquinas.find((x) => x.id === dados.equipamentoId);
        if (!m) return { ok: false, msg: "Escolha uma máquina." };
        this.equipamentoId = m.id;
        this.maquina = m;
        this.guardar({ equipamentoId: m.id, maquina: m });
        this.enviar({ t: "escolher", senha, equipamentoId: m.id });
        this.atualizarTela();
        return { ok: true, msg: `Este PC agora é o ${m.nome}.` };
      }
      case "servidor": {
        const ip = String(dados.ip ?? "").trim();
        this.hubIp = ip || null;
        this.ipManual = !!ip;
        this.guardar({ hubIp: this.hubIp, ipManual: this.ipManual });
        this.ws?.terminate();
        return { ok: true, msg: ip ? `Conectando em ${ip}...` : "Procurando o Servidor na rede..." };
      }
      case "desativar": {
        this.desativado = dados.ate === "sempre" ? "sempre" : "ate_reiniciar";
        if (this.desativado === "sempre") this.guardar({ desativado: true });
        this.enviar({ t: "estado_agente", senha, estado: "desativado" });
        this.atualizarTela();
        return { ok: true, msg: this.desativado === "sempre" ? "Desativado de vez (reative por aqui)." : "Desativado até reiniciar o PC." };
      }
      case "reativar": {
        this.desativado = null;
        this.guardar({ desativado: false });
        this.enviar({ t: "estado_agente", senha, estado: "ativo" });
        this.atualizarTela();
        return { ok: true, msg: "Programa ativo de novo." };
      }
      case "desinstalar": {
        if (!app.isPackaged) return { ok: false, msg: "Versão de teste: não há o que desinstalar (o instalador vem na fase 6b)." };
        const desinstalador = path.join(path.dirname(app.getPath("exe")), `Uninstall ${app.getName()}.exe`);
        this.enviar({ t: "estado_agente", senha, estado: "desativado" });
        await shell.openPath(desinstalador);
        setTimeout(() => this.sair(), 1500);
        return { ok: true, msg: "Abrindo o desinstalador..." };
      }
      case "sair":
        setTimeout(() => this.sair(), 300);
        return { ok: true, msg: "Fechando o programa..." };
    }
    return { ok: false, msg: "Ação desconhecida." };
  }

  resumo() {
    return {
      maquina: this.maquina?.nome ?? null,
      equipamentoId: this.equipamentoId,
      maquinas: this.maquinas,
      conectado: this.conectado,
      hubIp: this.hubIp,
      desativado: this.desativado,
      situacao: this.estado?.modo === "liberado" ? this.estado.motivo : "normal",
      nomePc: os.hostname(),
      versao: app.getVersion(),
    };
  }

  sair() {
    app.saindo = true;
    globalShortcut.unregisterAll();
    app.quit();
  }
}

module.exports = { PC };
