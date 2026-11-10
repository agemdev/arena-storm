// MODO SERVIDOR (hub): fala com a nuvem e com os PCs da rede da arena.
// - Lê do Caixa quem está usando cada máquina e manda para o PC certo.
// - Recebe o "estou vivo" dos PCs e marca ligado/desligado no painel.
// - Encerra sozinho o tempo que acabou (mesmo com o painel fechado).
// - Sem internet: continua com o último estado e guarda as ações numa fila.
const { EventEmitter } = require("node:events");
const dgram = require("node:dgram");
const { WebSocketServer } = require("ws");
const bcrypt = require("bcryptjs");
const P = require("./protocolo");
const banco = require("./banco");
const nuvem = require("./nuvem");

const SITUACOES = ["normal", "manutencao", "funcionario", "sem_cobranca"];

// Mesma conta do site: proporcional ao minuto, arredondado para R$ 0,50
function calcularValor(inicio, fim, valorHora) {
  const minutos = Math.max(0, Math.round((new Date(fim) - new Date(inicio)) / 60000));
  return Math.round(((minutos * valorHora) / 60) * 2) / 2;
}

// "2026-11-10" no fuso da arena, menos N dias
function diaISO(menosDias = 0) {
  const d = new Date(Date.now() - menosDias * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: P.FUSO }).format(d);
}

class Hub extends EventEmitter {
  constructor() {
    super();
    this.arenaId = banco.pegar("arenaId");
    this.arena = banco.pegar("arena", { nome: "Arena" });
    this.senhaHash = banco.pegar("senhaHash");
    this.maquinas = banco.pegar("maquinas", []); // [{id, nome, tipo}]
    this.estados = banco.pegar("estados", {}); // equipamentoId → estado
    this.abertos = []; // atendimentos em uso (para encerrar na hora certa)
    this.conexoes = new Map(); // ws → {agenteId, equipamentoId, nomePc, versao, ultimoPulso, estado}
    this.nuvemOk = false;
    this.erro = null;
    this.timers = [];
  }

  // ---------- Início ----------
  async iniciar() {
    this.abrirRedeLocal();
    await this.conectarNuvem();
    this.timers.push(setInterval(() => this.carregar(), 30_000)); // garante atualização mesmo sem aviso
    this.timers.push(setInterval(() => this.verificarVencidos(), 15_000));
    this.timers.push(setInterval(() => this.verificarPulsos(), 5_000));
    this.timers.push(setInterval(() => this.avisarVivo(), P.HUB_CONTATO_MS));
    this.timers.push(setInterval(() => this.esvaziarFila(), 10_000));
    this.avisarStatus();
  }

  async conectarNuvem() {
    try {
      const sb = nuvem.supabase();
      const { data: cfg, error } = await sb.from("agente_config").select("arena_id, senha_mestre_hash").maybeSingle();
      if (error || !cfg) throw new Error("Este login não tem acesso à arena.");
      this.arenaId = cfg.arena_id;
      this.senhaHash = cfg.senha_mestre_hash;
      banco.guardar("arenaId", this.arenaId);
      banco.guardar("senhaHash", this.senhaHash);
      // Servidor acabou de ligar: ninguém está conectado ainda
      await sb.from("agentes").update({ online: false }).eq("arena_id", this.arenaId);
      await this.carregar();
      await this.avisarVivo();
      // Ao vivo: Caixa, máquinas e pagamentos
      let espera;
      const recarregar = () => {
        clearTimeout(espera);
        espera = setTimeout(() => this.carregar(), 500);
      };
      const { data: sessao } = await sb.auth.getSession();
      if (sessao.session) await sb.realtime.setAuth(sessao.session.access_token); // "ao vivo" com o login
      const canal = sb.channel("servidor");
      for (const table of ["atendimentos", "equipamentos", "pagamentos"]) canal.on("postgres_changes", { event: "*", schema: "public", table }, recarregar);
      canal.subscribe();
    } catch (e) {
      this.marcarNuvem(false, e.message);
      setTimeout(() => this.conectarNuvem(), 30_000); // tenta de novo
    }
  }

  marcarNuvem(ok, erro = null) {
    const mudou = this.nuvemOk !== ok;
    this.nuvemOk = ok;
    this.erro = erro;
    if (mudou && ok) this.reenviarOnline(); // voltou a internet: atualiza ligado/desligado
    this.avisarStatus();
  }

