// Máscaras de digitação (só números → texto formatado)

// 88991212122 → (88) 99121-2122 · 8836711234 → (88) 3671-1234
export function mascaraTelefone(texto: string) {
  const d = texto.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : "";
  const ddd = d.slice(0, 2);
  const num = d.slice(2);
  const meio = d.length === 11 ? 5 : 4;
  if (num.length <= meio) return `(${ddd}) ${num}`;
  return `(${ddd}) ${num.slice(0, meio)}-${num.slice(meio)}`;
}

// 62320021 → 62320-021
export function mascaraCep(texto: string) {
  const d = texto.replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

// 12345678000190 → 12.345.678/0001-90
export function mascaraCnpj(texto: string) {
  const d = texto.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}
