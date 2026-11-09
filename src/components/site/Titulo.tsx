// Título padrão das seções
export default function Titulo({ tag, titulo, texto }: { tag: string; titulo: string; texto?: string }) {
  return (
    <div className="mx-auto mb-10 max-w-2xl text-center">
      <span className="text-xs font-semibold tracking-widest text-cyan uppercase">{tag}</span>
      <h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{titulo}</h2>
      {texto && <p className="mt-3 text-muted">{texto}</p>}
    </div>
  );
}
