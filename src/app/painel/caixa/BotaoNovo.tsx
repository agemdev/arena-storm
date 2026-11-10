"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Janela from "@/components/painel/Janela";
import { hhmm, type ComSaldo } from "@/lib/caixa";
import NovoAtendimento, { type ClienteOpcao, type EquipOpcao } from "./NovoAtendimento";

type Props = { data: string; valorHora: string; clientes: ClienteOpcao[]; equipamentos: EquipOpcao[]; comSaldo: ComSaldo[] };

// Botão "Novo atendimento" que abre o formulário flutuante
export default function BotaoNovo(props: Props) {
  const [agora, setAgora] = useState<string | null>(null); // hora em que abriu = início sugerido

  return (
    <>
      <Button size="lg" onClick={() => setAgora(hhmm(new Date().toISOString()))}>
        <Plus className="size-5" /> Novo atendimento
      </Button>
      {agora && (
        <Janela onFechar={() => setAgora(null)} largura="max-w-2xl" titulo={<h2 className="font-display text-xl font-bold">Novo atendimento</h2>}>
          {props.equipamentos.length === 0 && (
            <p className="mb-3 text-sm text-muted-foreground">
              Nenhuma máquina cadastrada.{" "}
              <Link href="/painel/configuracoes/equipamentos" className="text-cyan hover:underline">
                Cadastrar equipamentos
              </Link>
            </p>
          )}
          <NovoAtendimento {...props} agora={agora} onIniciado={() => setAgora(null)} />
        </Janela>
      )}
    </>
  );
}
