---
status: testing
phase: 27-flock-mortality-page-integration
source: [27-01-SUMMARY.md]
started: 2026-06-30T18:10:00-03:00
updated: 2026-06-30T18:43:19-03:00
---

## Current Test

number: 2
name: Register Mortality Record
expected: |
  Click "Registrar Mortalidade", fill date, quantity, cause, optional barn/observation, and save. The modal closes and the new record appears in the table for the same flock without a page refresh.
awaiting: user response

## Tests

### 1. Open Flock Mortality Page
expected: Open `/dashboard/flocks/detalhes/[loteId]/mortalidade` for a real flock in the active farm. The page loads without mock fallback, shows the flock code in the header, and displays either real mortality data or a clear empty state for that flock.
result: pass
evidence: User screenshot showed the flock mortality page loading with real mortality data and calculated sections.

### 2. Register Mortality Record
expected: Click "Registrar Mortalidade", fill date, quantity, cause, optional barn/observation, and save. The modal closes and the new record appears in the table for the same flock without a page refresh.
result: [pending]

### 3. Dynamic KPIs and Charts
expected: After at least one mortality record exists, the status banner, KPI cards, weekly trend chart, monthly chart, and cause summary update from the record data for the selected flock.
result: pass
issue_found: The "Mortalidade por fase do lote" section split one mortality record across multiple development phases instead of assigning the record to the flock stage at the record date.
fix_applied: Replaced proportional phase distribution with grouping by `arrival_date`, `arrival_age_weeks`, and each mortality record date.
evidence: User confirmed the fixed phase grouping passed after retest.

### 4. Edit Mortality Record
expected: Click the edit icon on a mortality record, change an editable field, and save. The table and calculated metrics reflect the updated database record.
result: [pending]

### 5. Delete Mortality Record
expected: Click the delete icon, confirm deletion, and the record disappears from the table. KPIs and charts recalculate for the selected flock after deletion.
result: [pending]

### 6. Wrong or Inaccessible Flock
expected: Open the mortality URL with a flock ID that does not belong to the active farm. The page shows a not-found message instead of showing data from another farm or mock data.
result: [pending]

## Summary

total: 6
passed: 2
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps

[none]