  // ---------- Nuvem → estados das máquinas ----------
  async carregar() {
    if (!this.arenaId) return;
    try {
      const sb = nuvem.supabase();
      await this.encerrarVencidosNaNuvem();
      const [cfg, arena, equips, abertos, fechados] = await Promise.all([
        sb.from("agente_config").select("senha_mestre_hash").eq("arena_id", this.arenaId).maybeSingle(),
        sb.from("arenas").select("nome").eq("id", this.arenaId).maybeSingle(),
        sb.from("equipamentos").select("id, nome, tipo, situacao, situacao_obs, ativo").eq("ativo", true).order("ordem"),
        sb
          .from("atendimentos")
          .select("id, nome, equipamento_id, inicio, fim_previsto, valor_hora")
          .is("fim", null)
          .is("cancelado_em", null)
          .not("inicio", "is", null),
        sb
          .from("atendimentos")
          .select("id, nome, equipamento_id, valor_uso, ajuste, consumos(total), pagamentos(valor)")
          .not("fim", "is", null)
          .is("cancelado_em", null)
          .not("equipamento_id", "is", null)
          .gte("data", diaISO(2))
          .order("fim", { ascending: false }),
      ]);
      if (equips.error) throw equips.error;

      this.senhaHash = cfg.data?.senha_mestre_hash ?? this.senhaHash;
      this.arena = { nome: arena.data?.nome ?? this.arena.nome };
      this.maquinas = (equips.data ?? []).map((e) => ({ id: e.id, nome: e.nome, tipo: e.tipo }));
      this.abertos = abertos.data ?? [];

      // Quem terminou e ainda não pagou
      const pendentes = new Map();
      for (const f of fechados.data ?? []) {
        const consumo = (f.consumos ?? []).reduce((s, c) => s + Number(c.total), 0);
        const pago = (f.pagamentos ?? []).reduce((s, p) => s + Number(p.valor), 0);
        const total = Math.max(0, Number(f.valor_uso) + consumo + Number(f.ajuste ?? 0));
        const falta = Math.round((total - pago) * 100) / 100;
        if (falta > 0 && !pendentes.has(f.equipamento_id)) pendentes.set(f.equipamento_id, { cliente: f.nome, falta });
      }
      const porMaquina = new Map(this.abertos.filter((a) => a.equipamento_id).map((a) => [a.equipamento_id, a]));

      const estados = {};
      for (const e of equips.data ?? []) {
        const a = porMaquina.get(e.id);
        if (e.situacao && e.situacao !== "normal") estados[e.id] = { modo: "liberado", motivo: e.situacao, obs: e.situacao_obs };
        else if (a) estados[e.id] = { modo: "uso", inicio: a.inicio, fimPrevisto: a.fim_previsto, cliente: a.nome };
        else if (pendentes.has(e.id)) estados[e.id] = { modo: "acabou", ...pendentes.get(e.id) };
        else estados[e.id] = { modo: "livre" };
      }
      this.estados = estados;
      banco.guardar("estados", estados);
      banco.guardar("maquinas", this.maquinas);
      banco.guardar("arena", this.arena);
      banco.guardar("senhaHash", this.senhaHash);
      this.marcarNuvem(true);
      this.enviarParaTodos();
    } catch (e) {
      this.marcarNuvem(false, e.message ?? String(e));
    }
  }

  // Fecha na hora combinada quem passou do fim previsto (igual ao site)
  async encerrarVencidosNaNuvem() {
    const sb = nuvem.supabase();
    const { data } = await sb
      .from("atendimentos")
      .select("id, inicio, fim_previsto, valor_hora")
      .is("fim", null)
      .is("cancelado_em", null)
      .not("inicio", "is", null)
      .lte("fim_previsto", new Date().toISOString());
    for (const a of data ?? []) {
      await sb
        .from("atendimentos")
        .update({ fim: a.fim_previsto, valor_uso: calcularValor(a.inicio, a.fim_previsto, Number(a.valor_hora)) })
        .eq("id", a.id)
        .is("fim", null);
    }
  }

  verificarVencidos() {
    const agora = Date.now();
    if (this.abertos.some((a) => a.fim_previsto && new Date(a.fim_previsto).getTime() <= agora)) this.carregar();
  }

  async avisarVivo() {
    if (!this.arenaId) return;
    try {
      const { error } = await nuvem.supabase().from("agente_config").update({ hub_contato: new Date().toISOString() }).eq("arena_id", this.arenaId);
      if (error) throw error;
      this.marcarNuvem(true);
    } catch (e) {
      this.marcarNuvem(false, e.message ?? String(e));
    }
  }

