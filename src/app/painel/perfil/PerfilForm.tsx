"use client";

import { useActionState, useState } from "react";
import { salvarPerfil } from "./actions";
import { buscarCidades } from "@/app/painel/locais-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import CampoMascara from "@/components/painel/CampoMascara";
import CampoCidade from "@/components/painel/CampoCidade";
import type { Cidade, Estado } from "@/lib/locais";

export type Perfil = {
  nome: string;
  cnpj: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  instagram: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  logoUrl: string | null;
};

type Props = { perfil: Perfil; estados: Estado[]; cidades: Cidade[]; uf: string; cidadeId: number };

// Bloco com título dentro do formulário
function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <legend className="mb-2 font-display text-lg font-bold">{titulo}</legend>
      {children}
    </fieldset>
  );
}

function Campo({ id, label, span = 1, children }: { id: string; label: string; span?: 1 | 2 | 4; children: React.ReactNode }) {
  const col = { 1: "", 2: "sm:col-span-2", 4: "sm:col-span-2 lg:col-span-4" }[span];
  return (
    <div className={`space-y-2 ${col}`}>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

export default function PerfilForm({ perfil, estados, cidades, uf, cidadeId }: Props) {
  const [res, acao, enviando] = useActionState(salvarPerfil, null);
  const [end, setEnd] = useState({ logradouro: perfil.logradouro ?? "", bairro: perfil.bairro ?? "" });
  const [local, setLocal] = useState({ uf, cidadeId, cidades, versao: 0 });
  const [avisoCep, setAvisoCep] = useState("");
  const [previa, setPrevia] = useState<string | null>(perfil.logoUrl);

  // Busca o endereço pelo CEP (ViaCEP) e preenche rua, bairro e cidade
  async function buscarCep(cep: string) {
    if (cep.length !== 8) return setAvisoCep("");
    setAvisoCep("Buscando CEP...");
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`).then((x) => x.json());
      if (r.erro) return setAvisoCep("CEP não encontrado.");
      setEnd({ logradouro: r.logradouro || end.logradouro, bairro: r.bairro || end.bairro });
      const lista = await buscarCidades(r.uf);
      setLocal((v) => ({ uf: r.uf, cidadeId: Number(r.ibge), cidades: lista, versao: v.versao + 1 }));
      setAvisoCep("");
    } catch {
      setAvisoCep("Não foi possível buscar o CEP.");
    }
  }

  return (
    <form action={acao} className="space-y-8">
      <Grupo titulo="Identificação">
        <Campo id="nome" label="Nome da arena" span={2}>
          <Input id="nome" name="nome" defaultValue={perfil.nome} required minLength={2} maxLength={80} />
        </Campo>
        <Campo id="cnpj" label="CNPJ (opcional)" span={2}>
          <CampoMascara id="cnpj" name="cnpj" tipo="cnpj" valorInicial={perfil.cnpj} />
        </Campo>
        <Campo id="logo" label="Logotipo (PNG, JPG ou WEBP, até 1MB)" span={4}>
          <div className="flex items-center gap-4">
            <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-input/30">
              {previa ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previa} alt="Logotipo" className="size-full object-contain" />
              ) : (
                <span className="text-xs text-muted-foreground">Sem logo</span>
              )}
            </div>
            <div className="space-y-2">
              <Input
                id="logo"
                name="logo"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  setPrevia(f ? URL.createObjectURL(f) : perfil.logoUrl);
                }}
              />
              {perfil.logoUrl && (
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" name="remover_logo" /> Remover logotipo atual
                </label>
              )}
            </div>
          </div>
        </Campo>
      </Grupo>

      <Grupo titulo="Contato">
        <Campo id="whatsapp" label="WhatsApp">
          <CampoMascara id="whatsapp" name="whatsapp" tipo="telefone" valorInicial={perfil.whatsapp?.replace(/^55/, "")} />
        </Campo>
        <Campo id="telefone" label="Telefone fixo (opcional)">
          <CampoMascara id="telefone" name="telefone" tipo="telefone" valorInicial={perfil.telefone} />
        </Campo>
        <Campo id="email" label="E-mail">
          <Input id="email" name="email" type="email" defaultValue={perfil.email ?? ""} />
        </Campo>
        <Campo id="instagram" label="Instagram">
          <Input id="instagram" name="instagram" placeholder="arena.storm" defaultValue={perfil.instagram ?? ""} />
        </Campo>
      </Grupo>

      <Grupo titulo="Endereço">
        <Campo id="cep" label="CEP">
          <CampoMascara id="cep" name="cep" tipo="cep" valorInicial={perfil.cep} onValor={buscarCep} />
          {avisoCep && <p className="text-xs text-muted-foreground">{avisoCep}</p>}
        </Campo>
        <Campo id="logradouro" label="Rua / Avenida" span={2}>
          <Input
            id="logradouro"
            name="logradouro"
            value={end.logradouro}
            onChange={(e) => setEnd({ ...end, logradouro: e.target.value })}
          />
        </Campo>
        <Campo id="numero" label="Número">
          <Input id="numero" name="numero" defaultValue={perfil.numero ?? ""} maxLength={20} />
        </Campo>
        <Campo id="complemento" label="Complemento">
          <Input id="complemento" name="complemento" defaultValue={perfil.complemento ?? ""} maxLength={60} />
        </Campo>
        <Campo id="bairro" label="Bairro">
          <Input id="bairro" name="bairro" value={end.bairro} onChange={(e) => setEnd({ ...end, bairro: e.target.value })} />
        </Campo>
        {/* key muda quando o CEP troca a cidade → recarrega as listas */}
        <CampoCidade
          key={local.versao}
          estados={estados}
          cidadesIniciais={local.cidades}
          uf={local.uf}
          cidadeId={local.cidadeId}
        />
        <p className="text-xs text-muted-foreground sm:col-span-2 lg:col-span-4">
          A cidade da arena vem marcada por padrão no cadastro de novos clientes.
        </p>
      </Grupo>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={enviando}>
          {enviando ? "Salvando..." : "Salvar perfil"}
        </Button>
        {res && <p className={`text-sm ${res.ok ? "text-green" : "text-destructive"}`}>{res.msg}</p>}
      </div>
    </form>
  );
}
