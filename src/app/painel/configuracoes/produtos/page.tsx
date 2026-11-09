import ListaItens from "../ListaItens";

// Lanches e bebidas vendidos no balcão (botões rápidos no Caixa)
export default function ProdutosPage() {
  return (
    <ListaItens
      tabela="produtos"
      titulo="Produtos"
      ajuda="Lanches e bebidas. Viram botões rápidos de consumo no Caixa. Preço aceita 6 ou 6,50."
    />
  );
}
