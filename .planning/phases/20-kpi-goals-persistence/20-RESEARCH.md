# Phase 20: KPI Goal Editing Removal and Cursor Cleanup - Research

## Scope

Phase 20 removes the existing KPI goal editing experiment, removes only
`cursor-pointer` from static KPI/indicator cards, and adds one forward migration
that reverses the schema introduced by `00030_kpi_goals_and_quality.sql`.

All other KPI presentation remains byte-for-byte unchanged where practical:
hover shadows, hover borders, elevation, transitions, values, goals, progress
bars, colors, labels, and layout stay as they are. Real actions keep their
interaction and cursor.

## Existing State

### Main dashboard

`app/dashboard/page.tsx` contains page-local goal editing:

- mutable `kpiGoals` state with defaults for eggs, laying rate, cost per egg,
  and profit;
- editing state and KPI-card click handlers;
- a goal editor modal;
- `goalRaw`, `inputUnit`, and `unitPos`, used only by the editor.

The values are not persisted. Removing editing must preserve the current fixed
defaults and all calculations.

### Database

`supabase/migrations/00030_kpi_goals_and_quality.sql` creates:

- `public.kpi_goals`, including RLS policies and an update trigger;
- `public.egg_production.deformed_eggs`;
- `public.egg_production.internal_abnormality_eggs`.

The migration already exists in the user's database. The repository's
`supabase/schema.sql` and `lib/database.types.ts` already contain none of these
identifiers.

Supabase migration history and schema state are separate. Official documentation
states that `migration repair` changes migration history; it does not execute
rollback SQL. Therefore this phase must retain `00030` and add a normal forward
rollback migration. No linked-project command is needed or authorized.

## Rollback Migration

Create `supabase/migrations/00031_revert_kpi_goals_and_quality.sql`:

```sql
drop table if exists public.kpi_goals cascade;

alter table public.egg_production
  drop column if exists deformed_eggs,
  drop column if exists internal_abnormality_eggs;
```

Dropping the table removes its policies, trigger, and stored rows with it. The
SQL is intentionally limited to the three approved schema objects. The executor
must not run `db push`, `migration repair`, or any remote command; the user will
upload/apply the migration.

## Static KPI Inventory

Only these files contain `cursor-pointer` on identified static KPI/indicator
containers:

| File | Target |
|------|--------|
| `app/dashboard/page.tsx` | Four editable KPI cards |
| `app/dashboard/production/page.tsx` | KPI grid |
| `app/dashboard/mortality/page.tsx` | KPI grid |
| `app/dashboard/health/page.tsx` | KPI grid |
| `app/dashboard/customers/page.tsx` | Main and profile KPI cards; nested collection buttons remain interactive |
| `app/dashboard/equipment/page.tsx` | Five summary indicators |
| `app/dashboard/sales/page.tsx` | Four main KPIs and three profitability sub-metrics |
| `app/dashboard/racao/page.tsx` | Four static status/KPI cards |

Pages whose static KPI cards have hover effects but no `cursor-pointer` are
already compliant with the revised boundary and must remain untouched:
finances, inventory, water, barns, workers, reports, and production history.

Linked flock summary cards and every button, link, filter, selector, slider,
tooltip, CRUD control, and navigation card are genuine interactions and keep
their existing classes.

## Recommended Plan Shape

1. Remove main-dashboard editing and its KPI `cursor-pointer`, preserving every
   other class and visual behavior.
2. Remove only `cursor-pointer` from the seven remaining identified static KPI
   surfaces.
3. Add the local `00031` rollback migration without modifying `00030` or
   contacting Supabase.

All three plans are independent and can run in Wave 1.

## Threat Model

### T-20-01: Broader-than-approved schema deletion

- **Risk:** Rollback SQL names or changes unrelated objects.
- **Mitigation:** Permit only the table and two columns introduced by `00030`;
  verify the new migration text locally.

### T-20-02: Unauthorized remote mutation

- **Risk:** Execution applies or repairs the linked database.
- **Mitigation:** Prohibit `db push`, `migration repair`, and all remote
  Supabase commands; deliver the migration file for the user to upload.

### T-20-03: Real controls lose their cursor

- **Risk:** A broad replacement removes `cursor-pointer` from buttons, links,
  sliders, or actionable cards.
- **Mitigation:** Edit only the inventoried static KPI outer containers and
  retain nested/neighboring controls.

### T-20-04: KPI presentation changes

- **Risk:** Class cleanup removes hover or transition behavior beyond the
  approved cursor change.
- **Mitigation:** Remove exactly one class token from each static container and
  use focused diffs/source assertions.

## Validation

- `npx tsc --noEmit` after UI task groups.
- `npm run build` after the UI plans.
- Focused diffs proving only `cursor-pointer` was removed from static containers.
- Source assertions proving dashboard editing identifiers are gone and genuine
  controls retain their cursors.
- Local inspection of `00031`; no remote database command.

## Sources

- Supabase Database Migrations: https://supabase.com/docs/guides/deployment/database-migrations
- Supabase CLI Reference: https://supabase.com/docs/reference/cli/supabase-projects-create
- Supabase Local Development Workflow: https://supabase.com/docs/guides/local-development/cli-workflows

## RESEARCH COMPLETE
