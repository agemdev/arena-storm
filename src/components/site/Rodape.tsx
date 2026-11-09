import { ENDERECO, wa } from "@/lib/arena";

// Chamada final + rodapé + botão flutuante do WhatsApp
export default function Rodape() {
  return (
    <>
      <section className="hero-bg px-4 py-20 text-center">
        <h2 className="font-display text-3xl font-bold sm:text-4xl">
          Bora dominar o <span className="text-gradient">lobby</span>?
        </h2>
        <p className="mt-3 text-muted">Sua máquina está a uma mensagem de distância.</p>
        <a
          href={wa("Olá! Quero reservar um horário na Arena Storm.")}
          target="_blank"
          rel="noopener"
          className="btn-primary mt-8 inline-block rounded-xl px-8 py-3 font-semibold"
        >
          🎮 Reservar agora
        </a>
      </section>

      <footer className="border-t border-white/5 px-4 py-8 text-center text-sm text-dim">
        <p>Arena Storm · Game Center · {ENDERECO}</p>
        <p className="mt-1">© Arena Storm. Todos os direitos reservados.</p>
      </footer>

      <a
        href={wa()}
        target="_blank"
        rel="noopener"
        aria-label="Falar no WhatsApp"
        className="fixed right-5 bottom-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-[#25d366] shadow-lg transition hover:scale-105"
      >
        <svg viewBox="0 0 24 24" className="h-7 w-7 fill-white" aria-hidden>
          <path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3 2.4 1 2.9.8 3.4.7.5-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2z" />
        </svg>
      </a>
    </>
  );
}
