import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { exigirAdmin } from "@/lib/auth";
import { sair } from "@/app/login/actions";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Painel – Arena Storm", robots: { index: false } };

// Moldura do painel: menu + usuário logado
export default function PainelLayout({ children }: LayoutProps<"/painel">) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-elevated">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
          <Link href="/painel" className="font-display font-bold">
            ⚡ Arena <span className="text-cyan">Storm</span>
          </Link>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/painel" className="hover:text-foreground">Início</Link>
            <Link href="/painel/clientes" className="hover:text-foreground">Clientes</Link>
          </nav>
          <div className="ml-auto">
            <Suspense>
              <Usuario />
            </Suspense>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}

async function Usuario() {
  const { email } = await exigirAdmin();
  return (
    <form action={sair} className="flex items-center gap-3 text-sm">
      <span className="hidden text-muted-foreground sm:inline">{email}</span>
      <Button type="submit" variant="outline" size="sm">Sair</Button>
    </form>
  );
}
