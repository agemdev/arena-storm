"use server";

import { listarCidadesDoEstado } from "@/lib/locais";

// Chamado pelo campo Estado/Cidade quando troca o estado
export async function buscarCidades(uf: string) {
  if (!/^[A-Z]{2}$/.test(uf)) return [];
  return listarCidadesDoEstado(uf);
}