  // ---------- Rede local (PCs) ----------
  abrirRedeLocal() {
    // Descoberta: PC pergunta por broadcast, Servidor responde
    const udp = dgram.createSocket({ type: "udp4", reuseAddr: true });
    udp.on("message", (msg, rinfo) => {
      if (msg.toString() === P.PERGUNTA) udp.send(P.RESPOSTA, rinfo.port, rinfo.address);
    });
    udp.on("error", (e) => this.log(`Descoberta: ${e.message}`));
    udp.bind(P.PORTA_DESCOBERTA);

    const wss = new WebSocketServer({ port: P.PORTA_WS });
    wss.on("connection", (ws, req) => {
      const info = { agenteId: null, equipamentoId: null, nomePc: "?", versao: null, ultimoPulso: Date.now(), estado: "ativo", ip: req.socket.remoteAddress };
      this.conexoes.set(ws, info);
      ws.on("message", (bruto) => {
        let msg;
        try {
          msg = JSON.parse(bruto.toString());
        } catch {
          return;
        }
        this.tratar(ws, info, msg).catch((e) => this.log(`Erro: ${e.message}`));
      });
      ws.on("close", () => {
        this.conexoes.delete(ws);
        this.marcarOnline(info, false);
        this.avisarStatus();
      });
    });
    wss.on("error", (e) => this.log(`Rede local: ${e.message}`));
    this.log(`Esperando os PCs na porta ${P.PORTA_WS}`);
  }

  async tratar(ws, info, msg) {
    info.ultimoPulso = Date.now();
    switch (msg.t) {
      case "ola": {
        info.nomePc = String(msg.nomePc ?? "?").slice(0, 60);
        info.versao = String(msg.versao ?? "");
        info.agenteId = msg.agenteId ?? null;
        info.equipamentoId = msg.equipamentoId ?? null;
        info.estado = msg.estado === "desativado" ? "desativado" : "ativo";
        await this.registrar(ws, info);
        this.enviar(ws, { t: "boas_vindas", arena: this.arena, maquinas: this.maquinas, senhaHash: this.senhaHash });
        this.enviarEstado(ws, info);
        this.avisarStatus();
        break;
      }
      case "pulso":
        if (msg.estado && msg.estado !== info.estado) {
          info.estado = msg.estado === "desativado" ? "desativado" : "ativo";
          this.atualizarAgente(info, { estado: info.estado });
        }
        break;
      // Ações do acesso mestre: o Servidor confere a senha de novo (segurança)
      case "escolher": {
        if (!(await this.senhaOk(msg.senha))) return this.enviar(ws, { t: "erro", msg: "Senha errada." });
        info.equipamentoId = msg.equipamentoId;
        await this.ligarMaquina(info);
        this.enviarEstado(ws, info);
        this.avisarStatus();
        break;
      }
      case "mestre": {
        if (!(await this.senhaOk(msg.senha))) return this.enviar(ws, { t: "erro", msg: "Senha errada." });
        if (!info.equipamentoId || !SITUACOES.includes(msg.situacao)) return;
        await this.mudarSituacao(info.equipamentoId, msg.situacao, msg.obs);
        break;
      }
      case "estado_agente": {
        if (!(await this.senhaOk(msg.senha))) return this.enviar(ws, { t: "erro", msg: "Senha errada." });
        info.estado = msg.estado === "desativado" ? "desativado" : "ativo";
        this.atualizarAgente(info, { estado: info.estado });
        this.avisarStatus();
        break;
      }
    }
  }

  async senhaOk(senha) {
    if (!this.senhaHash || !senha) return false;
    return bcrypt.compare(String(senha), this.senhaHash);
  }

  // PC novo: cadastra na nuvem. PC conhecido: marca ligado.
  async registrar(ws, info) {
    if (!this.nuvemOk || !this.arenaId) return;
    const sb = nuvem.supabase();
    const dados = { nome_pc: info.nomePc, versao: info.versao, online: true, estado: info.estado, ultimo_contato: new Date().toISOString() };
    if (info.agenteId) {
      const { data } = await sb.from("agentes").update(dados).eq("id", info.agenteId).select("id, equipamento_id").maybeSingle();
      if (data) {
        // O painel manda em qual máquina o PC é (pode ter sido trocado lá)
        if (data.equipamento_id && data.equipamento_id !== info.equipamentoId) {
          info.equipamentoId = data.equipamento_id;
          this.enviar(ws, { t: "maquina", equipamentoId: info.equipamentoId });
        } else if (!data.equipamento_id && info.equipamentoId) await this.ligarMaquina(info);
        return;
      }
    }
    const { data: novo, error } = await sb.from("agentes").insert({ arena_id: this.arenaId, ...dados }).select("id").single();
    if (error) return this.log(`Cadastro do PC: ${error.message}`);
    info.agenteId = novo.id;
    this.enviar(ws, { t: "registrado", agenteId: novo.id });
    if (info.equipamentoId) await this.ligarMaquina(info);
  }

