import "server-only";
import { createClient } from "@supabase/supabase-js";

// Conexão sem login: só lê dados públicos (perfil da arena, estados, cidades)
export function supabasePublico() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  });
}
