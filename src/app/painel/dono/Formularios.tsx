"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { PLANOS_LICENCA } from "@/lib/sistema";
import { adicionarAdmin, apagarArena, criarArena, editarLicenca, registrarPagamento, type Resultado } from "./actions";

export type ArenaDono = {
  id: string;
  nome: string;
  slug: string | null;
  plano: string | null;
  valor: number | null;
  vence_em: string | null;
  responsavel: string | null;
  contato: string | null;
  obs: string | null;
};

function Msg({ res }: { res: Resultado }) {
  return res ? <p className={`text-sm ${res.ok ? "text-green" : "text-destructive"}`}>{res.msg}</p> : null;
}

function Campo({ id, rotulo, children }: { id: string; rotulo: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{rotulo}</Label>
      {children}
    </div>
  );
}

function SelectPlano({ id, valor, semCortesia }: { id: string; valor?: string; semCortesia?: boolean }) {
  return (
    <NativeSelect id={id} name="plano" defaultValue={valor ?? "mensal"}>
      {Object.entries(PLANOS_LICENCA)
        .filter(([k]) => !(semCortesia && k === "cortesia"))
        .map(([k, p]) => (
          <option key={k} value={k}>
            {p.nome}
          </option>
        ))}
    </NativeSelect>
  );
}

// Cadastrar uma arena cliente (licença + login do admin)
export function NovaArena({ venceSugerido }: { venceSugerido: string }) {
  const [res, acao, enviando] = useActionState(criarArena, null);
  return (
    <form key={res?.ok ? res.msg : "f"} action={acao} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Campo id="n-nome" rotulo="Nome da arena">
        <Input id="n-nome" name="nome" required />
      </Campo>
      <Campo id="n-slug" rotulo="Endereço (apelido do site)">
        <Input id="n-slug" name="slug" placeholder="ex.: arenax" pattern="[a-z0-9-]{3,40}" title="letras minúsculas, números e hífen" />
      </Campo>
      <Campo id="n-whats" rotulo="WhatsApp da arena">
        <Input id="n-whats" name="whatsapp" inputMode="tel" placeholder="(88) 9..." />
      </Campo>
      <Campo id="n-resp" rotulo="Responsável">
        <Input id="n-resp" name="responsavel" placeholder="Nome do dono da arena" />
      </Campo>
      <Campo id="n-contato" rotulo="Contato do responsável">
        <Input id="n-contato" name="contato" placeholder="Telefone ou e-mail" />
      </Campo>
      <Campo id="n-plano" rotulo="Plano">
        <SelectPlano id="n-plano" />
      </Campo>
      <Campo id="n-valor" rotulo="Valor do plano (R$)">
        <Input id="n-valor" name="valor" inputMode="decimal" placeholder="ex.: 99,90" />
      </Campo>
      <Campo id="n-vence" rotulo="Licença vence em">
        <Input id="n-vence" name="vence_em" type="date" defaultValue={venceSugerido} />
      </Campo>
      <Campo id="n-email" rotulo="E-mail do admin (login)">
        <Input id="n-email" name="email" type="email" required />
      </Campo>
      <Campo id="n-senha" rotulo="Senha provisória (mín. 8)">
        <Input id="n-senha" name="senha" type="text" minLength={8} required autoComplete="off" />
      </Campo>
      <div className="flex items-end sm:col-span-2">
        <Button type="submit" disabled={enviando}>
          {enviando ? "Criando..." : "Criar arena"}
        </Button>
      </div>
      <div className="sm:col-span-2 lg:col-span-4">
        <Msg res={res} />
      </div>
    </form>
  );
}

