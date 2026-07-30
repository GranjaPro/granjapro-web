# Phase 20: kpi-goals-persistence - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-07-30
**Phase:** 20-kpi-goals-persistence
**Areas discussed:** Migration 00030 reversal, static KPI affordance

---

## Migration 00030 Reversal

| Option | Description | Selected |
|--------|-------------|----------|
| Remove only editable-goal infrastructure | Remove `kpi_goals` while retaining the two egg-quality columns. | |
| Remove everything | Remove the table, RLS policies, trigger, stored data, and both egg-quality columns introduced by `00030`. | Yes |

**User's choice:** "Pode remover tudo."
**Notes:** The migration has already reached the database according to the user, so removing only the local file is insufficient. No data created exclusively by this migration needs preservation.

---

## Static KPI Affordance

| Option | Description | Selected |
|--------|-------------|----------|
| Remove only `cursor-pointer` | Keep hover elevation, shadow, and border effects as visual finish. | |
| Remove every interaction affordance | Remove pointer cursor and hover effects that imply the static KPI is clickable. | Yes |

**User's choice:** "Vamos remover toda affordance."
**Notes:** Values, fixed goals, ideal ranges, progress bars, colors, labels, and layouts remain exactly as they are.

| Scope option | Description | Selected |
|--------------|-------------|----------|
| Main dashboard only | Clean only the KPI cards on `/dashboard`. | |
| All KPI/indicator blocks | Clean static KPIs throughout the app while preserving genuinely actionable cards. | Yes |

**User's choice:** "Correto."
**Notes:** Cards that actually navigate, open actions, or execute commands retain their interaction behavior and visual affordances.

---

## the agent's Discretion

- Select a safe reconciliation approach for removing schema objects already applied to Supabase.
- Audit the complete KPI inventory and make focused changes without globally removing interactive styles.
- Remove editing-only dead code from the main dashboard.

## Deferred Ideas

None.
