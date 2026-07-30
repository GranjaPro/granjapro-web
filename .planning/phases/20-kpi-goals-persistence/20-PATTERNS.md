# Phase 20: Pattern Map

**Mapped:** 2026-07-30

## Main Dashboard

`app/dashboard/page.tsx` already defines the fixed goal values:

- eggs: `15000`;
- laying rate: `92`;
- cost per egg: `0.12`;
- profit fallback: current revenue when configured goal is zero.

Keep these values and all `progress`, `reached`, and `goal` calculations. Remove
only editing state/setters, editing-only fields, KPI `onClick`, and the goal
editor modal. From the KPI outer card class, remove only `cursor-pointer`;
retain `group`, hover shadow, hover border, transition, and the group-hover top
accent exactly as they are.

## Static KPI Cursor Pattern

For each audited static KPI outer container:

```tsx
// Before
className="... transition-all duration-300 cursor-pointer"

// After
className="... transition-all duration-300"
```

Do not remove or reorder any other class. Do not edit shared card primitives.

### Files

- `app/dashboard/production/page.tsx`
- `app/dashboard/mortality/page.tsx`
- `app/dashboard/health/page.tsx`
- `app/dashboard/customers/page.tsx`
- `app/dashboard/equipment/page.tsx`
- `app/dashboard/sales/page.tsx`
- `app/dashboard/racao/page.tsx`

In customers, nested `Cobrar agora` buttons keep `cursor-pointer`. In all files,
buttons, links, filters, selectors, sliders, tooltips, CRUD controls, and
navigation cards remain unchanged.

Pages with hover-only KPI styling and no `cursor-pointer` are out of scope and
must not be edited.

## Rollback Migration

Read `supabase/migrations/00030_kpi_goals_and_quality.sql` as the source of truth
and create `supabase/migrations/00031_revert_kpi_goals_and_quality.sql`:

```sql
drop table if exists public.kpi_goals cascade;

alter table public.egg_production
  drop column if exists deformed_eggs,
  drop column if exists internal_abnormality_eggs;
```

Do not modify or delete `00030`. Do not run Supabase CLI commands against a
linked project. The user owns deployment.

## Shared Constraints

- No global replacement of `cursor-pointer`.
- No removal of hover, shadow, border, elevation, transition, or `group` classes.
- No KPI text, value, goal, math, color, progress, responsive layout, or plan
  gating changes.
- Remove imports/variables that become unused after editing removal.
- Do not introduce `any`.
- Verify with focused diffs, `npx tsc --noEmit`, and `npm run build`.

## PATTERN MAPPING COMPLETE
