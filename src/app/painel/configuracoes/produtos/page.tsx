import ListaItens from "../ListaItens";

// Lanches e bebidas vendidos no balcão (botões rápidos no Caixa)
export default function ProdutosPage() {
  return (
    <ListaItens
      tabela="produtos"
      titulo="Produtos"
      ajuda="Lanches e bebidas. No Caixa dá para buscar pelo nome ou filtrar pela categoria (ex.: Bebidas, Lanches, Doces). Preço aceita 6 ou 6,50."
    />
  );
}
