import { Suspense } from "react";
import { exigirAdmin, CIDADE_PADRAO } from "@/lib/auth";
import { listarCidadesDoEstado, listarEstados } from "@/lib/locais";
import { Card, CardContent } from "@/components/ui/card";
import { urlLogo } from "@/lib/perfil";
import PerfilForm from "./PerfilForm";

// Perfil da arena: dados da empresa, contato, endereço e logo
export default function PerfilPage() {
  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl font-bold">Perfil da arena</h2>
      <Card>
        <CardContent className="pt-2">
          <Suspense fallback={<p className="text-muted-foreground">Carregando...</p>}>
            <Conteudo />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

async function Conteudo() {
  const { supabase, arenaId } = await exigirAdmin();
  const { data: a } = await supabase
    .from("arenas")
    .select("nome, cnpj, telefone, whatsapp, email, instagram, cep, logradouro, numero, complemento, bairro, logo_path, cidade_id, cidades(uf)")
    .eq("id", arenaId)
    .single();
  if (!a) return <p className="text-destructive">Erro ao carregar o perfil.</p>;

  const cid = a.cidades as unknown as { uf: string } | null;
  const uf = cid?.uf ?? CIDADE_PADRAO.uf;
  const cidadeId = a.cidade_id ?? CIDADE_PADRAO.id;
  const [estados, cidades] = await Promise.all([listarEstados(), listarCidadesDoEstado(uf)]);

  return (
    <PerfilForm
      perfil={{ ...a, logoUrl: urlLogo(a.logo_path) }}
      estados={estados}
      cidades={cidades}
      uf={uf}
      cidadeId={cidadeId}
    />
  );
}
