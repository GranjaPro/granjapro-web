---
phase: 27-flock-mortality-page-integration
plan: 01
subsystem: ui
tags: [nextjs, react, supabase, mortality, recharts]

requires:
  - phase: 15-real-health-history-page
    provides: mortality_type support on mortality records
provides:
  - Flock-specific mortality page backed by Supabase records
  - Flock-filtered mortality service helper
  - Live CRUD flow for mortality records
  - Dynamic mortality KPIs and charts from database rows
affects: [flock-details, mortality, health-history, reports]

tech-stack:
  added: []
  patterns: [typed Supabase service helper, farm-and-flock scoped client queries, real-data chart aggregation]

key-files:
  created: []
  modified:
    - lib/services/mortality.ts
    - lib/services/index.ts
    - app/dashboard/flocks/detalhes/[loteId]/mortalidade/page.tsx

key-decisions:
  - "Added getMortalityByFlock to keep flock filtering reusable and aligned with existing service-layer conventions."
  - "Validated the selected flock with both id and farm_id before rendering records."
  - "Kept the mortality page as a client component and reused existing Supabase/RLS client patterns from neighboring flock detail pages."

patterns-established:
  - "Flock detail pages should validate the selected flock against the active farm before displaying scoped records."
  - "Mortality CRUD screens should write through lib/services/mortality.ts instead of inline Supabase mutations."

requirements-completed: [D-01, D-02, D-03, D-04]

duration: 68min
completed: 2026-06-30
---

# Phase 27 Plan 01: Flock Mortality Page Integration Summary

**Flock-specific mortality dashboard with farm-scoped Supabase records, live CRUD, and dynamic chart/KPI aggregation**

## Performance

- **Duration:** 68 min
- **Started:** 2026-06-30T17:55:32Z
- **Completed:** 2026-06-30T18:03:32Z
- **Tasks:** 5 completed
- **Files modified:** 3

## Accomplishments

- Added `getMortalityByFlock(farmId, flockId)` and exported it through the service barrel.
- Replaced the flock mortality page's static mock fixture with active-farm Supabase reads.
- Persisted add, edit, and delete actions through the mortality service layer.
- Rebuilt KPIs, weekly trend, monthly chart, causes summary, empty state, loading state, and not-found state from real records.
- Verified the phase with focused `rg` checks and `npm run build`.

## Task Commits

1. **Task 1: Add flock-specific mortality service helper** - `87968e5`
2. **Tasks 2-5: Real page loading, dynamic metrics, CRUD persistence, and build validation** - `62ae411`

## Files Created/Modified

- `lib/services/mortality.ts` - Adds `getMortalityByFlock` filtered by `farm_id` and `flock_id`.
- `lib/services/index.ts` - Re-exports the new mortality helper.
- `app/dashboard/flocks/detalhes/[loteId]/mortalidade/page.tsx` - Replaces mock state with Supabase-backed loading, CRUD, KPIs, charts, and record table.

## Decisions Made

- Used a service helper for the flock-specific query rather than repeating raw mortality filters in the page.
- Fetched barn names separately in the page to keep the service helper simple and strongly typed.
- Kept phase scope to real integration; no redesign, permissions expansion, exports, or new database schema.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `next build` updated `next-env.d.ts` from `.next/dev/types/routes.d.ts` to `.next/types/routes.d.ts`; this generated noise was reverted because it was unrelated to the phase.
- Git commits required escalation because the sandbox could not create `.git/index.lock`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 27 has one plan and is ready for final phase verification/closeout. Future phases can rely on the flock mortality page using live `mortality` table records scoped by active farm and selected flock.

---
*Phase: 27-flock-mortality-page-integration*
*Completed: 2026-06-30*
