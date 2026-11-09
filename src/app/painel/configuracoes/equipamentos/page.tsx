import ListaItens from "../ListaItens";

// PCs, consoles, simulador... (aparecem no Caixa)
export default function EquipamentosPage() {
  return (
    <ListaItens
      tabela="equipamentos"
      titulo="Equipamentos"
      ajuda="Máquinas que aparecem no Caixa. Desmarque “Ativo” para esconder uma máquina em manutenção."
    />
  );
}
