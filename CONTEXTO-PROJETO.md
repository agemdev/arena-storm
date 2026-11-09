# Arena Storm – Contexto e Histórico do Projeto
> Documento de handoff para o Claude Code. Ler junto com `CLAUDE.md`.
> Última atualização: 09/11/2026

## 1. Sobre o projeto
- **Cliente/Dono:** Pedro (Tianguá-CE). Não é programador profissional (nível básico).
- **Negócio:** Arena Storm – arena gamer (PCs para jogos, eventos, campeonatos).
- **Objetivo:** SaaS de gestão da arena, para substituir o **Gizmo** (hoje roda no PC Servidor da arena). Futuro: replicar e revender a outras arenas.
- **Papel do Claude:** Arquiteto de Software Sênior e Mentor. Respostas telegráficas, linguagem leiga, foco em economia de tokens.

## 2. Escopo funcional
| Módulo | Descrição |
|---|---|
| Site institucional | Página inicial leve, padrão consagrado: local (mapa), contato, reservas, fotos/vídeos, próximos eventos |
| Cadastro | Cliente = Nome + WhatsApp (WhatsApp é a chave única). **Só no balcão** (painel admin) |
| Agendamento | Reservas, corujões, campeonatos, aniversários/eventos. Calendário com bloqueio de conflito |
| Caixa/Consumo | Registro de tudo que o cliente gasta (horas, lanches, eventos) |
| Banco de Minutos | Promoção fixa: **cada R$ 1,00 gasto = 1 minuto de bônus**, qualquer tipo de consumo. Implementar como ledger (extrato de créditos/débitos), nunca editar saldo direto |
| Ranking | Horas jogadas por cliente (mês e total) |
| Controle de máquinas | Status por PC (livre/ocupado/tempo restante), iniciar/encerrar sessão, bloqueio/liberação – semelhante a Gizmo e CafeStation |
| SaaS | Multi-arena com dados isolados |

## 3. Decisões tomadas
- **Sem pagamento online.** Todo "pagar/reservar" → link para o WhatsApp da Arena: `https://wa.me/5588992320187` (+55 88 99232-0187).
- **Sem mensagens automáticas de WhatsApp** por enquanto (fase futura).
- **Sem login de cliente** por enquanto; cadastro feito no balcão. Confirmação via WhatsApp pode vir depois.
- **Código:** `E:\Dev\arena-storm` (fora do OneDrive, porque o OneDrive sincronizando `node_modules` trava e corrompe o projeto). Backup: GitHub (repositório privado `arena-storm`).
- **Documentação:** `E:\OneDrive\Arena Storm\Sistema`.
- **PC Servidor da arena:** hoje roda o Gizmo Server. Será o hub local da nossa solução (substitui o Gizmo no M6).

## 4. Arquitetura
```
[Site + Painel Admin]  Next.js → Vercel ─────────┐
                                                 ├─► Supabase (Postgres, Auth, Realtime, Storage)
[PC Servidor (hub LAN)] ◄── rede local ──────────┘
        ▲
        └── [Agente em cada PC] Electron + SQLite local (offline-first, fila de sync)
```
| Camada | Tecnologia | Motivo |
|---|---|---|
| Web | Next.js (App Router) + TypeScript + Tailwind + shadcn/ui | Um projeto só, deploy simples na Vercel |
| Backend | Supabase | Preferência do dono; Realtime para o painel de máquinas |
| Agente dos PCs | Electron | Mesma linguagem do site (JS/TS); mais simples que Tauri (que exige Rust) |
| Multi-arena | Coluna `arena_id` em todas as tabelas + RLS | Isolamento de dados desde o início |
| Deploy | GitHub → Vercel (automático a cada push) | |

**Estratégia híbrida (LAN + Web):**
1. Nuvem em primeiro lugar: o Supabase é a fonte da verdade.
2. O agente conta o tempo localmente e bloqueia o PC quando ele acaba, mesmo sem internet. As ações ficam numa fila e sincronizam quando a conexão volta.
3. O PC Servidor atua como hub da rede local entre os agentes e a nuvem (M6).
4. Recomendado: roteador 4G de reserva para a internet.
5. Descartado: Supabase self-hosted local via Docker + sincronização (complexo demais para manter).

**Limitação do Windows:** nenhum app bloqueia Ctrl+Alt+Del sozinho. Os PCs dos clientes precisam de uma conta restrita do Windows (GPO), além do agente.

## 5. Milestones
- [ ] **M0** Setup: Node.js, Git, contas GitHub/Supabase/Vercel, `create-next-app`, primeiro deploy
- [ ] **M1** Site institucional (local, contato, fotos/vídeos, eventos, botão WhatsApp)
- [ ] **M2** Login admin + cadastro de clientes (balcão)
- [ ] **M3** Agendamentos (4 tipos) + página pública de eventos
- [ ] **M4** Caixa/consumo + Banco de Minutos (ledger)
- [ ] **M5** Painel de máquinas (cadastro de PCs, sessões, tempo ao vivo)
- [ ] **M6** Agente Electron + hub no PC Servidor (substitui o Gizmo)
- [ ] **M7** Ranking + consulta de saldo/horas pelo cliente
- [ ] **M8** SaaS multi-arena (onboarding, planos, white-label)

**Fases futuras (não priorizadas):** pagamento online (Pix via Mercado Pago/Asaas), WhatsApp automático, login do cliente com código pelo WhatsApp.

## 6. Passos do M0 (para o dono executar)
1. Instalar o Node.js LTS e o Git.
2. Criar as contas GitHub, Supabase e Vercel (entrar no Supabase e na Vercel pelo GitHub).
3. No PowerShell:
   ```powershell
   mkdir E:\Dev
   cd E:\Dev
   npx create-next-app@latest arena-storm --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
   cd arena-storm
   npm run dev
   ```
4. Copiar o `CLAUDE.md` para `E:\Dev\arena-storm\`.
5. Criar o repositório privado `arena-storm` no GitHub e enviar o código:
   ```powershell
   git add .
   git commit -m "M0: projeto inicial"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/arena-storm.git
   git push -u origin main
   ```
6. Na Vercel: Add New → Project → importar `arena-storm` → Deploy.
7. No Supabase: New Project `arena-storm`, região São Paulo (guardar a senha do banco).

## 7. Status atual
- Plano aprovado.
- `CLAUDE.md` criado em `E:\OneDrive\Arena Storm\Sistema`.
- **Próximo passo:** executar o M0 e depois iniciar o M1 (site institucional).

## 8. Instrução para o Claude Code
Ao iniciar: ler `CLAUDE.md` e este arquivo, confirmar o milestone atual e seguir as Regras de Ouro (respostas telegráficas, alterações cirúrgicas, pedir confirmação antes de instalar bibliotecas pesadas ou mudar a arquitetura).
