---
phase: 14-flock-water-details-page
plan: 01
subsystem: ui
tags: [nextjs, supabase, recharts, water-consumption, plan-gating]

requires:
  - phase: 13-feed-and-water-logging
    provides: water_consumption table and water management service patterns
provides:
  - Flock-filtered water consumption service lookup
  - Real Supabase-backed flock water details dashboard
  - Essential-plan lock and empty state for flock water details
affects: [flock-details, water-management, plan-gating]

tech-stack:
  added: []
  patterns:
    - Client-side Supabase service wrapper for flock-scoped water records
    - Local date-range filtering over flock water history
    - LockedOverlay gating before protected metric fetches

key-files:
  created: []
  modified:
    - lib/services/water.ts
    - lib/services/index.ts
    - app/dashboard/flocks/detalhes/[loteId]/agua/page.tsx

key-decisions:
  - "Essential users see LockedOverlay before water and production metrics are fetched."
  - "Flock water charts use actual water_consumption rows with dynamic phase targets by historical flock age."
  - "Liters-per-egg uses real egg_production rows and falls back to phase estimates only when no egg records exist."

patterns-established:
  - "Flock detail metric pages should gate paid metric fetches before querying protected datasets."
  - "Water target comparisons should derive stage targets from flock age at each record date, not from mock curves."

requirements-completed: [WATER-DETAIL-01, WATER-DETAIL-02, WATER-DETAIL-03]

duration: 54 min
completed: 2026-06-14
---

# Phase 14 Plan 01: Flock Water Details Page Summary

**Supabase-backed flock water dashboard with Pro gating, empty state, dynamic stage targets, and real egg-production efficiency metrics**

## Performance

- **Duration:** 54 min
- **Started:** 2026-06-14T20:12:00Z
- **Completed:** 2026-06-14T21:06:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Added `getWaterByFlock(farmId, flockId)` to fetch real water consumption rows ordered by date.
- Replaced generated mock water curves with actual flock water records and dynamic 55ml-245ml stage targets.
- Added Essential plan gating through `LockedOverlay` before protected water and production metrics are fetched.
- Added a polished empty state with direct navigation to `/dashboard/agua` when the flock has no water records.
- Loaded real `egg_production` records for liters-per-egg calculations, with a phase-based estimate only as fallback.

## Task Commits

1. **Task 1: Add getWaterByFlock service method** - `e97e4b5` (feat)
2. **Task 2: Implement Gating and Data Loading on Flock Water Page** - `6b8d7ed` (feat)
3. **Task 3: Implement Empty State and Metrics Calculations** - `6b8d7ed` (feat)

**Plan metadata:** pending metadata commit

## Files Created/Modified

- `lib/services/water.ts` - Adds flock-scoped water consumption lookup.
- `lib/services/index.ts` - Exports the flock-scoped water service.
- `app/dashboard/flocks/detalhes/[loteId]/agua/page.tsx` - Loads real flock water and egg-production data, gates Essential users, renders empty state, and recalculates metrics/charts from database rows.

## Decisions Made

- Essential users are gated before `getWaterByFlock` or `egg_production` queries run, preventing paid water metrics from being fetched for locked users.
- The page retains its local history selector and filters already-loaded flock history locally, matching the phase context decision.
- Stage targets are the canonical values from Phase 14 context: 55, 120, 175, 220, 245, 225, 205, and 170 ml/ave/dia.

## Deviations from Plan

### Process Deviations

**1. Combined Task 2 and Task 3 into one page commit**
- **Found during:** Task 3 (metrics and empty state)
- **Issue:** Task 2 data loading and Task 3 calculations shared the same page state, derived metrics, and chart rendering.
- **Fix:** Implemented both page tasks together after Task 1, then verified all acceptance criteria and build output.
- **Files modified:** `app/dashboard/flocks/detalhes/[loteId]/agua/page.tsx`
- **Verification:** Plan grep checks passed, no `any` in touched TypeScript files, and `npm run build` passed.
- **Committed in:** `6b8d7ed`

---

**Total deviations:** 1 process deviation.
**Impact on plan:** No behavioral scope change. The shipped feature matches all plan tasks and must-haves.

## Issues Encountered

- Recharts tooltip formatter typing required accepting `undefined` and readonly array values. Resolved without using `any`.
- `npm run build` passes. It still reports the existing Next.js warning that the `middleware` file convention is deprecated in favor of `proxy`.

## User Setup Required

None - no external service configuration required.

## Verification

- `grep getWaterByFlock lib/services/water.ts` - passed.
- `grep getWaterByFlock lib/services/index.ts` - passed.
- `grep usePlan app/dashboard/flocks/detalhes/[loteId]/agua/page.tsx` - passed.
- `grep LockedOverlay app/dashboard/flocks/detalhes/[loteId]/agua/page.tsx` - passed.
- `grep getWaterByFlock app/dashboard/flocks/detalhes/[loteId]/agua/page.tsx` - passed.
- `grep "Nenhum registro de consumo" app/dashboard/flocks/detalhes/[loteId]/agua/page.tsx` - passed.
- `rg "\bany\b" lib/services/water.ts lib/services/index.ts app/dashboard/flocks/detalhes/[loteId]/agua/page.tsx` - no matches.
- `npm run build` - passed.

## Next Phase Readiness

Phase 14 implementation is ready for phase-level verification. The flock water details page now depends on real `water_consumption` and `egg_production` records, so manual QA should include a Pro/Premium account with at least one flock water record and an Essential account to confirm the lock.

---
*Phase: 14-flock-water-details-page*
*Completed: 2026-06-14*
