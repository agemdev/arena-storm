// Banco local do Servidor (SQLite): guarda o último estado e a fila do que ainda não subiu para a nuvem.
// Se a internet cair, os PCs continuam funcionando com o último estado conhecido.
const path = require("node:path");
const { app } = require("electron");
const { DatabaseSync } = require("node:sqlite");

let db = null;

function abrir() {
  if (db) return db;
  db = new DatabaseSync(path.join(app.getPath("userData"), "servidor.db"));
  db.exec(`
    create table if not exists guardado (chave text primary key, valor text not null);
    create table if not exists fila (id integer primary key autoincrement, acao text not null, criado_em text not null);
  `);
  return db;
}

function guardar(chave, valor) {
  abrir().prepare("insert into guardado (chave, valor) values (?, ?) on conflict(chave) do update set valor = excluded.valor").run(chave, JSON.stringify(valor));
}

function pegar(chave, padrao = null) {
  const r = abrir().prepare("select valor from guardado where chave = ?").get(chave);
  return r ? JSON.parse(r.valor) : padrao;
}

// Fila: ações para mandar à nuvem quando a internet voltar
function enfileirar(acao) {
  abrir().prepare("insert into fila (acao, criado_em) values (?, ?)").run(JSON.stringify(acao), new Date().toISOString());
}
function fila() {
  return abrir()
    .prepare("select id, acao from fila order by id")
    .all()
    .map((r) => ({ id: r.id, acao: JSON.parse(r.acao) }));
}
function tirarDaFila(id) {
  abrir().prepare("delete from fila where id = ?").run(id);
}

module.exports = { guardar, pegar, enfileirar, fila, tirarDaFila };
