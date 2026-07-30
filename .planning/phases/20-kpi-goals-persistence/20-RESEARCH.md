# Phase 20: KPI Goals Removal and Static KPI Affordance - Research

## Scope

Phase 20 removes the existing KPI goal editing experiment instead of adding persistence. The final application must:

- keep all KPI values, fixed targets, progress bars, colors, labels, and layouts unchanged;
- remove KPI editing state, handlers, and the goal editor modal from the main dashboard;
- remove pointer, hover elevation, hover shadow, hover border, and comparable false interaction cues from every static KPI/indicator card;
- preserve affordances for cards and controls that genuinely navigate or execute actions;
- remove every database object introduced by `00030_kpi_goals_and_quality.sql` and reconcile the linked Supabase migration history.

The `20-CONTEXT.md` boundary supersedes the stale Phase 20 title and goal in the milestone roadmap.

## Existing State

### Main Dashboard Editing

`app/dashboard/page.tsx` contains the complete editing experiment:

- `kpiGoals` local state with fixed defaults for eggs, laying rate, cost per egg, and profit;
- `editingGoalKey` and `editingGoalValue`;
- KPI-card `onClick` handlers;
- a goal editor modal with save/cancel behavior;
- `goalRaw`, `inputUnit`, and `unitPos` fields used only by the editor.

The values are page-local and are not persisted to Supabase. Removing editing must retain the current fixed defaults and the existing KPI calculations.

### Database Migration

`supabase/migrations/00030_kpi_goals_and_quality.sql` is currently untracked by Git and creates:

- `public.kpi_goals`;
- select, insert, and update RLS policies;
- a `set_updated_at` trigger;
- `public.egg_production.deformed_eggs`;
- `public.egg_production.internal_abnormality_eggs`.

The user confirmed that the migration has already been applied to the database and approved permanent removal of all data exclusive to these objects.

The repository is linked to Supabase through `supabase/.temp/project-ref`, but the current session has no `SUPABASE_ACCESS_TOKEN`; `npx supabase migration list --linked` cannot inspect remote history until authentication is supplied. The installed CLI is 2.83.0.

## Supabase Reconciliation Strategy

Supabase tracks migration files and remote history separately. `supabase db push` compares local migration versions against `supabase_migrations.schema_migrations`. Official documentation also states that `migration repair` changes only the history table; it does not execute or reverse schema SQL.

Deleting local `00030` without first changing the remote schema would therefore leave both the unwanted objects and a local/remote migration-history mismatch.

### Recommended Safe Sequence

1. Authenticate and confirm the linked project reference before destructive work.
2. Run `npx supabase migration list --linked` and confirm that `00030` is recorded remotely.
3. Create a temporary next migration containing only idempotent, explicitly named teardown SQL:
   - `drop table if exists public.kpi_goals cascade`;
   - drop `deformed_eggs` from `public.egg_production` if it exists;
   - drop `internal_abnormality_eggs` from `public.egg_production` if it exists.
4. Review with `npx supabase db push --linked --dry-run`.
5. Apply the temporary teardown migration with `npx supabase db push --linked`.
6. Verify that the table and columns are absent before touching migration history.
7. Mark both the original create migration and the temporary teardown migration as reverted with `supabase migration repair ... --status reverted`.
8. Delete the local original and temporary migration files.
9. Run `npx supabase migration list --linked`; local and remote histories must align through `00029`.
10. Verify a fresh local reset from committed migrations produces the same schema.

This sequence uses a forward teardown to change the schema, then repairs history only after the schema is known to be correct. Do not use `db reset --linked`; it rebuilds the linked database and is broader than this phase.

### Required Database Assertions

Before completion:

- `to_regclass('public.kpi_goals')` returns `NULL`;
- `information_schema.columns` returns no `deformed_eggs` or `internal_abnormality_eggs` rows for `public.egg_production`;
- remote migration history has no `00030` or temporary teardown version;
- local `supabase/migrations` ends at `00029_feedbacks.sql`;
- `supabase/schema.sql` and `lib/database.types.ts` contain none of the removed identifiers.

## Static KPI Inventory

### Must Change

