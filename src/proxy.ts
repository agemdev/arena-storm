import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Roda antes de /painel e /login: renova o login e redireciona
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(lista, headers) {
          lista.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          lista.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const logado = !!data?.claims;
  const rota = request.nextUrl.pathname;

  // Sem login tentando entrar no painel → tela de login
  if (!logado && rota.startsWith("/painel")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  // Já logado abrindo /login → painel
  if (logado && rota === "/login") {
    return NextResponse.redirect(new URL("/painel", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/painel/:path*", "/login"],
};
