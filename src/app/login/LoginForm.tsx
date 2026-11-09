"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { entrar } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginForm() {
  const [erro, acao, enviando] = useActionState(entrar, null);
  const semArena = useSearchParams().get("erro") === "sem-arena";
  const aviso = erro ?? (semArena ? "Seu login não está ligado a nenhuma arena." : null);

  return (
    <form action={acao} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="senha">Senha</Label>
        <Input id="senha" name="senha" type="password" autoComplete="current-password" required />
      </div>
      {aviso && <p className="text-sm text-destructive">{aviso}</p>}
      <Button type="submit" className="w-full" disabled={enviando}>
        {enviando ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}
