import { Suspense } from "react";
import { exigirAdmin } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { pcLigado, quando, servidorLigado } from "@/lib/agentes";
import { removerAgente } from "./actions";
import SenhaMestre from "./SenhaMestre";

// Programa dos PCs: senha mestre, Servidor e lista de PCs
export default function ProgramaPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold">Programa dos PCs</h2>
        <p className="text-sm text-muted-foreground">Substitui o Gizmo: bloqueia o PC livre, mostra o tempo e avisa quando acaba.</p>
      </div>
      <Suspense fallback={<p className="text-muted-foreground">Carregando...</p>}>
        <Conteudo />
      </Suspense>
    </div>
  );
}

async function Conteudo() {
  const { supabase } = await exigirAdmin();
  const [cfg, ags] = await Promise.all([
    supabase.from("agente_config").select("senha_mudada_em, hub_contato").maybeSingle(),
    supabase.from("agentes").select("id, nome_pc, versao, online, estado, ultimo_contato, equipamentos(nome)").order("nome_pc"),
  ]);
  const hubOk = servidorLigado(cfg.data?.hub_contato ?? null);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Senha mestre (Ctrl + Alt + Shift + A)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            No PC, aperte <b>Ctrl + Alt + Shift + A</b> e digite esta senha para liberar para manutenção ou funcionário, desativar ou desinstalar. A senha inicial
            é <b>102030</b>. Última troca: {quando(cfg.data?.senha_mudada_em ?? null)}.
          </p>
          <SenhaMestre />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>PC Servidor</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            {hubOk ? <span className="text-green">🟢 Ligado</span> : <span className="text-muted-foreground">⚫ Desligado ou sem internet</span>} · último
            contato: {quando(cfg.data?.hub_contato ?? null)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>PCs com o programa</CardTitle>
        </CardHeader>
        <CardContent>
          {!ags.data?.length ? (
            <p className="text-sm text-muted-foreground">Nenhum PC ainda. Eles aparecem aqui sozinhos depois de instalar o programa.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PC</TableHead>
                  <TableHead>Máquina</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Versão</TableHead>
                  <TableHead>Último contato</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {ags.data.map((a) => {
                  const ligado = pcLigado(a.online, cfg.data?.hub_contato ?? null);
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.nome_pc}</TableCell>
                      <TableCell>{(a.equipamentos as unknown as { nome: string } | null)?.nome ?? "—"}</TableCell>
                      <TableCell>
                        {a.estado === "desativado" ? (
                          <span className="text-amber">⏸ Desativado</span>
                        ) : ligado ? (
                          <span className="text-green">🟢 Ligado</span>
                        ) : (
                          <span className="text-muted-foreground">⚫ Desligado</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{a.versao ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{quando(a.ultimo_contato)}</TableCell>
                      <TableCell className="text-right">
                        <form action={removerAgente}>
                          <input type="hidden" name="id" value={a.id} />
                          <button type="submit" className="text-xs text-muted-foreground hover:text-destructive">
                            Esquecer
                          </button>
                        </form>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
