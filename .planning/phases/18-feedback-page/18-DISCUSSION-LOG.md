# Phase 18: feedback-page - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-07-19
**Phase:** 18-feedback-page
**Areas discussed:** discussion scope, feedback categories, required fields, submit behavior, mobile access

---

## Discussion Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Tudo em ordem | Cobre formulario, acessos, banco/RLS e pos-envio antes de planejar. | x |
| So formulario | Foca em categorias, campos obrigatorios e estado de sucesso do envio. | |
| So integracao | Foca em sidebar, modal de perfil, persistencia no Supabase e permissoes. | |

**User's choice:** 1 - tudo em ordem.
**Notes:** User wanted the full discussion flow for Phase 18.

---

## Feedback Categories

| Option | Description | Selected |
|--------|-------------|----------|
| Produto simples | `Satisfacao`, `Bug`, `Sugestao`, `Dificuldade`, `Outro`. | x |
| Operacional por modulo | `Producao`, `Lotes`, `Saude`, `Racao`, `Financas`, `Geral`. | |

**User's choice:** Follow the agent recommendation.
**Notes:** Simple product categories better match a general feedback page and avoid confusing it with module-specific operational records.

---

## Required Fields

| Option | Description | Selected |
|--------|-------------|----------|
| Nota, categoria e descricao obrigatorias | Higher detail, more friction. | |
| Nota e categoria obrigatorias; descricao opcional | Lower friction while still capturing structured sentiment. | x |

**User's choice:** Follow the agent recommendation.
**Notes:** Authenticated `user_id` and `farm_id` are also required for persistence.

---

## Submit Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Confirmar e limpar formulario | Shows confirmation, clears inputs, and keeps user on `/dashboard/feedback`. | x |
| Redirecionar para dashboard | Ends the flow by navigating away after submission. | |

**User's choice:** Follow the agent recommendation.
**Notes:** Same-page confirmation keeps the flow lightweight and avoids surprising navigation.

---

## Mobile Access

| Option | Description | Selected |
|--------|-------------|----------|
| Sidebar desktop + perfil | Required access points only; no mobile bottom-nav change. | x |
| Tambem no menu mobile | Adds feedback to the mobile bottom navigation. | |

**User's choice:** Follow the agent recommendation.
**Notes:** Existing mobile nav is compact. The feedback route can still be reached through profile/modal access without crowding primary mobile navigation.

---

## the agent's Discretion

- Choose exact visual layout, labels, icon, and modal placement by reusing existing dashboard patterns.
- Choose the next migration filename by checking the migration directory during implementation.
- Add a small feedback service/helper only if it keeps the route component focused and follows existing Supabase service patterns.

## Deferred Ideas

- Admin feedback review dashboard.
- User-facing feedback submission history, edits, or deletes.
- Mobile bottom-nav feedback item.
- Feedback-driven evaluation alerts.
