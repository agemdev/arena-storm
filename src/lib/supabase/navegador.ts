import { createBrowserClient } from "@supabase/ssr";

// Conexão no navegador (usa o login do cookie). Só para o "ao vivo" (Realtime).
let cliente: ReturnType<typeof createBrowserClient> | null = null;
export function supabaseNavegador() {
  cliente ??= createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
  return cliente;
}
