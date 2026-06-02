---
status: complete
phase: 08-plan-persistence-permission-matrix
source:
  - .planning/phases/08-plan-persistence-permission-matrix/08-01-SUMMARY.md
  - .planning/phases/08-plan-persistence-permission-matrix/08-02-SUMMARY.md
  - .planning/phases/08-plan-persistence-permission-matrix/08-03-SUMMARY.md
started: 2026-05-21T20:01:32.1233547-03:00
updated: 2026-05-21T20:45:56.7480408-03:00
---

## Current Test

[testing complete]

## Tests

### 1. Automatic Premium Trial On New Account
expected: A newly created user enters the dashboard with Premium access active for the free trial, is not forced onto /dashboard/select-plan immediately, sees the active Premium trial badge in the header, and the remaining trial copy never exceeds 7 days.
result: pass

### 2. Voluntary Plan Change During Trial
expected: A user in the Premium trial can open /dashboard/select-plan from the sidebar footer or profile menu, choose Essencial, Pro, or Premium, and return to the dashboard with profiles.plan updated and the trial banner no longer blocking the flow.
result: pass

### 3. Expired Trial Plan Selection Gate
expected: After the 7-day trial expires, the app clears profiles.plan to null, redirects the user to /dashboard/select-plan before showing dashboard content, hides dashboard navigation while plan is null, and does not offer a second free trial.
result: pass

### 4. Plan Selection Page Content
expected: /dashboard/select-plan shows Essencial, Pro, and Premium with pricing, benefits, limits, and AI credit weights aligned with the landing page; the cards use the final visual style and selecting a plan redirects back to the dashboard.
result: pass

### 5. Active Plan And Upgrade Badges
expected: The header persistently shows the active account plan badge. Sidebar and component badges appear only for features above the active plan; Premium users do not see Pro or Premium upgrade tags on already available features.
result: pass

### 6. Pro And Premium Route Guards
expected: /dashboard/workers and /dashboard/reports are available to Pro and Premium accounts, while Essencial or no-plan users are blocked and routed into the plan-selection/upgrade flow instead of seeing protected content.
result: pass

### 7. Advanced Feature Toggle Layout
expected: Essencial and Pro accounts see the header toggle for advanced features; when enabled, advanced-only cards disappear completely and the dashboard, production, health, mortality, finances, and sales layouts reflow without empty gaps or misaligned grids.
result: pass

### 8. Locked Overlay Behavior
expected: When advanced features are visible but locked, cards keep their title/subtitle and required Pro or Premium tag visible, blur only the protected body, keep rounded corners, do not overflow into neighboring cards, and open the correct upgrade modal when clicked.
result: pass
reported: "Evolução do lote na página de saúde não está alinhado com os outros componentes"
severity: cosmetic
resolution: "Adjusted the health page Evolução do lote card header and responsive grid so the title/tag remain aligned and filters wrap on smaller screens."

### 9. Shared Assistant Card Behavior
expected: The assistant cards across dashboard, production, ração, saúde, mortalidade, finanças, clientes, and vendas share the dashboard assistant behavior: unlocked for Premium, hidden by the advanced-feature toggle for lower plans, and otherwise shown as a locked preview with blurred insight cards under the overlay.
result: pass

## Summary

total: 9
passed: 9
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Locked cards keep title/subtitle and required plan tag visible without layout misalignment"
  status: resolved
  reason: "User reported: Evolução do lote na página de saúde não está alinhado com os outros componentes"
  severity: cosmetic
  test: 8
  artifacts:
    - path: "app/dashboard/health/page.tsx"
      issue: "The Evolução do lote card header keeps title, plan tag, and period filters in one cramped row, causing the preserved locked header to misalign against neighboring cards."
  missing:
    - "Separate the title/plan badge row from the period filter row so the locked overlay preserves a stable, aligned header."
  resolution: "Health page card header and responsive grid adjusted; user confirmed the checkpoint passed."
