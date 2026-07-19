# Phase 24: vaccines-and-packaging-ui - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-07-19
**Phase:** 24-vaccines-and-packaging-ui
**Areas discussed:** vaccine scope redirect, vaccination history editing, derived UI consistency

---

## Vaccine Scope Redirect

| Option | Description | Selected |
|--------|-------------|----------|
| Keep vaccines in inventory | Build UI tabs for vaccine stock under `/dashboard/inventory`, as the original roadmap title suggested. | |
| Move vaccines to health records | Treat vaccines as scheduled/applied by an external agent and manage them through Health records, agenda and traceability. | ✓ |
| Split inventory and health equally | Keep a vaccine inventory UI while also improving health scheduling/editing. | |

**User's choice:** Vacinas não ficam em estoque dentro de granjas; elas são marcadas/agendadas e trazidas por agente externo.
**Notes:** Phase 24 was redirected away from vaccine inventory and toward scheduling/records/traceability inside Health. Packaging was not kept in this revised scope because the user clarified the phase should improve only vaccination UI.

---

## Vaccination History Editing

| Option | Description | Selected |
|--------|-------------|----------|
| Edit button per row | Add a pencil icon/action on each vaccine row in "Histórico de vacinação". | ✓ |
| Click row to edit | Make the entire vaccine row open editing. | |
| Row opens details, then edit | Open a read-only details view first, with an edit action inside. | |

**User's choice:** Edit button per row.
**Notes:** This keeps the action explicit and consistent with other editable tables/lists in the app.

---

## Edit Flow Reuse

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse existing vaccination modal/form | Use the same modal/form pattern already present in `/dashboard/health`. | ✓ |
| Create a dedicated history-only edit modal | Build a narrower modal for vaccination history editing. | |
| Navigate to Health page for editing | Send the user to `/dashboard/health` with the selected vaccine. | |

**User's choice:** Reuse existing vaccination modal/form.
**Notes:** Reuse is preferred to keep behavior consistent and avoid duplicated form logic.

---

## Editable Vaccine Statuses

| Option | Description | Selected |
|--------|-------------|----------|
| Edit all vaccines | Allow completed, scheduled, upcoming and in-progress vaccination records to be edited. | ✓ |
| Edit only scheduled/upcoming | Keep completed vaccines as locked history. | |
| Edit all, but confirm completed | Allow all edits but add an extra confirmation for completed vaccinations. | |

**User's choice:** Edit all vaccines.
**Notes:** The user wants to edit any vaccine, view dates and make reschedules if needed.

---

## Derived UI Consistency

| Option | Description | Selected |
|--------|-------------|----------|
| Update only vaccination history | Refresh the current list after editing. | |
| Update history and agenda | Keep history and "Agenda de vacinação" in sync after edits. | |
| Update history, agenda and metrics | Refresh all derived reads: history, agenda, coverage and status indicators. | ✓ |

**User's choice:** Update history, agenda and metrics.
**Notes:** Recommended because date/status changes affect coverage, upcoming/late/completed indicators and agenda visibility.

---

## the agent's Discretion

- The planner may choose the simplest implementation path to reuse the existing form/modal pattern without large duplication.
- The planner may choose small UI details for the edit icon placement and responsive layout.

## Deferred Ideas

- Packaging inventory UI is deferred out of the revised Phase 24 scope.
- Vaccine/medicine inventory UI is explicitly out of scope because vaccines are handled as health scheduling and traceability records.
