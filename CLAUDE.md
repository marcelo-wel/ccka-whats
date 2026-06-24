# CLAUDE.md — WhatsApp Intelligence Platform

Este arquivo é o briefing principal para o Claude Code.
Leia completamente antes de qualquer implementação.

---

## O que é este projeto

Uma plataforma de **governança e inteligência de comunicação corporativa via WhatsApp**.

Captura mensagens de números corporativos, armazena com estrutura multi-tenant,
e evolui para busca semântica, alertas e integrações com ferramentas de negócio.

**Não é:** chatbot, automação de marketing, ou ferramenta de atendimento.
**É:** infraestrutura de dados de comunicação — visibilidade, histórico, inteligência.

---

## Fases do produto

```
FASE 1 (concluída)  → 1 número pessoal, lab, captura + busca simples
FASE 2 (agora)      → N números corporativos, governança, backup histórico
FASE 3 (futuro)     → SaaS multi-tenant, integrações, agentes com contexto
```

A arquitetura já é a da Fase 3 — apenas com 1 tenant ativo.
**Nunca tome decisões que exijam refatoramento entre fases.**

---

## Stack

| Camada | Tecnologia |
|--------|------------|
| WhatsApp | Evolution API (VPS Hostinger) |
| Ingestão | Supabase Edge Functions (Deno) |
| Banco | Supabase PostgreSQL + pgvector |
| Storage | Supabase Storage |
| Auth | Supabase Auth + RLS multi-tenant |
| Realtime | Supabase Realtime |
| Frontend | **Next.js 16.2.9** (App Router) + Tailwind |
| Deploy web | Vercel |
| Deploy VPS | Docker Compose (Hostinger) |

### Atenção: Next.js 16

Next.js 16 tem breaking changes. Leia `apps/web/AGENTS.md` antes de tocar no frontend.
- **`proxy.ts`** no lugar de `middleware.ts` — ambos não podem coexistir
- `proxy.ts` exporta `proxy()`, não `middleware()`
- `params` em Route Handlers é `Promise<{...}>` — sempre `await params`

---

## Estrutura do monorepo

```
wa-intelligence/
├── CLAUDE.md                     ← este arquivo
├── package.json                  ← workspace root
├── turbo.json                    ← Turborepo
│
├── apps/
│   └── web/                      ← Next.js 16 (dashboard)
│       ├── proxy.ts              ← middleware de auth (Next.js 16)
│       ├── app/
│       │   ├── login/
│       │   ├── register/
│       │   ├── forgot-password/
│       │   ├── reset-password/
│       │   ├── dashboard/
│       │   │   ├── admin/sessions/
│       │   │   ├── admin/operators/
│       │   │   ├── admin/alerts/
│       │   │   ├── admin/integrations/
│       │   │   ├── admin/history/
│       │   │   ├── analytics/
│       │   │   ├── settings/
│       │   │   └── chat/[id]/
│       │   └── api/
│       │       ├── sessions/         ← CRUD de sessões
│       │       │   ├── create/
│       │       │   ├── connect/
│       │       │   ├── disconnect/
│       │       │   └── [id]/         ← DELETE, status, qr, rotate-secret
│       │       ├── alerts/
│       │       ├── chats/
│       │       ├── messages/
│       │       ├── search/
│       │       ├── analytics/
│       │       ├── operators/
│       │       ├── history-sync/
│       │       ├── integrations/
│       │       └── register/
│       └── components/
│           ├── chat-list.tsx         ← filtro Todos/Grupos/Contatos
│           ├── chat-view.tsx
│           ├── session-card.tsx      ← QR, status, delete com confirmação
│           ├── sidebar.tsx           ← dot de status das sessões
│           └── ...
│
├── packages/
│   └── types/                    ← tipos compartilhados
│
├── supabase/
│   ├── migrations/               ← SQL versionado (0001–0008)
│   └── functions/
│       ├── whatsapp-webhook/     ← recebe eventos do Evolution (JWT off)
│       ├── media-downloader/     ← baixa mídias antes de expirar (JWT off)
│       ├── history-sync/         ← sincroniza histórico via Evolution API
│       ├── generate-embeddings/  ← embeddings OpenAI para busca semântica
│       ├── session-health-check/ ← monitora sessões periodicamente (JWT off)
│       └── webhook-delivery/     ← entrega webhooks para integrações
│
└── infra/
    └── evolution/                ← docker-compose + .env.example do VPS
```

