"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseNavegador } from "@/lib/supabase/navegador";

const TABELAS = ["atendimentos", "agendamento_maquinas", "equipamentos", "pagamentos", "agentes"];

// Quando o Caixa, a Agenda ou as máquinas mudam (em qualquer computador), recarrega os dados da tela
export default function AoVivo() {
  const router = useRouter();

  useEffect(() => {
    const supabase = supabaseNavegador();
    let espera: ReturnType<typeof setTimeout> | undefined;
    const atualizar = () => {
      clearTimeout(espera);
      espera = setTimeout(() => router.refresh(), 400); // junta vários avisos seguidos
    };
    const canal = supabase.channel("painel-ao-vivo");
    for (const table of TABELAS) canal.on("postgres_changes", { event: "*", schema: "public", table }, atualizar);
    canal.subscribe();
    return () => {
      clearTimeout(espera);
      supabase.removeChannel(canal);
    };
  }, [router]);

  return null;
}
