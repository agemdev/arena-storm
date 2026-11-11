"use server";

import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/auth";
import { lerValor, TIPOS_EQUIP } from "@/lib/caixa";

export type Resultado = { ok: boolean; msg: string } | null;

// Cria, edita ou exclui um equipamento ou produto (campo "tabela" decide)
export async function salvarItem(_: Resultado, form: FormData): Promise<Resultado> {
  const { supabase, arenaId } = await exigirAdmin();
  const tabela = form.get("tabela") === "produtos" ? "produtos" : "equipamentos";
  const id = String(form.get("id") ?? "");
  const pagina = `/painel/configuracoes/${tabela}`;

  if (form.get("acao") === "excluir" && id) {
    const { error } = await supabase.from(tabela).delete().eq("id", id);
    // Já usado no caixa → não apaga, só oculta
    if (error?.code === "23503") {
      await supabase.from(tabela).update({ ativo: false }).eq("id", id);
      revalidatePath(pagina);
      return { ok: true, msg: "Já foi usado no caixa, então foi desativado em vez de excluído." };
    }
    if (error) return { ok: false, msg: "Erro ao excluir." };
    revalidatePath(pagina);
    return { ok: true, msg: "Excluído." };
  }

  const nome = String(form.get("nome") ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
  if (nome.length < (tabela === "produtos" ? 2 : 1)) return { ok: false, msg: "Digite o nome." };

  const dados: Record<string, unknown> = {
    nome,
    ativo: form.get("ativo") === "on",
    ordem: Number(form.get("ordem")) || 0,
  };
  if (tabela === "produtos") {
    const preco = lerValor(String(form.get("preco") ?? ""));
    if (!(preco >= 0)) return { ok: false, msg: "Preço inválido. Ex: 6 ou 6,50" };
    dados.preco = preco;
  } else {
    const tipo = String(form.get("tipo"));
    dados.tipo = tipo in TIPOS_EQUIP ? tipo : "outro";
    // IP e MAC (só consoles/VR/outros; PC e Simulador usam o programa)
    if (form.has("ip")) {
      const ip = String(form.get("ip") ?? "").trim();
      if (ip && !/^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(ip)) return { ok: false, msg: "IP inválido. Ex: 192.168.0.50" };
      const mac = String(form.get("mac") ?? "").trim().toLowerCase().replace(/[:.\s]/g, "-");
      const macLimpo = mac.replace(/-/g, "");
      if (mac && !/^[0-9a-f]{12}$/.test(macLimpo)) return { ok: false, msg: "MAC inválido. Ex: A4:5E:60:12:34:56" };
      dados.ip = ip || null;
      dados.mac = mac ? macLimpo.match(/../g)!.join("-") : null;
      if (!ip && !mac) dados.rede_online = null; // sem endereço: some o status do mapa
    }
  }

  const { error } = id
    ? await supabase.from(tabela).update(dados).eq("id", id)
    : await supabase.from(tabela).insert({ arena_id: arenaId, ...dados });
  if (error?.code === "23505") return { ok: false, msg: "Já existe um item com esse nome." };
  if (error) return { ok: false, msg: "Erro ao salvar. Tente de novo." };

  revalidatePath(pagina);
  return { ok: true, msg: id ? "Salvo!" : `${nome} adicionado!` };
}
