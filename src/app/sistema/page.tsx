import type { Metadata } from "next";
import Link from "next/link";
import { wa } from "@/lib/arena";
import { NOME_SISTEMA, SUPORTE_WHATSAPP } from "@/lib/sistema";

// Página de vendas do sistema (licenças para outras arenas)

export const metadata: Metadata = {
  title: `${NOME_SISTEMA} – Sistema para arenas gamer e lan houses`,
  description: "Caixa, banco de minutos, agenda, mapa das máquinas ao vivo, bloqueio dos PCs, ranking e site próprio. Teste 7 dias grátis.",
};

const DIAS_TESTE = 7;
const quero = wa(SUPORTE_WHATSAPP, `Olá! Quero testar o ${NOME_SISTEMA} por ${DIAS_TESTE} dias grátis. Minha arena é: `);
const orcamento = (plano: string) => wa(SUPORTE_WHATSAPP, `Olá! Quero saber o valor do plano ${plano} do ${NOME_SISTEMA}.`);

const RECURSOS = [
  { icone: "💰", titulo: "Caixa completo", texto: "Tempo de uso calculado sozinho, consumo com busca de produtos, Pix, cartão, dinheiro e pagamento dividido." },
  { icone: "⏱️", titulo: "Banco de minutos", texto: "Cliente ganha minutos a cada real gasto e usa depois. Promoções, ajustes e extrato completo." },
  { icone: "📦", titulo: "Pacotes de horas", texto: "Venda pacotes (ex.: 5 horas) e o sistema desconta conforme o cliente joga." },
  { icone: "📒", titulo: "Fiado controlado", texto: "Conta de cada cliente, recebimento parcial e o caixa somado pelo dia em que o dinheiro entrou." },
  { icone: "🗺️", titulo: "Mapa das máquinas ao vivo", texto: "Veja quem está em cada PC ou console, quanto falta e quem precisa pagar. Atualiza em todos os aparelhos." },
  { icone: "🖥️", titulo: "Programa nos PCs", texto: "Tela de bloqueio quando livre, aviso discreto de tempo acabando (sem atrapalhar partida) e proteção contra fechar." },
  { icone: "🎮", titulo: "Consoles na rede", texto: "PS5, Switch e VR aparecem como ligados/desligados no mapa." },
  { icone: "📅", titulo: "Agenda", texto: "Reservas, corujão, campeonatos e aniversários, com aviso de máquina já reservada." },
  { icone: "🏆", titulo: "Ranking e saldo online", texto: "Ranking dos clientes no site e consulta de saldo pelo WhatsApp do cliente." },
  { icone: "🌐", titulo: "Site da sua arena", texto: "Página própria com fotos, preços, horários, torneios e botão de reserva pelo WhatsApp." },
  { icone: "📊", titulo: "Dashboard e relatórios", texto: "Faturamento, horários de pico, produtos mais vendidos, máquinas mais usadas. Imprima ou exporte para Excel." },
  { icone: "☁️", titulo: "Na nuvem", texto: "Acesse do computador ou do celular. Sem servidor caro: os PCs continuam funcionando se a internet cair." },
];

const PASSOS = [
  { n: "1", titulo: "Chame no WhatsApp", texto: "Conte o nome da arena e quantas máquinas tem." },
  { n: "2", titulo: `Teste ${DIAS_TESTE} dias grátis`, texto: "A gente cria seu acesso e ajuda a configurar preços, máquinas e produtos." },
  { n: "3", titulo: "Escolha o plano", texto: "Pague por Pix, boleto ou cartão. Renovação simples, direto no painel." },
];

const PLANOS = [
  { nome: "Mensal", texto: "Para começar sem compromisso." },
  { nome: "Trimestral", texto: "Um pouco mais em conta." },
  { nome: "Semestral", texto: "Economia maior.", destaque: true },
  { nome: "Anual", texto: "O melhor preço por mês." },
];

const FAQ = [
  { p: "Preciso instalar alguma coisa?", r: "O painel funciona no navegador. Nos PCs de jogo instala um programa leve, que faz o bloqueio e conversa com o PC servidor da arena." },
  { p: "Substitui o Gizmo (ou outro gerenciador)?", r: "Sim. O programa dos PCs bloqueia a máquina quando livre, mostra o tempo e libera para manutenção ou funcionário com senha mestre." },
  { p: "E se a internet cair?", r: "Os PCs continuam com o último estado e as ações ficam guardadas até a internet voltar." },
  { p: "Meus clientes precisam de login?", r: "Não. O cadastro é feito no balcão, só com nome e WhatsApp. O cliente consulta saldo e ranking pelo site." },
  { p: "Como pago a licença?", r: "Por Pix, boleto ou cartão. Dá para deixar a cobrança automática ou gerar a fatura quando quiser." },
  { p: "Se eu parar de pagar, perco tudo?", r: "Não na hora. Você é avisado antes de vencer, tem dias de tolerância e depois o sistema fica só para consulta. Pode pedir um backup dos seus dados." },
];

