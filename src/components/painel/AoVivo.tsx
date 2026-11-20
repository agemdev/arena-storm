"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { supabaseNavegador } from "@/lib/supabase/navegador";

const TABELAS = ["atendimentos", "agendamento_maquinas", "equipamentos", "pagamentos", "agentes"];
const RESERVA_MS = 90_000; // garantia (só se o "ao vivo" cair): recarrega a cada 90 s

// Quando o Caixa, a Agenda ou as máquinas mudam (em qualquer computador ou celular), recarrega os dados da tela
export default function AoVivo() {
  const router = useRouter();

  useEffect(() => {
    const supabase = supabaseNavegador();
    let espera: ReturnType<typeof setTimeout> | undefined;
    let ativo = true;
    let conectado = false; // "ao vivo" funcionando → não precisa recarregar à toa (economiza servidor)
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
      canal.subscribe((status: string) => {
        conectado = status === "SUBSCRIBED";
      });
    })();
    // Login renovado → renova também no "ao vivo"
    const { data: ouvinte } = supabase.auth.onAuthStateChange((_ev: AuthChangeEvent, sessao: Session | null) => {
      if (sessao) supabase.realtime.setAuth(sessao.access_token);
    });

    // Garantias: só se o "ao vivo" caiu (tela visível) e ao voltar para a aba/app
    const reserva = setInterval(() => !conectado && document.visibilityState === "visible" && router.refresh(), RESERVA_MS);
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
