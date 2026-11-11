import ListaItens from "../ListaItens";

// PCs, consoles, simulador... (aparecem no Caixa)
export default function EquipamentosPage() {
  return (
    <ListaItens
      tabela="equipamentos"
      titulo="Equipamentos"
      ajuda="Máquinas que aparecem no Caixa. Desmarque “Ativo” para esconder uma máquina em manutenção. Consoles/VR: digite o IP (e o MAC, se souber) para o mapa mostrar 🟢 ligado / ⚫ desligado. Com o MAC, se o IP mudar, o Servidor acha o novo sozinho (só na mesma rede dele)."
    />
  );
}
