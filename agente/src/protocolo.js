// Combinados entre o Servidor (hub) e os PCs

module.exports = {
  PORTA_WS: 47800, // conversa Servidor ↔ PCs (rede da arena)
  PORTA_DESCOBERTA: 47801, // PC grita "cadê o Servidor?" e o Servidor responde
  PERGUNTA: "ARENA_STORM_CADE_SERVIDOR",
  RESPOSTA: "ARENA_STORM_SERVIDOR_AQUI",
  PULSO_MS: 5_000, // PC → Servidor: "estou vivo"
  SEM_PULSO_MS: 20_000, // sem pulso há 20 s = PC desligado
  HUB_CONTATO_MS: 60_000, // Servidor → nuvem: "estou vivo"
  AVISO_MIN: 5, // faixa amarela quando faltam 5 min
  ATALHO_MESTRE: "CommandOrControl+Alt+Shift+A",
  FUSO: "America/Fortaleza",
};
