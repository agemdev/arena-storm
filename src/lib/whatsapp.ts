// Deixa o WhatsApp só com números e com 55 (Brasil) na frente
export function normalizarWhats(texto: string) {
  let n = texto.replace(/\D/g, "");
  if (n.length === 10 || n.length === 11) n = "55" + n;
  return /^55\d{10,11}$/.test(n) ? n : null;
}

// 5588992320187 → (88) 99232-0187
export function formatarWhats(n: string) {
  const d = n.replace(/^55/, "");
  const ddd = d.slice(0, 2);
  const num = d.slice(2);
  const meio = num.length === 9 ? 5 : 4;
  return `(${ddd}) ${num.slice(0, meio)}-${num.slice(meio)}`;
}
