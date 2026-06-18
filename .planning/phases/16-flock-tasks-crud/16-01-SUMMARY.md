---
phase: 16-flock-tasks-crud
plan: 01
subsystem: ui-database
tags: [tasks, recurrence, supabase, react, rls]

requires:
  - phase: 13-feed-and-water-logging
    provides: service and migration patterns for real farm operational data
provides:
  - Flock-scoped task CRUD backed by Supabase
  - Recurring task occurrence expansion in the flock operational UI
  - Per-date task status tracking through task_exceptions
affects: [dashboard, flock-operational-page, tasks, alerts]

tech-stack:
  added: []
  patterns:
    - Typed Supabase service functions using Database table contracts
    - Base recurring task rows with per-occurrence exception records

key-files:
  created:
    - components/dashboard/task-dialog.tsx
    - supabase/migrations/00022_flock_tasks_crud.sql
  modified:
    - app/dashboard/flocks/detalhes/[loteId]/operacional/page.tsx
    - lib/database.types.ts
    - lib/services/index.ts
    - lib/services/tasks.ts
    - supabase/schema.sql

key-decisions:
  - "Task recurrence is modeled as a base tasks row plus task_exceptions per occurrence date."
  - "Flock tasks use optional tasks.flock_id so the existing tasks table remains reusable outside a single flock."
  - "Task icons are derived from category instead of stored as user-selected task data."

patterns-established:
  - "Use typed service payloads from lib/database.types.ts instead of Record<string, any>."
  - "Use task_exceptions upserts keyed by task_id and occurrence_date for occurrence status changes."

requirements-completed: []

duration: 1h 35m
completed: 2026-06-18
---

# Phase 16 Plan 01: Flock Tasks CRUD Summary

**Supabase-backed flock task CRUD with recurring task expansion and per-date occurrence status tracking**

## Performance

- **Duration:** 1h 35m
- **Started:** 2026-06-18T23:20:00Z
- **Completed:** 2026-06-18T23:55:00Z
- **Tasks:** 1 plan executed
- **Files modified:** 7

## Accomplishments

- Added task schema fields for flock scoping, category, priority, recurrence, and notes.
- Added `task_exceptions` with RLS, uniqueness, indexes, and generated TypeScript table types.
- Replaced the flock operational page task mocks with real Supabase task loading, creation, editing, deletion, recurrence expansion, and occurrence status updates.
- Added a reusable `TaskDialog` component for task create/edit fields.
- Removed `Record<string, any>` from the task service and replaced it with typed Supabase insert/update contracts.

## Task Commits

1. **Task 1: Flock tasks CRUD and recurrence** - `5bbf28a` (`feat(16-01): implement flock tasks crud`)

**Plan metadata:** pending in summary commit

## Files Created/Modified

- `supabase/migrations/00022_flock_tasks_crud.sql` - Adds task metadata columns and `task_exceptions`.
- `supabase/schema.sql` - Mirrors the updated task schema and policies.
- `lib/database.types.ts` - Adds typed task metadata and task exception contracts.
- `lib/services/tasks.ts` - Adds typed task schedule, exception, CRUD, and occurrence-status functions.
- `lib/services/index.ts` - Exports the expanded task service API.
- `components/dashboard/task-dialog.tsx` - Shared task create/edit dialog.
- `app/dashboard/flocks/detalhes/[loteId]/operacional/page.tsx` - Loads real task data and maps recurring occurrences for the selected date.

## Decisions Made

- A recurring task remains one base `tasks` row; date-specific completion state is stored in `task_exceptions`.
- `flock_id` is optional on `tasks`, preserving compatibility with farm-wide tasks.
- Icons are derived from `TaskCategory`, matching the plan's automatic icon mapping requirement and avoiding an extra schema field.

## Deviations from Plan

None - plan executed as written.

## Issues Encountered

- The existing operational page had mojibake-heavy text, so the old inline task modal was removed in a marker-based cleanup after smaller patches failed to match reliably.
- There is no unit test framework configured in `package.json`; validation used the production Next build and GSD schema-drift check.

## Verification

- `npm run build` passed.
- `node .agents/get-shit-done/bin/gsd-tools.cjs verify schema-drift 16` reported no blocking drift.
- `rg "\bany\b"` found no `any` in the touched task service, dialog, or database types.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 16 task data is ready for dashboard checklist and alert integration in Phase 17. The next phase can consume `tasks` plus `task_exceptions` instead of mock checklist state.

---
*Phase: 16-flock-tasks-crud*
*Completed: 2026-06-18*
