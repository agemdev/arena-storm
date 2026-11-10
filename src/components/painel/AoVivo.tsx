"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { supabaseNavegador } from "@/lib/supabase/navegador";

const TABELAS = ["atendimentos", "agendamento_maquinas", "equipamentos", "pagamentos", "agentes"];
const RESERVA_MS = 20_000; // garantia: recarrega a cada 20 s mesmo sem aviso

// Quando o Caixa, a Agenda ou as máquinas mudam (em qualquer computador ou celular), recarrega os dados da tela
export default function AoVivo() {
  const router = useRouter();

  useEffect(() => {
    const supabase = supabaseNavegador();
    let espera: ReturnType<typeof setTimeout> | undefined;
    let ativo = true;
    const atualizar = () => {
      clearTimeout(espera);
      espera = setTimeout(() => router.refresh(), 400); // junta vários avisos seguidos
    };
    const canal = supabase.channel("painel-ao-vivo");
    for (const table of TABELAS) canal.on("postgres_changes", { event: "*", schema: "public", table }, atualizar);

    // O "ao vivo" precisa do login (senão o banco não manda nada por causa da segurança)
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!ativo) return;
      if (data.session) await supabase.realtime.setAuth(data.session.access_token);
      canal.subscribe();
    })();
    // Login renovado → renova também no "ao vivo"
    const { data: ouvinte } = supabase.auth.onAuthStateChange((_ev: AuthChangeEvent, sessao: Session | null) => {
      if (sessao) supabase.realtime.setAuth(sessao.access_token);
    });

    // Garantias: a cada 20 s (tela visível) e ao voltar para a aba/app
    const reserva = setInterval(() => document.visibilityState === "visible" && router.refresh(), RESERVA_MS);
    const aoVoltar = () => document.visibilityState === "visible" && router.refresh();
    document.addEventListener("visibilitychange", aoVoltar);

    return () => {
      ativo = false;
      clearTimeout(espera);
      clearInterval(reserva);
      document.removeEventListener("visibilitychange", aoVoltar);
      ouvinte.subscription.unsubscribe();
      supabase.removeChannel(canal);
    };
  }, [router]);

  return null;
}
