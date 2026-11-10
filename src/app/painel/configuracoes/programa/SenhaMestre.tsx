"use client";

import { useActionState } from "react";
import { trocarSenhaMestre } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Formulário da senha mestre (o campo limpa depois de salvar)
export default function SenhaMestre() {
  const [res, acao, enviando] = useActionState(trocarSenhaMestre, null);
  return (
    <form key={res?.n ?? "f"} action={acao} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <div className="space-y-2">
        <Label htmlFor="senha">Nova senha mestre</Label>
        <Input id="senha" name="senha" type="password" minLength={6} autoComplete="new-password" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="repetir">Repita a senha</Label>
        <Input id="repetir" name="repetir" type="password" minLength={6} autoComplete="new-password" required />
      </div>
      <Button type="submit" disabled={enviando}>
        {enviando ? "Salvando..." : "Trocar senha"}
      </Button>
      {res && <p className={`text-sm sm:col-span-3 ${res.ok ? "text-green" : "text-destructive"}`}>{res.msg}</p>}
    </form>
  );
}
