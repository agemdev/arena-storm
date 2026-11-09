import { redirect } from "next/navigation";

// Configurações abre direto no Perfil
export default function Configuracoes() {
  redirect("/painel/configuracoes/perfil");
}
