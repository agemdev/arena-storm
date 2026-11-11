// Endereço público da nuvem para o programa dos PCs (Servidor).
// São os mesmos dados públicos que o site já usa no navegador (chave "publishable", sem segredo).
export async function GET() {
  return Response.json({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    chave: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}