| File | Current false affordance |
|------|--------------------------|
| `app/dashboard/page.tsx` | Click-to-edit behavior, modal, `cursor-pointer`, hover shadow/border, and group-hover top accent |
| `app/dashboard/production/page.tsx` | KPI cards have pointer plus hover shadow/border |
| `app/dashboard/mortality/page.tsx` | KPI cards have pointer plus hover shadow/border |
| `app/dashboard/health/page.tsx` | KPI cards have pointer plus hover shadow/border |
| `app/dashboard/customers/page.tsx` | Main and profile KPI cards have pointer and/or hover shadow/border; nested real action buttons must remain interactive |
| `app/dashboard/equipment/page.tsx` | Five summary indicators have pointer and hover shadows/borders |
| `app/dashboard/sales/page.tsx` | Main KPIs and profitability sub-metrics have pointer and hover border/shadow |
| `app/dashboard/racao/page.tsx` | Four static status/KPI cards have pointer and hover shadow |
| `app/dashboard/finances/page.tsx` | Main KPI row and secondary static indicators have hover-only interaction cues |
| `app/dashboard/barns/page.tsx` | Four KPI cards have hover shadow/border |
| `app/dashboard/workers/page.tsx` | Four KPI cards have hover shadow/border |
| `app/dashboard/reports/page.tsx` | Report KPI cards have hover shadow/border |
| `app/dashboard/production/historico/[loteId]/page.tsx` | Historical production KPIs have hover shadow/border |
| `app/dashboard/agua/page.tsx` | Local `KpiCard` and `MetaKpiCard` have hover shadow; `group` must remain where needed for the real info tooltip |
| `app/dashboard/inventory/page.tsx` | Local `MetricCard` has hover shadow/border |

### Already Static or Intentionally Interactive

- `components/dashboard/kpi-card.tsx` is already a static reference with no pointer or hover affordance.
- Flock detail KPI blocks in water, feed, and mortality pages are already static and need no change.
- `app/dashboard/flocks/detalhes/[loteId]/page.tsx` summary cards are links; their affordances must remain.
- Buttons, filters, sliders, selectors, alert actions, CRUD controls, navigation cards, and info tooltips are genuine interactions and must remain unchanged.
- Generic global replacement of `cursor-pointer` or `hover:*` is unsafe because the same classes are used by legitimate controls throughout the app.

## Recommended Plan Shape

Three focused plans keep changes atomic:

1. **Main dashboard de-editing** - remove only editing behavior and false affordance from `app/dashboard/page.tsx`, preserving fixed defaults and calculations.
2. **App-wide static KPI affordance audit** - make targeted class removals across the identified static KPI sections while preserving real interactions.
3. **Supabase teardown and history reconciliation** - a manual/destructive database plan with explicit preflight, dry run, verification, and recovery checkpoints.

The three plans have no code dependency and can share Wave 1, but the database plan must be non-autonomous because it requires credentials and destructive remote approval.

## Threat Model

### T-20-01: Broader-than-intended schema deletion

- **Risk:** A broad reset, ambiguous `CASCADE`, or wrong linked project could delete unrelated data.
- **Mitigation:** Confirm project ref, use only explicitly named table/columns, review a dry run, and prohibit `db reset --linked`.

### T-20-02: Migration history repaired before schema teardown

- **Risk:** Remote history appears aligned while unwanted schema objects remain.
- **Mitigation:** Apply and verify teardown SQL before any `migration repair`; verify both schema and history afterward.

### T-20-03: Legitimate interactions lose affordance

- **Risk:** Global class replacement disables cues on links, buttons, filters, and action cards.
- **Mitigation:** Edit only structurally identified KPI/indicator containers and explicitly preserve nested/actionable controls.

### T-20-04: Fixed KPI semantics change during cleanup

- **Risk:** Removing editing-only fields accidentally changes goals, progress math, labels, or visual status.
- **Mitigation:** Preserve default goal constants and calculation inputs; use source assertions and browser comparison for content/layout.

## Validation Architecture

### Automated

- `npx tsc --noEmit` after each UI plan task group.
- `npm run build` after each completed plan and before phase verification.
- Focused `rg` assertions for removed editing identifiers and deleted schema identifiers.
- Focused source review ensuring legitimate `onClick`, `href`, button, filter, tooltip, and slider interactions remain.
- `npx supabase migration list --linked` after database reconciliation.

### Manual

- Browser-check the main dashboard and representative KPI-heavy pages at desktop and mobile widths.
- Confirm static KPI cards retain exact content/layout but show the default cursor and no hover elevation, shadow, border, or accent animation.
- Confirm real links, buttons, customer collection actions, filters, sliders, and the water KPI info tooltip remain usable.
- Run SQL assertions against the linked Supabase project for table/column absence.

## Sources

- Supabase Database Migrations: https://supabase.com/docs/guides/deployment/database-migrations
- Supabase CLI Reference (`db push`, `migration list`, `migration repair`): https://supabase.com/docs/reference/cli/supabase-projects-create
- Supabase Local Development Workflow: https://supabase.com/docs/guides/local-development/cli-workflows

## RESEARCH COMPLETE
