-- Categorias de produto (Bebidas, Lanches...) para achar rápido no Caixa
alter table public.produtos add column if not exists categoria text not null default 'Outros';
alter table public.produtos drop constraint if exists produtos_categoria_tam, add constraint produtos_categoria_tam check (char_length(categoria) between 1 and 30);
create index if not exists consumos_produto_idx on public.consumos (produto_id);
