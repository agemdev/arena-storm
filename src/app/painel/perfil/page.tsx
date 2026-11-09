import { redirect } from "next/navigation";

// Endereço antigo → Configurações › Perfil
export default function PerfilAntigo() {
  redirect("/painel/configuracoes/perfil");
}
