import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Arena do endereço principal e domínio do sistema (iguais aos de src/lib/site.ts)
const SLUG_PADRAO = process.env.SITE_PADRAO ?? "arenastorm";
const DOMINIO = (process.env.NEXT_PUBLIC_DOMINIO_SISTEMA ?? "").toLowerCase();

// "arenax.seudominio.com.br" → "arenax". Endereço principal, www, vercel.app e localhost → arena padrão.
function slugDoEndereco(host: string) {
  const h = host.toLowerCase().split(":")[0];
  if (DOMINIO && h.endsWith(`.${DOMINIO}`)) {
    const sub = h.slice(0, -(DOMINIO.length + 1));
    if (sub && sub !== "www" && !sub.includes(".")) return sub;
  }
  return SLUG_PADRAO;
}

// Roda antes de cada página: login do painel e "qual arena" do site
export async function proxy(request: NextRequest) {
  const rota = request.nextUrl.pathname;
  if (rota.startsWith("/painel") || rota === "/login") return login(request, rota);

  // Site público: o endereço diz qual arena mostrar
  const slug = slugDoEndereco(request.headers.get("host") ?? "");
  const prefixo = `/s/${slug}`;
  // Link antigo/de teste da própria arena (/s/apelido/...) → endereço limpo
  if (rota === prefixo || rota.startsWith(`${prefixo}/`)) {
    const url = request.nextUrl.clone();
    url.pathname = rota.slice(prefixo.length) || "/";
    return NextResponse.redirect(url);
  }
  // Teste de outra arena pelo endereço principal: /s/outra-arena
  if (rota.startsWith("/s/")) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = `${prefixo}${rota === "/" ? "" : rota}`;
  return NextResponse.rewrite(url);
}

async function login(request: NextRequest, rota: string) {
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

// Tudo, menos arquivos internos/estáticos e a API
export const config = {
  matcher: ["/((?!_next/|api/|fotos/|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt|xml)$).*)"],
};
