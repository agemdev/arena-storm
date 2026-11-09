import MenuConfig from "./MenuConfig";

// Configurações: menu lateral + página escolhida
export default function ConfigLayout({ children }: LayoutProps<"/painel/configuracoes">) {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Configurações</h1>
      <div className="grid gap-6 md:grid-cols-[13rem_1fr]">
        <aside className="md:sticky md:top-6 md:self-start">
          <MenuConfig />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
