# Arena Storm – Regras do Projeto

@AGENTS.md

## Contexto
SaaS de gestão de arena gamer (Arena Storm). Futuro: revenda multi-arena.
Dono: não é programador profissional (nível básico).
Código: E:\Dev\arena-storm (backup: GitHub). Docs: E:\OneDrive\Arena Storm\Sistema.

## Stack
- Web (site + painel): Next.js (App Router) + TypeScript + Tailwind + shadcn/ui → Vercel
- Backend: Supabase (Postgres, Auth, Realtime, Storage)
- Agente PCs: Electron + SQLite local (offline-first, fila de sync)
- PC Servidor da arena (hoje roda Gizmo Server): futuro hub local LAN; substitui o Gizmo.
- Toda tabela tem `arena_id` + RLS ativo.
- Banco de Minutos = tabela de lançamentos (ledger). Nunca editar saldo direto. R$1 = 1 min.

## Decisões de negócio
- Sem pagamento online. Todo "pagar/reservar" → link WhatsApp da Arena:
  https://wa.me/5588992320187
- Sem mensagens automáticas de WhatsApp (fase futura).
- Cadastro de clientes só no balcão (painel admin). Sem login de cliente por enquanto.

## Regras de Ouro
1. **Economia de tokens:** respostas telegráficas. Sem introdução/conclusão.
2. **Modificações cirúrgicas:** mostrar só o bloco alterado + caminho do arquivo. Arquivo inteiro só se estritamente necessário.
3. **Comunicação simples:** linguagem leiga. Comentários curtos e objetivos no código.
4. **Check-points:** pedir confirmação ANTES de:
   - instalar bibliotecas pesadas (npm/yarn);
   - criar estruturas complexas (pastas novas, tabelas, migrations);
   - alterar a arquitetura principal.
5. Um milestone por vez. Não adiantar fases.
6. Nunca expor chaves (.env fora do Git).

## Comandos
- `npm run dev` → rodar local (http://localhost:3000)
- `git add . && git commit -m "msg" && git push` → backup + deploy automático Vercel

## Milestones
- [x] M0 Setup (GitHub, Supabase, Vercel)
- [x] M1 Site institucional
- [x] M2 Login admin + cadastro clientes (balcão) + Configurações (perfil, horários, preços)
- [x] M3 Agendamentos (reserva, corujão, campeonato, aniversário)
- [x] M4 Caixa/consumo + Banco de Minutos
- [x] M5 Painel de máquinas (realtime)
- [x] M6 Agente Electron + hub no PC Servidor (substitui Gizmo)
- [ ] M7 Ranking + consulta de saldo/horas
- [ ] M8 SaaS multi-arena

## Status
Milestone atual: M7 Ranking + consulta de saldo/horas (M0–M6 concluídos; falta instalar o programa nos outros PCs e tirar o Gizmo). Dados da arena: painel → Configurações (banco); textos fixos em `src/lib/arena.ts`.
Repo: https://github.com/agemdev/arena-storm
Site: https://arena-storm.vercel.app (Vercel equipe `agemdev`) · Supabase: projeto `fwjwowvblkukqroyqoca` (sa-east-1)
Migrations: `supabase/migrations/` (aplicar via conector Supabase)
