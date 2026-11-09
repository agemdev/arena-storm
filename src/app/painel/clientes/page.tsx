import { Suspense } from "react";
import Link from "next/link";
import { exigirAdmin } from "@/lib/auth";
import { formatarWhats } from "@/lib/whatsapp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ClienteForm from "./ClienteForm";

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
          <ClienteForm />
        </CardContent>
      </Card>
      <Suspense fallback={<p className="text-muted-foreground">Carregando clientes...</p>}>
        <Lista searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Lista({ searchParams }: { searchParams: PageProps<"/painel/clientes">["searchParams"] }) {
  const { supabase } = await exigirAdmin();
  const { q } = await searchParams;
  // Limpa a busca (tira símbolos que quebram o filtro)
  const busca = String(q ?? "").replace(/[^\p{L}\p{N} ]/gu, "").trim();

  let consulta = supabase.from("clientes").select("id, nome, whatsapp").order("nome").limit(200);
  if (busca) {
    const digitos = busca.replace(/\D/g, "");
    consulta = consulta.or(
      digitos.length >= 3 ? `nome.ilike.%${busca}%,whatsapp.ilike.%${digitos}%` : `nome.ilike.%${busca}%`,
    );
  }
  const { data: clientes, error } = await consulta;

  return (
    <Card>
      <CardHeader>
        <form className="flex gap-2">
          <Input name="q" defaultValue={busca} placeholder="Buscar por nome ou WhatsApp" />
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
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell>
                    <a href={`https://wa.me/${c.whatsapp}`} target="_blank" rel="noopener" className="text-cyan hover:underline">
                      {formatarWhats(c.whatsapp)}
                    </a>
                  </TableCell>
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
