import { Suspense } from "react";
import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Entrar – Painel Arena Storm", robots: { index: false } };

// Tela de login do painel (só admins)
export default function LoginPage() {
  return (
    <main className="hero-bg grid min-h-screen place-items-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="font-display text-xl">
            ⚡ Arena <span className="text-cyan">Storm</span> · Painel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense>
            <LoginForm />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  );
}
