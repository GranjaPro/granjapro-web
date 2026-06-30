---
status: testing
phase: 17-dashboard-checklist-and-alerts
source:
  - .planning/phases/17-dashboard-checklist-and-alerts/17-SUMMARY.md
started: 2026-06-30T17:15:01Z
updated: 2026-06-30T17:37:56Z
---

## Current Test

number: 3
name: Overdue One-Off Task Alert
expected: |
  With an overdue one-off task that has not been completed, the main dashboard shows a danger task alert with the task title and a Resolve action that routes to the dashboard tasks panel.
awaiting: user response

## Tests

### 1. Low Inventory Alert
expected: With a current farm inventory item marked as low or alert stock, the main dashboard shows an inventory alert for that item, including its name, remaining quantity, unit, and a route to the inventory page.
result: blocked
blocked_by: prior-phase
reason: "não é possível testar. pois a refatoração do storage é na fase 22 e 23. Sem elas a página de estoque ainda não funciona corretamente."

### 2. Recent Mortality Spike Alert
expected: With a mortality record from the last 3 days whose mortality rate reaches the alert threshold, the main dashboard shows a danger mortality alert with the rate and date, routed to the mortality page.
result: issue
reported: "fiz diversos registros de morte e nada."
severity: major

### 3. Overdue One-Off Task Alert
expected: With an overdue one-off task that has not been completed, the main dashboard shows a danger task alert with the task title and a Resolve action that routes to the dashboard tasks panel.
result: [pending]

### 4. Completed Overdue Task Exclusion
expected: When an overdue one-off task has a completed task exception, the dashboard does not show an overdue alert for that task.
result: [pending]

### 5. Alert Merge and Priority Sorting
expected: Dynamic inventory, mortality, and task alerts appear together with existing database and setup alerts, sorted with danger alerts before warning alerts before info alerts.
result: [pending]

## Summary

total: 5
passed: 0
issues: 1
pending: 3
skipped: 0
blocked: 1

## Gaps

- truth: "With a mortality record from the last 3 days whose mortality rate reaches the alert threshold, the main dashboard shows a danger mortality alert with the rate and date, routed to the mortality page."
  status: failed
  reason: "User reported: fiz diversos registros de morte e nada."
  severity: major
  test: 2
  artifacts: []
  missing: []
