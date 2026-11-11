import Link from "next/link";

const ATALHOS = [
  ["hoje", "Hoje"],
  ["7d", "7 dias"],
  ["mes", "Este mês"],
  ["30d", "30 dias"],
  ["mespassado", "Mês passado"],
] as const;

// Botões de período + datas livres (funciona por link, sem JavaScript)
export default function EscolherPeriodo({ base, chave, de, ate, extra }: { base: string; chave: string; de: string; ate: string; extra?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      {ATALHOS.map(([k, rotulo]) => (
        <Link
          key={k}
          href={`${base}?periodo=${k}`}
          scroll={false}
          className={`rounded-full border px-3 py-1 text-sm ${chave === k ? "border-purple bg-primary/20 text-purple" : "border-border hover:bg-accent"}`}
        >
          {rotulo}
        </Link>
      ))}
      <form action={base} className="flex flex-wrap items-center gap-1 text-sm">
        <input type="date" name="de" defaultValue={de} className="rounded-md border border-border bg-transparent px-2 py-1" aria-label="De" />
        <span className="text-muted-foreground">até</span>
        <input type="date" name="ate" defaultValue={ate} className="rounded-md border border-border bg-transparent px-2 py-1" aria-label="Até" />
        {extra}
        <button type="submit" className={`rounded-full border px-3 py-1 ${chave === "custom" ? "border-purple text-purple" : "border-border hover:bg-accent"}`}>
          Ver
        </button>
      </form>
    </div>
  );
}
