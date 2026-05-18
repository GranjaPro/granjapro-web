# Phase 9: UI Permission Integration - Context

**Gathered:** 2026-05-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 9 replaces scattered component-level plan checks in the main dashboard UI with shared permission helpers, capability-driven locked surfaces, and consistent upgrade messaging. It uses the Phase 8 plan matrix as the source of truth and focuses on visible, high-risk dashboard surfaces rather than trying to refactor every plan check in the app.

</domain>

<decisions>
## Implementation Decisions

### Capability Model
- **D-01:** Model permissions as specific visual-surface capabilities, not only generic Pro/Premium checks.
- **D-02:** Keep `lib/plans.ts` as the single source of truth, but enrich `CAPABILITIES` with UI surface metadata such as route, card/block, badge label, required plan, and upgrade messaging.
- **D-03:** Locked UI components should receive `capability="..."` and resolve minimum plan, label, and upgrade copy from `CAPABILITIES`; avoid continuing the current `targetPlan` plus local `message` pattern for new/touched surfaces.

### Protected Rendering and Data Loading
- **D-04:** Protected surfaces should not mount or render their real content when the active plan lacks permission.
- **D-05:** Add `useCapability(...)` as the primitive for checking access and `PermissionGate` as the default visual wrapper for blocked UI surfaces.
- **D-06:** For touched surfaces whose data exists only for a protected UI block, condition fetch/service calls on capability access so protected data is not queried before the plan check.

### Upgrade Messaging
- **D-07:** `UpgradePopup` should be derived from `PLAN_MATRIX` and `CAPABILITIES`, not hardcoded per popup/component.
- **D-08:** `UpgradePopup` should stop directly updating `profiles.plan`; it should route users to `/dashboard/select-plan` instead.
- **D-09:** When users reach `/dashboard/select-plan` from a blocked capability, the page should highlight the recommended plan and explain the capability that led them there while still showing the normal plan comparison.

### Refactor Scope
- **D-10:** Phase 9 should cover shared plan UI primitives plus these main pages: dashboard home, production, feed/racao, health, mortality, finances, customers, and sales.
- **D-11:** Do not attempt to remove every `plan ===` or `plan !==` occurrence across the entire dashboard in this phase. Secondary pages can remain for later unless touched by the selected scope.
- **D-12:** Replan as three executable waves: shared foundation, main-page integration, then cleanup/verification.

### the agent's Discretion
- The planner may choose exact capability key names, as long as they are specific to visible UI surfaces and remain readable.
- The planner may decide which protected queries are practical to gate in Phase 9, but every touched protected-only surface should prefer the strong rule: check permission before querying or rendering protected content.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning Scope
- `.planning/ROADMAP.md` - Defines Phase 9 goal, requirements, and success criteria.
- `.planning/REQUIREMENTS.md` - Defines PERM-02, PERM-03, PERM-05, and SEC-02.
- `.planning/STATE.md` - Confirms Phase 8 is complete and Phase 9 is next.

### Phase 8 Foundation
- `.planning/phases/08-plan-persistence-permission-matrix/08-CONTEXT.md` - Captures prior decisions for the plan matrix and upgrade-copy alignment.
- `.planning/phases/08-plan-persistence-permission-matrix/08-VERIFICATION.md` - Confirms the central plan matrix, trial routing, and plan selection foundations are ready.
- `.planning/phases/08-plan-persistence-permission-matrix/08-03-SUMMARY.md` - Details current plan selection, trial routing, sidebar badges, and route guard foundation.

### Codebase Maps
- `.planning/codebase/ARCHITECTURE.md` - Describes dashboard layout, providers, services, and API boundaries.
- `.planning/codebase/CONCERNS.md` - Documents client-only gating, protected data rendering risk, and AI/API trust concerns.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/plans.ts`: Owns `PLAN_MATRIX`, `CAPABILITIES`, `hasMinimumPlan`, `canAccessCapability`, `getRequiredPlan`, plan parsing, trial helpers, and AI credit metadata. This is the right place to enrich capability metadata.
- `components/plan/plan-provider.tsx`: Exposes active `plan`, `hasValidPlan`, and `hideAdvancedFeatures`; use it as the source for `useCapability(...)`.
- `components/plan/locked-overlay.tsx`: Current blocked-surface wrapper. Refactor or replace with `PermissionGate` so blocked content is not mounted/rendered.
- `components/plan/upgrade-popup.tsx`: Current hardcoded upgrade prompt. Refactor to read central metadata and navigate to plan selection.
- `components/plan/plan-badge.tsx`: Existing active/required plan badges. Align with capability metadata for touched surfaces.
- `app/dashboard/select-plan/page.tsx`: Existing plan selection destination. Extend it to accept blocked capability context and highlight the recommended plan.

### Established Patterns
- Dashboard UI is client-heavy and uses context providers (`AuthProvider`, `PlanProvider`, `DateFilterProvider`) plus local page state.
- Existing pages use a mix of `hasMinimumPlan(...)`, direct `plan === "essencial"`, direct `plan !== "premium"`, `LockedOverlay`, `RequiredPlanBadge`, and route/nav metadata.
- Phase 8 already centralized commercial plan names, prices, benefits, limits, and AI credit weights in `PLAN_MATRIX`; Phase 9 should consume that rather than duplicating copy.

### Integration Points
- Shared foundation: `lib/plans.ts`, `components/plan/*`, and any new `useCapability` / `PermissionGate` files.
- Main-page integration: `app/dashboard/page.tsx`, `app/dashboard/production/page.tsx`, `app/dashboard/racao/page.tsx`, `app/dashboard/health/page.tsx`, `app/dashboard/mortality/page.tsx`, `app/dashboard/finances/page.tsx`, `app/dashboard/customers/page.tsx`, and `app/dashboard/sales/page.tsx`.
- Navigation and plan selection: `app/dashboard/layout.tsx` and `app/dashboard/select-plan/page.tsx`.

</code_context>

<specifics>
## Specific Ideas

- Use capability-specific props such as `capability="production_financial_summary"` instead of `targetPlan="pro"` plus a local message.
- The selected scope intentionally includes dashboard, production, racao, health, mortality, finances, customers, and sales because these contain many visible locked cards and plan checks.
- `/dashboard/select-plan` should remain a full comparison page, but highlight the plan that unlocks the blocked capability.

</specifics>

<deferred>
## Deferred Ideas

- Full removal of every direct plan comparison across every dashboard route is deferred unless it falls within the selected main-page scope.
- Server/API enforcement remains primarily Phase 10 scope, except for Phase 9's practical UI-side prevention of protected data queries in touched surfaces.

</deferred>

---

*Phase: 9-UI Permission Integration*
*Context gathered: 2026-05-17*
