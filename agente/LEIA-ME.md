# Programa dos PCs (Arena Storm)

Dois instaladores (mesmo programa, modo já definido):

- **Instalar Arena Storm Servidor** → só no PC Servidor. Abre a janela do Servidor (fechar = vai para a bandeja, perto do relógio).
- **Instalar Arena Storm PC** → PCs de jogo e Simulador. Roda escondido: sem janela, sem ícone na área de trabalho.

## Instalar

1. Copie o instalador para o PC (pasta `OneDrive\Arena Storm\Sistema\Instaladores`).
2. Abra. Se aparecer "O Windows protegeu o computador": **Mais informações → Executar assim mesmo** (o programa não tem assinatura paga).
3. Aceite a pergunta de administrador. O instalador já libera o Firewall (portas 47800/47801).
4. Ao terminar, o programa abre sozinho:
   - Servidor: entre com `servidor@arena.storm`.
   - PC: **Ctrl + Alt + Shift + A** → senha mestre → escolha a máquina.

Antes de instalar no PC: feche a versão de teste (`npm run pc`) e o Gizmo daquele PC.

## Proteção

- Abre sozinho junto com o Windows.
- Se fecharem pelo Gerenciador de Tarefas, volta em ~2 segundos.
- Fechar de verdade, desativar ou desinstalar: só pelo acesso mestre (**Ctrl + Alt + Shift + A**). No Servidor: ícone da bandeja → Fechar o Servidor.

## Gerar os instaladores (programador)

```
cd agente
npm install
npm run instalador:pc
npm run instalador:servidor
```

Saem em `agente/dist/`. Teste sem instalar: `npm run pc` / `npm run servidor` (com `ARENA_TESTE=1` a tela de bloqueio fica pequena).
