// Rede local: testa se um console responde (ping) e acha IP pelo MAC (tabela ARP do Windows)
const os = require("node:os");
const dgram = require("node:dgram");
const { execFile } = require("node:child_process");

function rodar(cmd, args, tempoMs) {
  return new Promise((ok) => {
    execFile(cmd, args, { windowsHide: true, timeout: tempoMs, encoding: "latin1" }, (_e, saida) => ok(String(saida ?? "")));
  });
}

// Respondeu = tem "TTL=" (o Windows diz "sucesso" até em "host inacessível")
async function ping(ip) {
  const saida = await rodar("ping", ["-n", "1", "-w", "1000", ip], 4000);
  return /TTL=/i.test(saida);
}

// Tabela ARP → Map(mac "aa-bb-cc-dd-ee-ff" → ip)
async function tabelaArp() {
  const saida = await rodar("arp", ["-a"], 5000);
  const mapa = new Map();
  for (const m of saida.matchAll(/(\d+\.\d+\.\d+\.\d+)\s+(([0-9a-f]{2}-){5}[0-9a-f]{2})/gi)) {
    const mac = m[2].toLowerCase();
    if (mac !== "ff-ff-ff-ff-ff-ff") mapa.set(mac, m[1]);
  }
  return mapa;
}

// Manda um pacotinho para cada IP das redes do Servidor (/24) → o Windows preenche a tabela ARP
async function varrerRede() {
  const bases = new Set();
  for (const i of Object.values(os.networkInterfaces()).flat()) {
    if (i && i.family === "IPv4" && !i.internal) bases.add(i.address.split(".").slice(0, 3).join("."));
  }
  const s = dgram.createSocket("udp4");
  s.on("error", () => {});
  const msg = Buffer.from("arena");
  for (const base of bases) {
    for (let n = 1; n < 255; n++) s.send(msg, 9, `${base}.${n}`, () => {});
  }
  await new Promise((r) => setTimeout(r, 3000)); // tempo para as respostas
  s.close();
}

// Procura os MACs pedidos; devolve Map(mac → ip encontrado)
async function acharPorMac(macs) {
  let arp = await tabelaArp();
  if (macs.some((m) => !arp.has(m))) {
    await varrerRede();
    arp = await tabelaArp();
  }
  return new Map(macs.filter((m) => arp.has(m)).map((m) => [m, arp.get(m)]));
}

module.exports = { ping, acharPorMac };
