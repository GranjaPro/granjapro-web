# Phase 9: UI Permission Integration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-05-17
**Phase:** 9-UI Permission Integration
**Areas discussed:** Modelo de capacidade por superficie, Protecao contra render/query prematura, Upgrade messaging unificado, Escopo pragmatico da refatoracao

---

## Modelo de capacidade por superficie

| Option | Description | Selected |
|--------|-------------|----------|
| Capacidades especificas por recurso visual | Create precise keys for visible UI surfaces, such as production financial summary or premium customer ranking. | yes |
| Capacidades agrupadas por nivel de produto | Keep a smaller set of broad capabilities such as advanced insights or premium assistant. | |
| Hibrido | Create specific keys only for surfaces touched in Phase 9. | |

**User's choice:** Capacidades especificas por recurso visual.
**Notes:** The user wants Phase 9 to remove ambiguity by modeling the actual locked UI surfaces.

| Option | Description | Selected |
|--------|-------------|----------|
| Expandir `CAPABILITIES` | Put all surface metadata directly in `lib/plans.ts`. | |
| Criar `UI_PERMISSION_SURFACES` | Separate UI locks from product capabilities. | |
| `CAPABILITIES` com subcampos de UI | Keep one source of truth with richer route/card/badge/message metadata. | yes |

**User's choice:** `CAPABILITIES` with UI subfields.
**Notes:** `lib/plans.ts` remains central.

| Option | Description | Selected |
|--------|-------------|----------|
| `capability="..."` | Component resolves required plan and messaging from central metadata. | yes |
| `targetPlan` plus local message | Keep current props but validate internally. | |
| Both required | Require both traceability and local override props. | |

**User's choice:** `capability="..."`.
**Notes:** Touched locked components should stop carrying local plan/message drift.

---

## Protecao contra render/query prematura

| Option | Description | Selected |
|--------|-------------|----------|
| Nao renderizar conteudo protegido | Blocked users get a placeholder/upgrade UI and the real content is not mounted. | yes |
| Renderizar dados basicos | Keep some data visible and only hide advanced portions. | |
| So trocar overlays por helpers | Improve consistency but defer data exposure concerns. | |

**User's choice:** Nao renderizar conteudo protegido.
**Notes:** Strong alignment with SEC-02 for touched surfaces.

| Option | Description | Selected |
|--------|-------------|----------|
| Wrapper generico | Create `PermissionGate capability="..."`. | |
| Hook + branching por pagina | Pages call `useCapability(...)` directly. | |
| Ambos | Use `useCapability(...)` as primitive and `PermissionGate` as the default UI wrapper. | yes |

**User's choice:** Both.
**Notes:** Use the hook when page code must prevent a protected query before render.

| Option | Description | Selected |
|--------|-------------|----------|
| Nao buscar dados protegidos sem permissao | Condition protected fetch/service calls on capability access. | yes |
| Buscar dados compartilhados e filtrar visualmente | Keep current data loads but hide protected UI. | |
| Caso a caso | Only gate easy queries. | |

**User's choice:** Nao buscar dados protegidos sem permissao.
**Notes:** The strong rule applies to surfaces touched in this phase.

---

## Upgrade messaging unificado

| Option | Description | Selected |
|--------|-------------|----------|
| Popup derivado de `PLAN_MATRIX` + `CAPABILITIES` | Price, plan name, benefits, and blocked reason come from central metadata. | yes |
| Popup derived from `PLAN_MATRIX`, local reason | Centralize price/benefits but keep component messages. | |
| Navigate directly to plan selection | Remove popup as an intermediate UI. | |

**User's choice:** Popup fully derived from central metadata.
**Notes:** Addresses PERM-03 and PERM-05.

| Option | Description | Selected |
|--------|-------------|----------|
| Manter ativacao direta no popup | Keep current profile update behavior. | |
| Levar para `/dashboard/select-plan` | Use the existing plan-selection flow with blocked context. | yes |
| Dois botoes | Offer both view plans and activate now. | |

**User's choice:** Route to `/dashboard/select-plan`.
**Notes:** The user initially sent a stray `w`; after clarification, selected option 2.

| Option | Description | Selected |
|--------|-------------|----------|
| Pre-destacar o plano recomendado | Keep full comparison while highlighting the unlocking plan. | yes |
| Filtrar planos elegiveis | Hide lower plans when a blocked capability requires Pro/Premium. | |
| Navegar sem contexto visual | Simple routing only. | |

**User's choice:** Pre-highlight the recommended plan.
**Notes:** Preserve comparison and explain why the user arrived there.

---

## Escopo pragmatico da refatoracao

| Option | Description | Selected |
|--------|-------------|----------|
| Top surfaces de maior risco/visibilidade | Shared components plus the most visible dashboard pages. | yes |
| Todas as ocorrencias diretas | Remove every `plan ===` and `plan !==` occurrence in the dashboard. | |
| Shared components + 2 paginas piloto | Smaller pilot. | |

**User's choice:** Top visible/risky surfaces.
**Notes:** Avoid an unbounded dashboard-wide refactor.

| Option | Description | Selected |
|--------|-------------|----------|
| Foundation, paginas principais, cleanup/verificacao | Three waves: shared foundation, integration, cleanup. | yes |
| Planos por dominio | Split by production/commercial/dashboard domains. | |
| Plano unico | One broad plan. | |

**User's choice:** Three-wave plan.
**Notes:** Foundation should precede page integration.

| Option | Description | Selected |
|--------|-------------|----------|
| Dashboard + producao + racao + financas + vendas/clientes | Proposed default scope. | |
| Dashboard + producao + racao + saude/mortalidade | Operational scope. | |
| Dashboard + financeiro/comercial/nav | Commercial scope. | |
| Custom scope | Dashboard, producao, racao, saude, mortalidade, financas, clientes, vendas. | yes |

**User's choice:** Dashboard, producao, racao, saude, mortalidade, financas, clientes, vendas.
**Notes:** This becomes the selected 09-02 integration scope.

---

## the agent's Discretion

- Exact capability key names may be chosen during planning.
- The planner may decide which protected-only queries are practical to gate, provided touched surfaces follow the strong access-before-query rule where feasible.

## Deferred Ideas

- Full dashboard-wide removal of every direct plan comparison.
- Server/API enforcement beyond UI-side query prevention, which remains mainly Phase 10 scope.
