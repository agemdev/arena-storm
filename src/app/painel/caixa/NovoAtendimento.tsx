"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { abrirAtendimento, type Resultado } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { duracao, DURACOES, somarMinutosHora, type ComSaldo } from "@/lib/caixa";
import UsarMinutos from "@/components/painel/UsarMinutos";

export type ClienteOpcao = { id: string; nome: string; whatsapp: string };
export type EquipOpcao = { id: string; nome: string; emUso: boolean; reserva?: string; tv?: string; bloqueio?: string }; // reserva = "20:00"; tv = quem usa a TV dividida; bloqueio = "Manutenção"

type Props = {
  data: string;
  agora: string; // "14:15"
  valorHora: string; // "12"
  clientes: ClienteOpcao[];
  equipamentos: EquipOpcao[];
  equipInicial?: string; // máquina já escolhida (ex.: clique no mapa)
  comSaldo?: ComSaldo[]; // clientes com minutos (pagar com minutos de...)
  comPacote?: ComSaldo[]; // clientes com pacote de horas
  onIniciado?: () => void; // fecha a janela depois de iniciar
};

// Formulário rápido: quem, qual máquina, que horas
export default function NovoAtendimento(props: Props) {
  const [res, acao, enviando] = useActionState(abrirAtendimento, null);
  const { onIniciado } = props;
  const router = useRouter();
  useEffect(() => {
    if (!res?.ok) return;
    onIniciado?.();
    if (res.abrir) router.push(res.abrir, { scroll: false }); // só consumo → abre a janela dele
  }, [res, onIniciado, router]);
  // key muda após iniciar → limpa os campos
  return <Campos key={res?.n ?? "f"} {...props} res={res} acao={acao} enviando={enviando} />;
}

type CamposProps = Props & {
  res: Resultado;
  acao: (f: FormData) => void;
  enviando: boolean;
};

