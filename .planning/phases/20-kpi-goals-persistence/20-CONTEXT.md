# Phase 20: kpi-goals-persistence - Context

**Gathered:** 2026-07-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 20 no longer delivers editable or database-persisted KPI goals. It removes the existing KPI goal editing experiment, reverses every database change introduced by migration `00030_kpi_goals_and_quality.sql`, and removes misleading interaction affordances from KPI/indicator cards throughout the app.

KPI values, fixed goals, ideal ranges, progress bars, colors, labels, and other informational content must remain exactly as they are. Cards that genuinely navigate or execute actions remain interactive and are outside this cleanup.

This boundary supersedes the former Phase 20 goal in `.planning/milestones/v1.3-ROADMAP.md`.

</domain>

<decisions>
## Implementation Decisions

### Migration 00030 Reversal
- **D-01:** Remove everything introduced by `00030_kpi_goals_and_quality.sql`; no part of that migration is retained.
- **D-02:** Remove the `kpi_goals` table together with its RLS policies, `set_updated_at` trigger, and any stored KPI goal data.
- **D-03:** Remove the `egg_production.deformed_eggs` and `egg_production.internal_abnormality_eggs` columns introduced by the same migration.
- **D-04:** Remove the local migration `supabase/migrations/00030_kpi_goals_and_quality.sql` and reconcile the database where it has already been applied. Deleting the local file alone does not satisfy the phase.
- **D-05:** Data stored exclusively in the removed table or columns does not need to be preserved or exported.

### Static KPI Cards
- **D-06:** No KPI card is editable. Remove the dashboard KPI goal modal, editing state, click handlers, and related editing-only logic.
- **D-07:** Remove every visual affordance that makes a static KPI appear interactive, including `cursor-pointer`, hover elevation, hover shadow, hover border changes, and comparable click cues.
- **D-08:** Apply the affordance cleanup to KPI/indicator blocks throughout the app, not only the main dashboard.
- **D-09:** Preserve all existing KPI content and presentation: values, fixed goals, ideal ranges, progress bars, colors, labels, layout, and informational status.
- **D-10:** Preserve interaction and affordances on cards that genuinely navigate, open an action, or execute a command. The cleanup targets static KPI/indicator cards only.

### the agent's Discretion
- Choose the safest forward migration or database reconciliation procedure needed to remove objects that already exist remotely while reaching the exact schema defined above.
- Determine the complete KPI-card inventory through codebase audit; the pages identified below are starting points, not an exhaustive allowlist.
- Remove editing-only imports, state, helpers, and dead code while preserving unrelated dashboard behavior.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Scope
- `.planning/PROJECT.md` - Defines the mobile-first product constraints and contains stale references to customizable KPI persistence that this context supersedes for Phase 20.
- `.planning/STATE.md` - Records the previous `kpi_goals` architecture assumption; that assumption is superseded by this context.
- `.planning/milestones/v1.3-ROADMAP.md` - Contains the former Phase 20 goal. Use it only as historical context; the phase boundary and decisions in this file are authoritative.

### Database Reversal
- `supabase/migrations/00030_kpi_goals_and_quality.sql` - Exact database objects that must be removed: `kpi_goals`, its policies and trigger, plus two `egg_production` columns.
- `supabase/schema.sql` - Canonical consolidated schema that must not retain the removed table or columns.
- `lib/database.types.ts` - Database typings that must not expose removed KPI goal or egg-quality fields.

### KPI Interaction Audit
- `app/dashboard/page.tsx` - Existing KPI click handler, editing state, and goal modal to remove while preserving static KPI presentation.
- `components/dashboard/kpi-card.tsx` - Existing reusable static KPI card pattern without editing behavior.
- `app/dashboard/production/page.tsx` - KPI block with static-card pointer and hover affordances.
- `app/dashboard/mortality/page.tsx` - KPI block with static-card pointer and hover affordances.
- `app/dashboard/health/page.tsx` - KPI block with static-card pointer and hover affordances.
- `app/dashboard/customers/page.tsx` - Multiple KPI/indicator cards requiring affordance review.
- `app/dashboard/equipment/page.tsx` - KPI cards requiring affordance review.
- `app/dashboard/sales/page.tsx` - KPI cards requiring affordance review while preserving real controls elsewhere on the page.
- `app/dashboard/flocks/detalhes/[loteId]/page.tsx` - Flock detail KPI cards requiring affordance review.

### Codebase Guidance
- `.planning/codebase/ARCHITECTURE.md` - Existing Next.js presentation and Supabase service boundaries.
- `.planning/codebase/CONVENTIONS.md` - Strict TypeScript, focused edits, and local styling conventions.
- `.planning/codebase/STACK.md` - Current React, Next.js, Tailwind, and Supabase stack.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/dashboard/kpi-card.tsx`: Provides the desired static KPI behavior and is a reference for cards without click affordance.
- `components/ui/card.tsx`: Shared visual primitive; global changes must be avoided because actionable and non-KPI cards also use it.
- `cn()` from `lib/utils.ts`: Existing class-composition pattern for making focused class removals without introducing new abstractions.

### Established Patterns
- KPI blocks are commonly identified by `KPI Cards`, `KPIs`, or `Indicadores` section markers and repeated card maps inside dashboard pages.
- Many static KPI cards currently combine `cursor-pointer` with hover shadow, border, or translation even when they have no action.
- The main dashboard is different from the other pages because its KPI cards currently have real edit handlers and a goal modal; both behavior and affordance must be removed there.
- Interactive controls and actionable cards use the same Tailwind affordance classes, so cleanup must be scoped structurally to KPI/indicator cards rather than performed as a global string replacement.

### Integration Points
- Database: remove every object introduced by `supabase/migrations/00030_kpi_goals_and_quality.sql` from the applied Supabase schema and local migration history/files as safely required.
- Main dashboard: remove `editingGoalKey`, `editingGoalValue`, KPI `onClick`, the goal modal, and editing-only helpers/imports from `app/dashboard/page.tsx`.
- App-wide UI: audit KPI/indicator sections across `app/dashboard/**/page.tsx`, removing only interaction-like classes from static cards.
- Verification: confirm static KPI content is unchanged and cards with legitimate actions still expose their normal interaction cues.

</code_context>

<specifics>
## Specific Ideas

The approved visual rule is precise: indicators continue exactly as they are, with only affordance removed. This is not a KPI redesign and must not change values, targets, progress calculations, colors, text, spacing, or layout.

</specifics>

<deferred>
## Deferred Ideas

None - editable or persisted KPI goals are intentionally removed, not deferred within this phase.

</deferred>

---

*Phase: 20-kpi-goals-persistence*
*Context gathered: 2026-07-30*
