// Textos fixos do site (preços, horários, jogos...). Mudou? Edite aqui.
// Nome, logo, endereço e contatos vêm do Perfil da arena no painel (src/lib/perfil.ts).

// Link do WhatsApp com mensagem pronta
export function wa(numero: string, msg = "Olá! Vim pelo site.") {
  return `https://wa.me/${numero}?text=${encodeURIComponent(msg)}`;
}

export const HORARIOS = [
  { dia: "Segunda a Sexta", hora: "9h — 22h" },
  { dia: "Sábado", hora: "9h — 23h" },
  { dia: "Domingo", hora: "14h — 23h" },
];

export const NUMEROS = [
  { valor: "10", label: "PCs gamer" },
  { valor: "4", label: "PlayStation 5" },
  { valor: "240", label: "FPS em 180Hz" },
];

export const EQUIPAMENTOS = [
  { icone: "🖥️", titulo: "10 PCs Gamer", texto: "AMD Ryzen, placa de vídeo 8GB e 32GB de RAM. Monitores 180Hz rodando até 240 FPS." },
  { icone: "🎮", titulo: "4 PlayStation 5", texto: "Os exclusivos e os competitivos do momento, pra jogar sozinho ou com a crew." },
  { icone: "🏎️", titulo: "Simulador de Corrida", texto: "PC dedicado com volante e pedais Logitech G29. Sensação de pista de verdade." },
  { icone: "🥽", titulo: "Realidade Virtual", texto: "Óculos VR standalone. Sessões de 30 minutos pra entrar no jogo de corpo inteiro." },
  { icone: "🕹️", titulo: "Nintendo Switch", texto: "Diversão pra todas as idades, perfeito pra jogar em grupo e com a família." },
  { icone: "🏆", titulo: "Campeonatos", texto: "Torneios na arena com a comunidade. Inscrição e detalhes pelo WhatsApp." },
];

export const JOGOS = [
  "Counter-Strike 2", "Valorant", "FC 26", "Fortnite", "GTA V", "GTA VI",
  "League of Legends", "Rocket League", "Call of Duty", "Free Fire", "Exclusivos PS5",
];

export const PLANOS = [
  { nome: "Hora Avulsa", preco: "R$ 12", unidade: "/hora", itens: ["Qualquer setup disponível", "Periféricos inclusos", "Monitores 180Hz"] },
  { nome: "Passaporte 5h", preco: "R$ 50", unidade: "/5 horas", destaque: true, itens: ["5 horas de jogo", "Prioridade na escolha do setup", "Participação em sorteios"] },
  { nome: "Corujão", preco: "R$ 70", unidade: "/noite", itens: ["Das 22h às 6h", "Arena inteira", "Lanches da madrugada"] },
  { nome: "Realidade Virtual", preco: "R$ 10", unidade: "/30 min", itens: ["Óculos VR standalone", "Sessão de 30 minutos", "Jogos imersivos"] },
];

export const FESTAS = [
  { nome: "Aniversário P", preco: "R$ 699", texto: "Até 10 pessoas · 3 horas" },
  { nome: "Aniversário G", preco: "R$ 999", texto: "Até 15 pessoas · 3 horas + bônus" },
];

// Torneios fixos por enquanto. No M3 virão do banco de dados.
export const TORNEIOS = [
  { dia: "20", mes: "DEZ", titulo: "Camp de FC 26", texto: "20 de dezembro de 2026" },
  { dia: "16", mes: "JAN", titulo: "Counter-Strike 2", texto: "16 e 17 de janeiro de 2027" },
];

export const FAQ = [
  { p: "Como faço pra reservar?", r: "Chama a gente no WhatsApp com o dia, horário e quantas pessoas. A equipe confirma rapidinho." },
  { p: "Quais jogos estão disponíveis?", r: `${JOGOS.join(", ")}. Quer algo específico? Avisa a equipe que a gente instala.` },
  { p: "Posso fazer aniversário na Arena?", r: "Pode! Pacotes de R$ 699 (até 10 pessoas, 3h) e R$ 999 (até 15 pessoas, 3h + bônus). Agende pelo WhatsApp." },
  { p: "Preciso levar meu equipamento?", r: "Não. Headset, teclado, mouse e monitor estão inclusos. Se preferir, pode trazer seu headset ou mousepad." },
  { p: "Tem comida e bebida?", r: "Tem lanches e bebidas na arena. E o ambiente é climatizado." },
];
