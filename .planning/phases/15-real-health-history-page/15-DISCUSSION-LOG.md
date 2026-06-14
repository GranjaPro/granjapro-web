# Phase 15: Real Health History Page - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-14
**Phase:** 15-real-health-history-page
**Areas discussed:** Fallback/Empty State, Mortality Event Integration, Checklist Generation for Inspections, Treatment Duration and Results

---

## Fallback/Empty State

| Option | Description | Selected |
|--------|-------------|----------|
| Full empty state card with action button | Show a clean, polished empty state card that redirects the user to log health records or create inspections, hiding empty charts and tables. | ✓ |
| Empty layout | Render the page structure (charts, timeline, tabs) with 0 or empty values. | |
| Redirect option | Redirect to the main Health page (`/dashboard/health?register=true`) with the flock parameter pre-filled. | ✓ |
| Mixed data handling | Render the full page if at least one mortality or health record exists; show empty state if both are empty. | ✓ |
| Shared logic | Share the exact same empty state logic and UI layout for design consistency between saude and historico-sanitario. | ✓ |
| Hide patterns | Hide the 'Padrões identificados' card entirely when there is insufficient data or empty state. | ✓ |

**User's choice:** Selected all recommended options.
**Notes:** Reuses the empty state patterns established in Phase 14.

---

## Mortality Event Integration

| Option | Description | Selected |
|--------|-------------|----------|
| Merge mortality records | Fetch records from the `mortality` database table for the flock and merge them into the timeline as `"mortalidade"` events. | ✓ |
| Format details | Show "Mortalidade registrada: X aves" as title, and the cause + notes in the description. | ✓ |
| KPI calculations | Calculate dynamically based on actual database mortality records for the active date range / last 7 days. | ✓ |
| Health score inclusion | Yes, include mortality in the health score calculation with 40% weight (reusing the mock formula with real DB data). | ✓ |

**User's choice:** Selected all recommended options.
**Notes:** Connects the timeline and KPIs directly to the Supabase `mortality` table.

---

## Checklist Generation for Inspections

| Option | Description | Selected |
|--------|-------------|----------|
| Default checklist | Generate a standard 12-item checklist and set all to 'Ok' by default. | ✓ |
| Omit checklist | Omit the checklist UI completely for real database records (only show date, responsible, notes). | |
| Keyword scanning | Scan the notes and title for keywords (e.g. 'pena', 'ventilação') to flag specific items as abnormal. | ✓ |
| Status rendering | If status is not 'completed', set all checklist items to unchecked/pending in the UI. | ✓ |
| Compliance score | Calculate compliance dynamically based on 'Ok' items (e.g. 11/12 = 92%), showing 'Pendente' for non-completed inspections. | ✓ |

**User's choice:** Selected all recommended options.
**Notes:** Solves the schema gap since checklists are not stored in the database.

---

## Treatment Duration and Results

| Option | Description | Selected |
|--------|-------------|----------|
| Parse duration | Parse the duration from notes (e.g. '5 dias'), adding it to start date to compute end date; default to same-day if not found. | ✓ |
| Result mapping | Map database status fields to UI outcomes: 'completed' -> 'resolvido', 'in_progress' -> 'em_tratamento', and others -> 'parcial'. | ✓ |
| Full write integration | Wire the edit modal and resolve symptom actions on the flock health page to perform actual database update calls. | ✓ |
| Resolve symptom mapping | Set the status of all corresponding in-progress health records that mention the symptom to 'completed' in the database. | ✓ |

**User's choice:** Selected all recommended options.
**Notes:** Ensures full database write integration instead of local-only updates.

---

## the agent's Discretion
- Standard layout styling for the empty state.
- Keyword lists used for flagging checklist parameters (e.g., mapping "temperatura" to temperature, "ventilação" to ventilation, "ração" to feed, "água" to water, "penas" or "bicagem" or "sintoma" to clinical signs/behavior).

## Deferred Ideas
- None — discussion stayed within phase scope.