export default function SistemaPage() {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/5 bg-bg/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <span className="font-display font-bold">
            🎮 <span className="text-gradient">{NOME_SISTEMA}</span>
          </span>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden text-sm text-muted-foreground hover:text-text sm:inline">
              Já sou cliente
            </Link>
            <a href={quero} target="_blank" rel="noopener" className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold">
              Testar grátis
            </a>
          </div>
        </div>
      </header>

      <main>
        {/* Chamada principal */}
        <section className="hero-bg px-4 py-20 text-center md:py-28">
          <span className="inline-flex rounded-full border border-cyan/20 bg-cyan/5 px-3 py-1 text-xs font-semibold tracking-wider text-cyan">
            ● SISTEMA PARA ARENAS GAMER E LAN HOUSES
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl font-display text-4xl leading-tight font-bold sm:text-6xl">
            Sua arena no <span className="text-gradient">controle total</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-muted-foreground">
            Caixa, banco de minutos, mapa das máquinas ao vivo, bloqueio dos PCs, agenda, ranking e site próprio. Feito por quem tem arena, para quem tem arena.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href={quero} target="_blank" rel="noopener" className="btn-primary rounded-xl px-6 py-3 font-semibold">
              🚀 Testar {DIAS_TESTE} dias grátis
            </a>
            <a href="#recursos" className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-semibold hover:bg-white/10">
              Ver o que faz
            </a>
          </div>
          <p className="mt-4 text-xs text-dim">Sem cartão para testar · Configuração com ajuda da equipe</p>
        </section>

        {/* Recursos */}
        <section id="recursos" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
          <Titulo tag="✦ Recursos" titulo="Tudo que a arena precisa, num lugar só" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {RECURSOS.map((r) => (
              <div key={r.titulo} className="rounded-2xl border border-white/5 bg-card p-6 transition hover:bg-card-hover">
                <div className="text-3xl">{r.icone}</div>
                <h3 className="mt-4 font-display text-lg font-bold">{r.titulo}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{r.texto}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Como funciona */}
        <section className="bg-elevated py-20">
          <div className="mx-auto max-w-5xl px-4">
            <Titulo tag="⚡ Como começar" titulo="Em poucos minutos sua arena está rodando" />
            <div className="grid gap-4 md:grid-cols-3">
              {PASSOS.map((p) => (
                <div key={p.n} className="rounded-2xl border border-white/5 bg-card p-6">
                  <div className="btn-primary grid h-10 w-10 place-items-center rounded-xl font-display text-lg font-bold">{p.n}</div>
                  <h3 className="mt-4 font-display text-lg font-bold">{p.titulo}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{p.texto}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Planos */}
        <section id="planos" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
          <Titulo tag="💳 Planos" titulo="Escolha como pagar" texto="Todos os planos têm todos os recursos. Quanto maior o período, menor o valor por mês." />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLANOS.map((p) => (
              <div key={p.nome} className={`flex flex-col rounded-2xl bg-card p-6 ${p.destaque ? "glow" : "border border-white/5"}`}>
                {p.destaque && (
                  <span className="mb-3 w-fit rounded-full bg-purple-strong/20 px-3 py-1 text-xs font-semibold text-purple">Mais escolhido</span>
                )}
                <h3 className="font-display text-xl font-bold">{p.nome}</h3>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">{p.texto}</p>
                <a
                  href={orcamento(p.nome)}
                  target="_blank"
                  rel="noopener"
                  className={`mt-6 rounded-xl px-4 py-2 text-center text-sm font-semibold ${p.destaque ? "btn-primary" : "border border-white/10 bg-white/5 hover:bg-white/10"}`}
                >
                  Pedir valor
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* Dúvidas */}
        <section className="mx-auto max-w-3xl px-4 pb-20">
          <Titulo tag="❓ Dúvidas" titulo="Perguntas frequentes" />
          <div className="space-y-3">
            {FAQ.map((f) => (
              <details key={f.p} className="group rounded-2xl border border-white/5 bg-card p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
                  {f.p}
                  <span className="text-purple transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground">{f.r}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="hero-bg px-4 py-20 text-center">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">
            Bora organizar sua <span className="text-gradient">arena</span>?
          </h2>
          <p className="mt-3 text-muted-foreground">{DIAS_TESTE} dias grátis, sem compromisso.</p>
          <a href={quero} target="_blank" rel="noopener" className="btn-primary mt-8 inline-block rounded-xl px-8 py-3 font-semibold">
            💬 Quero testar
          </a>
        </section>
      </main>

      <footer className="border-t border-white/5 px-4 py-8 text-center text-sm text-dim">© {NOME_SISTEMA}</footer>
    </>
  );
}

function Titulo({ tag, titulo, texto }: { tag: string; titulo: string; texto?: string }) {
  return (
    <div className="mx-auto mb-10 max-w-2xl text-center">
      <span className="text-xs font-semibold tracking-widest text-cyan uppercase">{tag}</span>
      <h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{titulo}</h2>
      {texto && <p className="mt-3 text-muted-foreground">{texto}</p>}
    </div>
  );
}