---

## Regras inegociáveis de arquitetura

1. **`tenant_id` em toda tabela** — sem exceção. RLS filtra por tenant em tudo.
2. **`raw_payload jsonb`** em `messages` — nunca descartar o payload original do Evolution.
3. **Mídia não é opcional** — a Edge Function `media-downloader` deve ser acionada
   imediatamente após salvar a mensagem. Links do WhatsApp expiram em minutos.
4. **Idempotência** — todo insert usa `upsert` com conflict na chave natural.
5. **Nunca expor `SUPABASE_SERVICE_ROLE_KEY` no cliente** — apenas em Route Handlers
   server-side ou Edge Functions. Use `createAdminClient()` para ops privilegiadas.
6. **`events_log` em toda operação crítica** — webhook recebido, mídia baixada,
   erro de sessão. Sem isso, debug em produção é impossível.
7. **Schema preparado para fase 3** — coluna `embedding vector(1536)` já existe,
   tabela `integrations` já existe. Não remover "porque não usa ainda".
8. **Nomes de grupos nunca sobrescritos por `pushName`** — `pushName` em mensagens
   de grupo é o remetente, não o grupo. Usar padrão dois passos: upsert com
   `ignoreDuplicates: true` + update sem tocar no `name` do grupo.
9. **Edge Functions `whatsapp-webhook`, `media-downloader`, `session-health-check`
   devem ter `verify_jwt: false`** — são chamadas pelo Evolution API / cron, sem JWT.

---

## Convenções de código

- TypeScript estrito (`strict: true`) em todo o projeto
- Variáveis de ambiente tipadas via `@t3-oss/env-nextjs` em `apps/web/lib/env.ts`
- Nomes de tabelas: `snake_case` plural (ex: `wa_sessions`, `media_files`)
- Nomes de Edge Functions: `kebab-case` (ex: `whatsapp-webhook`)
- Imports absolutos com `@/` no web app
- Sem `any` — use `unknown` e narrowing explícito
- Route Handlers: sempre `await params` (Next.js 16 — `params` é Promise)

---

## Variáveis de ambiente

### apps/web (.env.local / Vercel)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # só server-side (Route Handlers)
EVOLUTION_API_URL=                # URL do VPS com Evolution API
EVOLUTION_API_KEY=                # API key global do Evolution
OPENAI_API_KEY=                   # para embeddings e Whisper
```

### supabase/functions (secrets do projeto)
```
SUPABASE_URL=                     # injetado automaticamente
SUPABASE_SERVICE_ROLE_KEY=        # injetado automaticamente
EVOLUTION_API_URL=                # URL do VPS
EVOLUTION_API_KEY=                # API key global do Evolution
OPENAI_API_KEY=                   # para Whisper e embeddings
```

### infra/evolution (.env)
```
EVOLUTION_API_KEY=
WEBHOOK_URL=                      # URL da Edge Function whatsapp-webhook
REDIS_URL=
```

---

## Estado atual do produto (Jun 2026)

### Implementado e em produção
- Auth completo: login, registro, esqueci senha, reset de senha
- Multi-sessão: criar, conectar (QR code), desconectar, excluir sessões WhatsApp
- Captura de mensagens em tempo real via webhook Evolution → Supabase
- Download automático de mídia (imagem, áudio, vídeo, documento)
- Sincronização de histórico via `history-sync` Edge Function
- Chat list com filtro Todos / Grupos / Contatos
- Busca full-text de mensagens
- Sistema de alertas por palavra-chave
- Analytics básico
- Gestão de operadores (admin / operator)
- Integrações (webhook delivery)
- Realtime: atualizações de status de sessão e novas mensagens via Supabase Realtime

### Pendente / próximos passos
- Notificações em tempo real de alertas disparados (badge + toast no dashboard)
- Envio de mensagens pelo dashboard (texto, mídia, quote)
- Transcrição de áudio via Whisper (requer `OPENAI_API_KEY` no Vercel)
- Busca semântica com embeddings (requer `OPENAI_API_KEY` no Vercel)
- Página de histórico de `alert_events` no dashboard
