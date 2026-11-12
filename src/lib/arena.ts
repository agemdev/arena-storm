// Textos do site agora ficam no banco (painel → Configurações → Site; src/lib/site.ts).

// Link do WhatsApp com mensagem pronta
export function wa(numero: string, msg = "Olá! Vim pelo site.") {
  return `https://wa.me/${numero}?text=${encodeURIComponent(msg)}`;
}