  // Liga o PC a uma máquina do mapa (tira de outro PC que estivesse com ela)
  async ligarMaquina(info) {
    if (!info.agenteId) return;
    if (!this.nuvemOk) return banco.enfileirar({ tipo: "maquina", agenteId: info.agenteId, equipamentoId: info.equipamentoId });
    const sb = nuvem.supabase();
    await sb.from("agentes").update({ equipamento_id: null }).eq("equipamento_id", info.equipamentoId).neq("id", info.agenteId);
    await sb.from("agentes").update({ equipamento_id: info.equipamentoId }).eq("id", info.agenteId);
  }

  async mudarSituacao(equipamentoId, situacao, obs) {
    const normal = situacao === "normal";
    const dados = {
      situacao,
      situacao_obs: normal ? null : String(obs ?? "").slice(0, 120) || "Pelo acesso mestre do PC",
      situacao_desde: normal ? null : new Date().toISOString(),
    };
    // Já aplica no PC (mesmo sem internet)
    if (normal) this.estados[equipamentoId] = { modo: "livre" };
    else this.estados[equipamentoId] = { modo: "liberado", motivo: situacao, obs: dados.situacao_obs };
    banco.guardar("estados", this.estados);
    this.enviarParaTodos();
    if (!this.nuvemOk) return banco.enfileirar({ tipo: "situacao", equipamentoId, dados });
    const { error } = await nuvem.supabase().from("equipamentos").update(dados).eq("id", equipamentoId);
    if (error) banco.enfileirar({ tipo: "situacao", equipamentoId, dados });
    else this.carregar();
  }

  atualizarAgente(info, campos) {
    if (!info.agenteId) return;
    if (!this.nuvemOk) return banco.enfileirar({ tipo: "agente", agenteId: info.agenteId, campos });
    nuvem
      .supabase()
      .from("agentes")
      .update(campos)
      .eq("id", info.agenteId)
      .then(({ error }) => error && banco.enfileirar({ tipo: "agente", agenteId: info.agenteId, campos }));
  }

  marcarOnline(info, online) {
    this.atualizarAgente(info, { online, ultimo_contato: new Date().toISOString() });
  }

  reenviarOnline() {
    for (const [ws, info] of this.conexoes) {
      if (info.agenteId) this.marcarOnline(info, true);
      else this.registrar(ws, info).catch((e) => this.log(`Cadastro do PC: ${e.message}`)); // conectou sem internet
    }
  }

  // PC que parou de mandar "estou vivo" = desligado
  verificarPulsos() {
    const agora = Date.now();
    for (const [ws, info] of this.conexoes) {
      if (agora - info.ultimoPulso > P.SEM_PULSO_MS) ws.terminate(); // dispara o "close"
    }
  }

  async esvaziarFila() {
    if (!this.nuvemOk) return;
    const sb = nuvem.supabase();
    for (const { id, acao } of banco.fila()) {
      let r;
      if (acao.tipo === "situacao") r = await sb.from("equipamentos").update(acao.dados).eq("id", acao.equipamentoId);
      else if (acao.tipo === "agente") r = await sb.from("agentes").update(acao.campos).eq("id", acao.agenteId);
      else if (acao.tipo === "maquina") {
        await sb.from("agentes").update({ equipamento_id: null }).eq("equipamento_id", acao.equipamentoId).neq("id", acao.agenteId);
        r = await sb.from("agentes").update({ equipamento_id: acao.equipamentoId }).eq("id", acao.agenteId);
      }
      if (r?.error) return; // tenta depois
      banco.tirarDaFila(id);
    }
  }

  // ---------- Envio ----------
  enviar(ws, msg) {
    if (ws.readyState === 1) ws.send(JSON.stringify(msg));
  }

  enviarEstado(ws, info) {
    const estado = info.equipamentoId ? (this.estados[info.equipamentoId] ?? { modo: "livre" }) : null;
    const maquina = this.maquinas.find((m) => m.id === info.equipamentoId) ?? null;
    this.enviar(ws, { t: "estado", estado, maquina, horaServidor: Date.now(), senhaHash: this.senhaHash, arena: this.arena });
  }

  enviarParaTodos() {
    for (const [ws, info] of this.conexoes) this.enviarEstado(ws, info);
    this.avisarStatus();
  }

  // ---------- Tela do Servidor ----------
  log(texto) {
    this.emit("log", `${new Date().toLocaleTimeString("pt-BR")} ${texto}`);
  }

  avisarStatus() {
    const pcs = [...this.conexoes.values()].map((i) => ({
      nomePc: i.nomePc,
      ip: i.ip,
      maquina: this.maquinas.find((m) => m.id === i.equipamentoId)?.nome ?? "(sem máquina)",
      estado: i.estado,
      modo: i.equipamentoId ? this.estados[i.equipamentoId]?.modo : null,
    }));
    this.emit("status", { nuvem: this.nuvemOk, erro: this.erro, arena: this.arena, pcs, fila: banco.fila().length });
  }
}

module.exports = { Hub };