export function Pagamento({ a, hoje }: { a: ArenaDono; hoje: string }) {
  const [res, acao, enviando] = useActionState(registrarPagamento, null);
  return (
    <form action={acao} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="arena_id" value={a.id} />
      <Campo id={`p-plano-${a.id}`} rotulo="Período pago">
        <SelectPlano id={`p-plano-${a.id}`} valor={a.plano === "cortesia" ? "mensal" : (a.plano ?? "mensal")} semCortesia />
      </Campo>
      <Campo id={`p-valor-${a.id}`} rotulo="Valor (R$)">
        <Input id={`p-valor-${a.id}`} name="valor" inputMode="decimal" defaultValue={a.valor ? String(a.valor).replace(".", ",") : ""} className="w-28" />
      </Campo>
      <Campo id={`p-data-${a.id}`} rotulo="Pago em">
        <Input id={`p-data-${a.id}`} name="pago_em" type="date" defaultValue={hoje} />
      </Campo>
      <Input name="obs" placeholder="Obs. (ex.: Pix)" aria-label="Observação" className="w-36" />
      <Button type="submit" size="sm" disabled={enviando}>
        Registrar pagamento
      </Button>
      <div className="w-full">
        <Msg res={res} />
      </div>
    </form>
  );
}

export function EditarLicenca({ a }: { a: ArenaDono }) {
  const [res, acao, enviando] = useActionState(editarLicenca, null);
  return (
    <form action={acao} className="grid gap-2 sm:grid-cols-3">
      <input type="hidden" name="arena_id" value={a.id} />
      <Campo id={`e-plano-${a.id}`} rotulo="Plano">
        <SelectPlano id={`e-plano-${a.id}`} valor={a.plano ?? "mensal"} />
      </Campo>
      <Campo id={`e-valor-${a.id}`} rotulo="Valor (R$)">
        <Input id={`e-valor-${a.id}`} name="valor" inputMode="decimal" defaultValue={a.valor != null ? String(a.valor).replace(".", ",") : ""} />
      </Campo>
      <Campo id={`e-vence-${a.id}`} rotulo="Vence em">
        <Input id={`e-vence-${a.id}`} name="vence_em" type="date" defaultValue={a.vence_em ?? ""} />
      </Campo>
      <Input name="responsavel" defaultValue={a.responsavel ?? ""} placeholder="Responsável" aria-label="Responsável" />
      <Input name="contato" defaultValue={a.contato ?? ""} placeholder="Contato" aria-label="Contato" />
      <Input name="obs" defaultValue={a.obs ?? ""} placeholder="Observação" aria-label="Observação" />
      <div className="flex items-center gap-3 sm:col-span-3">
        <Button type="submit" size="sm" variant="outline" disabled={enviando}>
          Salvar licença
        </Button>
        <Msg res={res} />
      </div>
    </form>
  );
}

export function NovoAdmin({ arenaId }: { arenaId: string }) {
  const [res, acao, enviando] = useActionState(adicionarAdmin, null);
  return (
    <form key={res?.ok ? res.msg : "f"} action={acao} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="arena_id" value={arenaId} />
      <Input name="email" type="email" placeholder="E-mail do novo admin" aria-label="E-mail" className="w-56" required />
      <Input name="senha" type="text" minLength={8} placeholder="Senha provisória" aria-label="Senha provisória" className="w-40" autoComplete="off" required />
      <Button type="submit" size="sm" variant="outline" disabled={enviando}>
        Adicionar admin
      </Button>
      <div className="w-full">
        <Msg res={res} />
      </div>
    </form>
  );
}

export function Apagar({ a }: { a: ArenaDono }) {
  const [res, acao, enviando] = useActionState(apagarArena, null);
  return (
    <form action={acao} className="space-y-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3">
      <input type="hidden" name="arena_id" value={a.id} />
      <p className="text-sm text-destructive">
        Apagar <b>{a.nome}</b> e TODOS os dados (clientes, caixa, histórico). Não tem volta. Faça o backup antes. Para confirmar, digite o nome exato:
      </p>
      <div className="flex flex-wrap gap-2">
        <Input name="confirma" placeholder={a.nome} aria-label="Nome da arena para confirmar" className="w-56" autoComplete="off" />
        <Button type="submit" size="sm" variant="destructive" disabled={enviando}>
          Apagar de vez
        </Button>
      </div>
      <Msg res={res} />
    </form>
  );
}
