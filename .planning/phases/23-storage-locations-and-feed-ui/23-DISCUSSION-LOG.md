# Phase 23: storage-locations-and-feed-ui - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-01
**Phase:** 23-storage-locations-and-feed-ui
**Areas discussed:** Navigation Structure, Storage CRUD Interaction, Feed Transfer Interaction

---

## Navigation Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Unify everything under /inventory with tabs | Unify everything under /inventory with tabs (Storage, Feed, Vaccines, Packaging) | |
| Keep Feed separate | Keep Feed separate (e.g. /racao), and use /inventory for the rest | |
| Use separate pages | Use separate pages for all of them in the sidebar | |

**User's choice:** /racao registra somente consumo e deve se manter dessa forma. O registro de qualquer estoque deve ser feito dentro de /inventory
**Notes:** The user provided a free-text response clarifying that /racao should only record consumption, and all inventory logging goes to /inventory.

---

## Storage CRUD Interaction

| Option | Description | Selected |
|--------|-------------|----------|
| Use Modal forms | Use Modal forms (standard across the app for CRUD) | ✓ |
| Use inline table editing | Use inline table editing for faster data entry | |

**User's choice:** Use Modal forms (standard across the app for CRUD)
**Notes:** Standard modal forms selected for consistency.

---

## Feed Transfer Interaction

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated "Transfer/Adjust" modal | Dedicated "Transfer/Adjust" modal (allows moving feed between locations or recording losses) | ✓ |
| Simple manual quantity override | Simple manual quantity override (user just edits the total quantity in the location directly) | |
| Separate actions | Separate actions: "Transfer to location" and "Record loss" buttons opening specific modals | |

**User's choice:** Dedicated "Transfer/Adjust" modal (allows moving feed between locations or recording losses)
**Notes:** The user preferred a unified transfer/adjust modal.

---

## the agent's Discretion

None.

## Deferred Ideas

None.
