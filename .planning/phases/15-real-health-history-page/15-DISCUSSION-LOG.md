# Phase 15: Real Health History Page - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-16
**Phase:** 15-real-health-history-page
**Areas discussed:** Scope of MVP, Daily Health Checklist, Vaccine & Medication Traceability, Mortality & Culling Categories

---

## Scope of MVP

| Option | Description | Selected |
|--------|-------------|----------|
| Unified "Diário do Lote" Form | A single-page form for entering production, mortality, feed/water, and health indicators under 1 minute. | |
| Scoped-down Modals & Tabs | Separate registration forms/modals on the health details and sanitary history pages to speed up MVP delivery. | ✓ |

**User's choice:** Scoped-down Modals & Tabs.
**Notes:** Decided due to tight timeline (MVP launch target at the end of July).

---

## Daily Health Checklist

| Option | Description | Selected |
|--------|-------------|----------|
| Keyword scanning from Notes | Scan free-text titles/notes using regex or AI keywords to populate UI checklists. | |
| Structured table `daily_inspections` | Create a separate table to store checklist fields (feces status, respiratory signs, behavior, pH/chlorine). | ✓ |

**User's choice:** Structured table `daily_inspections`.
**Notes:** Essential for compliance, data structure integrity, and auditability. Avoids failure modes of typing errors and inconsistent phrasing.

---

## Vaccine & Medication Traceability

| Option | Description | Selected |
|--------|-------------|----------|
| Simple text logs | Store information about treatments in plain text fields. | |
| Strict structured fields | Expand `health_records` to store vaccine batch/validity/route and medication active ingredients/carência. | ✓ |

**User's choice:** Strict structured fields.
**Notes:** Adds critical business alerts for egg withdrawal periods (egg disposal due to health withdrawal).

---

## Mortality & Culling Categories

| Option | Description | Selected |
|--------|-------------|----------|
| Raw death count only | Log number of dead birds without categorizing technical culling or cause options. | |
| Expanded Dropdown & Culling | Separate natural mortality from technical culling, and expand cause options (Heat Stress, Cannibalism, etc.). | ✓ |

**User's choice:** Expanded Dropdown & Culling.
**Notes:** Aligned with the existing frontend dropdown view, adding specific choices relevant to commercial laying hen operations.

---

## the agent's Discretion

- Styling and visual layout of the carência alert banner.
- Custom validation messages inside the forms.

## Deferred Ideas

- **The Unified Flock Log:** Postponed to post-MVP roadmap backlog.
