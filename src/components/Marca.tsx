import Image from "next/image";

// Logo + nome da arena (última palavra em ciano). Usado no site e no painel.
export default function Marca({ nome, logoUrl, tamanho = 32 }: { nome: string; logoUrl: string | null; tamanho?: number }) {
  const partes = nome.trim().split(" ");
  const ultima = partes.length > 1 ? partes.pop() : null;

  return (
    <span className="flex items-center gap-2 font-display font-bold">
      {logoUrl ? (
        <Image src={logoUrl} alt={`Logo ${nome}`} width={tamanho} height={tamanho} className="object-contain" />
      ) : (
        <span className="btn-primary grid place-items-center rounded-lg text-sm" style={{ width: tamanho, height: tamanho }}>
          ⚡
        </span>
      )}
      <span>
        {partes.join(" ")} {ultima && <span className="text-cyan">{ultima}</span>}
      </span>
    </span>
  );
}
