# Phase 14: Flock Water Details Page - Context

**Gathered:** 2026-06-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Connect the flock water page `/agua` (`app/dashboard/flocks/detalhes/[loteId]/agua/page.tsx`) to display actual Supabase database consumption metrics for the specific flock, compared against developmental target guidelines (55ml to 245ml/bird/day).

</domain>

<decisions>
## Implementation Decisions

### Fallback when no database records exist
- **D-01:** Full empty state. If a flock does not have any logged water consumption records in the database, the page will render a clean empty state card ("Nenhum registro de consumo de água encontrado para este lote") with a direct action button to log water consumption (linking to the main Water page at `/dashboard/agua`). No empty charts or mock target curves will be shown.

### Target calculation type
- **D-02:** Dynamic historical targets. Calculate the flock's age in weeks for each date in the chart based on its `arrival_date` and `arrival_age_weeks`. Compare that day's actual consumption to the target for the flock's calculated age on that specific historical date.
- **D-03:** Target guidelines per stage:
  - Cria (0-5 weeks): 55 ml/bird/day
  - Recria (6-16 weeks): 120 ml/bird/day
  - Pré-postura (17-18 weeks): 175 ml/bird/day
  - Produção (19-28 weeks): 220 ml/bird/day
  - Pico (29-40 weeks): 245 ml/bird/day
  - Estável (41-60 weeks): 225 ml/bird/day
  - Declínio (61-80 weeks): 205 ml/bird/day
  - Descarte (81+ weeks): 170 ml/bird/day

### Date range filtering
- **D-04:** Local history range switcher. Retain the local range selector on the page (7d, 30d, months, total) to allow independent analysis of this specific flock's lifecycle, rather than integrating with the global calendar date filter context.

### Plan Gating
- **D-05:** Gating on Flock Details. The water details page `/dashboard/flocks/detalhes/[loteId]/agua` must also check the user's plan. If their plan is "essencial", show the `LockedOverlay` or redirect to plan selection page, matching the navigation restrictions established in Phase 13.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone & Goals
- `.planning/ROADMAP.md` — Project milestones index.
- `.planning/milestones/v1.3-ROADMAP.md` — Milestone v1.3 goals and definitions.
- `.planning/phases/13-feed-and-water-logging/13-CONTEXT.md` — Phase 13 Context (parent water module details).

### Database Schema & Services
- `supabase/migrations/00020_water_consumption.sql` — Schema definition for the `water_consumption` table.
- `lib/database.types.ts` — TypeScript definitions for database entities.
- `lib/services/water.ts` — Data access layer service for water consumption.
- `lib/plans.ts` — Central permissions matrix and plan types.

### Codebase Entry Point
- `app/dashboard/flocks/detalhes/[loteId]/agua/page.tsx` — Target page to update.
- `app/dashboard/flocks/detalhes/[loteId]/page.tsx` — Parent flock details page containing sub-navigation card.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/services/water.ts` — Contains client wrappers like `getWaterByDateRange`. A new method `getWaterByFlockAndDateRange` should be added to filter by `flock_id`.
- `idx_water_consumption_flock_id` — Database index already exists on `water_consumption(flock_id)` for performant queries.

### Established Patterns
- Client component structure using `"use client"`, `useAuth()`, and Next.js `useParams()` hooks.
- Recharts `AreaChart` and `BarChart` configuration for displaying metrics over time.

### Integration Points
- `/dashboard/flocks/detalhes/[loteId]/agua` page.
- Supabase `water_consumption` table.

</code_context>

<specifics>
## Specific Ideas

- The empty state card should look visually polished, utilizing an Agritech green or blue palette (consistent with the water droplet/hydration theme) and featuring a touch-friendly link/button to `/dashboard/agua`.

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope.

</deferred>

---

*Phase: 14-flock-water-details-page*
*Context gathered: 2026-06-14*