function Campos({ data, agora, valorHora, clientes, equipamentos, equipInicial, comSaldo = [], comPacote = [], res, acao, enviando }: CamposProps) {
  const [busca, setBusca] = useState("");
  const [cliente, setCliente] = useState<ClienteOpcao | null>(null);
  const [aberto, setAberto] = useState(false);
  const [equip, setEquip] = useState(equipInicial ?? "livre"); // livre = tempo sem máquina fixa
  const [ini, setIni] = useState(agora);
  const [prev, setPrev] = useState(""); // fim previsto (vazio = tempo livre)
  const [minDe, setMinDe] = useState(""); // pagar com minutos de (vazio = não)
  const [pacDe, setPacDe] = useState(""); // usar pacote de horas de (vazio = não)
  const comTempo = equip !== "";
  const escolhida = equipamentos.find((e) => e.id === equip);

  // Até 8 clientes que batem com o nome ou número digitado
  const sugestoes = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (t.length < 2 || cliente) return [];
    const d = t.replace(/\D/g, "");
    return clientes
      .filter((c) => c.nome.toLowerCase().includes(t) || (d.length >= 3 && c.whatsapp.includes(d)))
      .slice(0, 8);
  }, [busca, cliente, clientes]);

  return (
    <form
      action={acao}
      className="grid gap-4 sm:grid-cols-6 sm:items-start"
    >
      <input type="hidden" name="data" value={data} />
      <input type="hidden" name="cliente_id" value={cliente?.id ?? ""} />

      <div className="relative space-y-2 sm:col-span-6">
        <Label htmlFor="nome">Cliente</Label>
        <Input
          id="nome"
          name="nome"
          value={cliente ? cliente.nome : busca}
          onChange={(e) => {
            setCliente(null);
            setBusca(e.target.value);
            setAberto(true);
          }}
          onFocus={() => setAberto(true)}
          onBlur={() => setTimeout(() => setAberto(false), 150)}
          placeholder="Nome ou WhatsApp"
          autoComplete="off"
          autoFocus
          required
        />
        {aberto && sugestoes.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
            {sugestoes.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className="flex w-full justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setCliente(c);
                    setAberto(false);
                  }}
                >
                  <span>{c.nome}</span>
                  <span className="text-muted-foreground">{c.whatsapp.slice(-4)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">
          {cliente ? (
            <span className="text-green">✓ Cliente cadastrado (ganha minutos)</span>
          ) : busca.trim() ? (
            "Avulso: não ganha minutos. Escolha da lista se for cadastrado."
          ) : (
            "Digite para buscar clientes cadastrados."
          )}
        </p>
      </div>

      <div className="space-y-2 sm:col-span-6">
        <Label htmlFor="equipamento_id">Máquina</Label>
        <NativeSelect id="equipamento_id" name="equipamento_id" value={equip} onChange={(e) => setEquip(e.target.value)}>
          <option value="livre">Livre (qualquer máquina)</option>
          {equipamentos.map((e) => (
            <option key={e.id} value={e.id} disabled={e.emUso || !!e.bloqueio}>
              {e.nome}
              {e.emUso ? " (em uso)" : ""}
              {e.bloqueio ? ` (${e.bloqueio})` : ""}
              {e.reserva ? ` ⚠ reservada às ${e.reserva}` : ""}
              {e.tv ? ` ⚠ TV em uso (${e.tv})` : ""}
            </option>
          ))}
          <option value="">Só consumo (sem tempo)</option>
        </NativeSelect>
        {escolhida?.reserva && (
          <p className="text-xs text-amber">⚠ Esta máquina tem reserva às {escolhida.reserva}. Combine o fim antes desse horário.</p>
        )}
        {escolhida?.tv && <p className="text-xs text-amber">⚠ A TV desta máquina está em uso pelo {escolhida.tv}.</p>}
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="inicio">Início</Label>
        <Input id="inicio" name="inicio" type="time" value={ini} onChange={(e) => setIni(e.target.value)} disabled={!comTempo} />
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="fim_previsto">Fim</Label>
        <Input
          id="fim_previsto"
          name="fim_previsto"
          type="time"
          value={prev}
          onChange={(e) => setPrev(e.target.value)}
          disabled={!comTempo}
          title="Vazio = tempo livre"
        />
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="valor_hora">R$ / hora</Label>
        <Input id="valor_hora" name="valor_hora" inputMode="decimal" defaultValue={valorHora} disabled={!comTempo} />
      </div>

      {/* Atalhos de duração: preenchem o Fim a partir do Início */}
      {comTempo && (
        <div className="flex flex-wrap items-center gap-2 sm:col-span-6">
          <span className="text-xs text-muted-foreground">Quanto tempo?</span>
          {DURACOES.map((d) => (
            <button
              key={d.min}
              type="button"
              onClick={() => setPrev(somarMinutosHora(ini, d.min))}
              className="rounded-full border border-border px-3 py-1 text-xs hover:bg-accent"
            >
              {d.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPrev("")}
            className={`rounded-full border px-3 py-1 text-xs hover:bg-accent ${prev ? "border-border" : "border-purple text-purple"}`}
          >
            Livre (sem hora para acabar)
          </button>
        </div>
      )}

      {/* Pacote de horas: desconta o tempo jogado */}
      {comTempo && comPacote.length > 0 && (
        <div className="space-y-2 sm:col-span-6">
          <Label htmlFor="pacote_de">Usar pacote de horas de</Label>
          <UsarMinutos id="pacote_de" comSaldo={comPacote} name="pacote_de" value={pacDe} onChange={setPacDe} primeiro={cliente?.id} vazio="Não usar pacote" horas />
          {cliente && !pacDe && comPacote.some((c) => c.id === cliente.id) && (
            <button type="button" onClick={() => setPacDe(cliente.id)} className="text-xs text-cyan hover:underline">
              {cliente.nome} tem pacote ({duracao(comPacote.find((c) => c.id === cliente.id)!.saldo)} h). Usar?
            </button>
          )}
          {pacDe && <p className="text-xs text-muted-foreground">Ao encerrar, desconta o tempo jogado do pacote.</p>}
        </div>
      )}

      {/* Pagar com minutos de alguém (o próprio cliente, um amigo, promoção) */}
      {comTempo && comSaldo.length > 0 && (
        <div className="space-y-2 sm:col-span-6">
          <Label htmlFor="minutos_de">Pagar com minutos de</Label>
          <UsarMinutos id="minutos_de" comSaldo={comSaldo} name="minutos_de" value={minDe} onChange={setMinDe} primeiro={cliente?.id} />
          {cliente && !minDe && comSaldo.some((c) => c.id === cliente.id) && (
            <button type="button" onClick={() => setMinDe(cliente.id)} className="text-xs text-purple hover:underline">
              {cliente.nome} tem {comSaldo.find((c) => c.id === cliente.id)!.saldo} min. Usar?
            </button>
          )}
          {minDe && <p className="text-xs text-muted-foreground">Ao encerrar, desconta sozinho até o saldo dar. O que faltar fica a receber.</p>}
        </div>
      )}

      <div className="sm:col-span-6">
        <Button type="submit" disabled={enviando}>
          {enviando ? "Abrindo..." : comTempo ? "Iniciar tempo" : "Lançar consumo"}
        </Button>
      </div>

      {res && <p className={`text-sm sm:col-span-6 ${res.ok ? "text-green" : "text-destructive"}`}>{res.msg}</p>}
    </form>
  );
}
