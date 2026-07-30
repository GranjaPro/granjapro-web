---
phase: 20-kpi-goals-persistence
plan: 01
subsystem: ui
tags: [nextjs, react, dashboard, kpi, tailwind]

# Dependency graph
requires: []
provides:
  - Fixed, non-editable KPI goals on the main dashboard
  - Static main-dashboard KPI cards without pointer cursor affordance
affects: [20-kpi-goals-persistence, dashboard, ui-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Fixed KPI configuration without mutable editing state
    - Static KPI containers preserve hover styling without pointer affordance

key-files:
  created: []
  modified:
    - app/dashboard/page.tsx

key-decisions:
  - "Keep dashboard KPI goals fixed at 15000 eggs, 92% laying rate, R$ 0.12 per egg, and the existing profit fallback."
  - "Remove only the static KPI cursor-pointer token while preserving every hover, group, border, shadow, transition, and accent class."

patterns-established:
  - "Static KPI cards expose progress and goal information without click handlers or pointer cursor affordance."

requirements-completed: [D-07, D-08, D-10, D-11]

# Metrics
duration: 6min
completed: 2026-07-30
---

# Phase 20 Plan 01: Main Dashboard KPI Editing Rollback Summary

**Fixed dashboard KPI targets with all progress presentation preserved and the misleading edit/cursor affordance removed**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-30T21:16:10Z
- **Completed:** 2026-07-30T21:22:31Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Preserved the four dashboard KPI calculations and fixed goal semantics while removing all mutable goal-editing state and editor-only fields.
- Removed the complete KPI goal editor modal and its card click handler without affecting unrelated dashboard modals or actions.
- Removed exactly the `cursor-pointer` token from the main KPI container while retaining its group accent, hover shadow/border, transitions, duration, layout, and overflow styling.

## Task Commits

Each task was committed atomically:

1. **Task 1: Convert editable dashboard KPI goals to fixed values** - `7c953bf` (fix)
2. **Task 2: Remove only the pointer cursor from dashboard KPIs** - `1da4f66` (fix)

## Files Created/Modified

- `app/dashboard/page.tsx` - Keeps main KPI targets fixed and renders the existing non-interactive KPI presentation.

## Decisions Made

- Retained the approved goal values and current revenue fallback exactly as specified in the phase context.
- Scoped pointer removal to the outer container inside `currentKpis.map`; all real dashboard actions kept their handlers and cursor classes.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `npm run build` updated the generated `next-env.d.ts` route reference. The file was clean before verification and was restored after the successful build so the task commits remain scoped to the dashboard.

## Known Stubs

- `app/dashboard/page.tsx:1983` - The pre-existing Revenue vs Expenses chart still receives an empty data array. It was not introduced or changed by this plan and does not prevent the KPI rollback goal.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The main dashboard is ready for the phase-level browser check of hover visuals and non-editability.
- Plan 20-02 can remove pointer affordances from the remaining inventoried static KPI surfaces.
- Plan 20-03 can add the local rollback migration; no remote Supabase operation was performed here.

## Self-Check: PASSED

- Summary and modified source file exist.
- Task commits `7c953bf` and `1da4f66` exist in git history.
- Focused source assertions confirm editing identifiers are absent and all required static KPI visual classes remain.

---
*Phase: 20-kpi-goals-persistence*
*Completed: 2026-07-30*
