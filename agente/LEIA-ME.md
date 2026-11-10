# Programa dos PCs (Arena Storm)

Um só programa, dois modos:

- **Servidor** (PC Servidor, só 1): liga os PCs ao painel. Precisa de internet e de um login próprio.
- **PC** (PCs de jogo e Simulador): bloqueia o PC livre, mostra o tempo, avisa e obedece ao Caixa.

## Testar (fase 6a, sem instalador)

Precisa do Node.js instalado (https://nodejs.org) e desta pasta copiada no PC.

```
cd agente
npm install
npm run servidor   # no PC Servidor
npm run pc         # no PC de jogo (ex.: Computador #10)
```

- O PC acha o Servidor sozinho na rede. Se não achar: Ctrl + Alt + Shift + A → Endereço do Servidor.
- Na primeira vez o PC pede a senha mestre (padrão **102030**) e qual máquina ele é.
- Liberar a porta **47800 (TCP)** e **47801 (UDP)** no Firewall do Windows do Servidor (o Windows pergunta na 1ª vez: marque "Redes privadas").

## Teste sem travar a tela

`ARENA_TESTE=1` → janela de bloqueio pequena e configuração em pasta temporária.

## Acesso mestre

**Ctrl + Alt + Shift + A** em qualquer momento (até em jogo). Senha definida no painel → Configurações → Programa dos PCs.
