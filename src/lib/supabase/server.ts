import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Conexão com o Supabase no servidor, usando o login do cookie
export async function criarSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(lista) {
          try {
            lista.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Chamado dentro de página (só leitura). O proxy renova o cookie.
          }
        },
      },
    },
  );
}
