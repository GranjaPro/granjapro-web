---
phase: 01-foundation
plan: 01
subsystem: date-filter
tags: [bugfix, timezone, date-handling]
dependency_graph:
  requires: []
  provides: [local-timezone-date-strings]
  affects: [all-dashboard-pages, supabase-date-queries]
tech_stack:
  added: []
  patterns: [local-date-serialization]
key_files:
  created: []
  modified:
    - components/date-filter/date-filter-context.tsx
decisions:
  - Use Date.getFullYear/getMonth/getDate instead of toISOString for timezone-safe date strings
metrics:
  duration: 91s
  completed: "2026-04-12T16:18:20Z"
  tasks_completed: 1
  tasks_total: 1
---

# Phase 01 Plan 01: Fix UTC Off-by-One Date Bug Summary

**One-liner:** Local-timezone date serializer replacing toISOString in DateFilterContext to fix off-by-one day bug for Brazilian users after 9 PM.

## What Was Done

Replaced all `toISOString().split("T")[0]` calls in the `dateRange` useMemo of `DateFilterContext` with a new `toLocalDateString` helper function that uses `Date.getFullYear()`, `Date.getMonth()`, and `Date.getDate()` to produce YYYY-MM-DD strings based on the browser's local timezone instead of UTC.

### Changes

- Added `toLocalDateString(d: Date): string` helper function (lines 22-27) before `DateFilterProvider`
- Replaced 6 `toISOString().split("T")[0]` calls across all 4 branches (dia, intervalo, mes, fallback) with `toLocalDateString(...)` calls
- No changes to exported types, interfaces, JSX, or the `useDateFilter` hook

### Why This Matters

`Date.toISOString()` converts to UTC, which is UTC+0. Brazilian users are in UTC-3. After 9 PM local time, the UTC date rolls forward to the next day, causing "today" queries to return zero results because the date string mismatches the database records stored with the local calendar date.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | 2b8842b | fix(01-01): replace toISOString with local date builder to fix UTC off-by-one bug |

## Verification Results

- `grep "toISOString" components/date-filter/date-filter-context.tsx` -- zero matches (confirmed removed)
- `grep -c "toLocalDateString" components/date-filter/date-filter-context.tsx` -- 8 matches (1 definition + usage across all branches)
- `npx tsc --noEmit` -- no errors in target file (pre-existing error in unrelated `operacional/page.tsx` is out of scope)

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- [x] components/date-filter/date-filter-context.tsx exists
- [x] Commit 2b8842b exists in git log
