import { duracao } from "@/lib/caixa";
import { Suspense } from "react";
import Link from "next/link";
import { exigirAdmin } from "@/lib/auth";
import { listarCidadesDoEstado, listarEstados } from "@/lib/locais";
import { formatarWhats } from "@/lib/whatsapp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ClienteForm from "./ClienteForm";

type Busca = PageProps<"/painel/clientes">["searchParams"];

// Clientes: cadastro do balcão + lista com busca
export default function ClientesPage({ searchParams }: PageProps<"/painel/clientes">) {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Clientes</h1>
      <Card>
        <CardHeader>
          <CardTitle>Novo cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<p className="text-muted-foreground">Carregando...</p>}>
            <NovoCliente />
          </Suspense>
        </CardContent>
      </Card>
      <Suspense fallback={<p className="text-muted-foreground">Carregando clientes...</p>}>
        <Lista searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function NovoCliente() {
  const { cidadePadrao } = await exigirAdmin();
  const [estados, cidades] = await Promise.all([listarEstados(), listarCidadesDoEstado(cidadePadrao.uf)]);
  return <ClienteForm estados={estados} cidades={cidades} uf={cidadePadrao.uf} cidadeId={cidadePadrao.id} />;
}

type Linha = {
  id: string;
  nome: string;
  whatsapp: string;
  descricao: string | null;
  cidades: { nome: string; uf: string } | null;
};

async function Lista({ searchParams }: { searchParams: Busca }) {
  const { supabase } = await exigirAdmin();
  const { q } = await searchParams;
  // Limpa a busca (tira símbolos que quebram o filtro)
  const busca = String(q ?? "").replace(/[^\p{L}\p{N} ]/gu, "").trim();

  let consulta = supabase
    .from("clientes")
    .select("id, nome, whatsapp, descricao, cidades(nome, uf)")
    .order("nome")
    .limit(200);
  if (busca) {
    const digitos = busca.replace(/\D/g, "");
    const filtros = [`nome.ilike.%${busca}%`, `descricao.ilike.%${busca}%`];
    if (digitos.length >= 3) filtros.push(`whatsapp.ilike.%${digitos}%`);
    consulta = consulta.or(filtros.join(","));
  }
  const { data, error } = await consulta;
  const clientes = data as unknown as Linha[] | null;
  // Saldo do Banco de Minutos de cada cliente da lista
  const { data: saldos } = clientes?.length
    ? await supabase.from("minutos_saldos").select("cliente_id, saldo").in("cliente_id", clientes.map((c) => c.id))
    : { data: [] };
  const saldoDe = new Map((saldos ?? []).map((s) => [s.cliente_id, s.saldo]));
  // Pacote de horas de cada cliente
  const { data: pacotes } = clientes?.length
    ? await supabase.from("pacote_saldos").select("cliente_id, saldo").in("cliente_id", clientes.map((c) => c.id))
    : { data: [] };
  const pacoteDe = new Map((pacotes ?? []).map((s) => [s.cliente_id, Number(s.saldo)]));

  return (
    <Card>
      <CardHeader>
        <form className="flex gap-2">
          <Input name="q" defaultValue={busca} placeholder="Buscar por nome, WhatsApp ou descrição" />
          <Button type="submit" variant="outline">Buscar</Button>
        </form>
      </CardHeader>
      <CardContent>
        {error && <p className="text-destructive">Erro ao carregar clientes.</p>}
        {clientes?.length === 0 && <p className="text-muted-foreground">Nenhum cliente encontrado.</p>}
        {!!clientes?.length && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead className="hidden md:table-cell">Cidade</TableHead>
                <TableHead className="text-right">Minutos</TableHead>
                <TableHead className="text-right">Pacote</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="whitespace-normal">
                    <span className="font-medium">{c.nome}</span>
                    {c.descricao && (
                      <span className="line-clamp-1 text-xs text-muted-foreground">{c.descricao}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <a href={`https://wa.me/${c.whatsapp}`} target="_blank" rel="noopener" className="text-cyan hover:underline">
                      {formatarWhats(c.whatsapp)}
                    </a>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {c.cidades ? `${c.cidades.nome}-${c.cidades.uf}` : "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium text-cyan">{saldoDe.get(c.id) ?? 0}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{pacoteDe.get(c.id) ? `${duracao(pacoteDe.get(c.id)!)} h` : "—"}</TableCell>
                  <TableCell>
                    <Link href={`/painel/clientes/${c.id}`} className="text-sm text-muted-foreground hover:text-foreground">
                      Editar
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
