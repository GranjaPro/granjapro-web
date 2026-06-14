# Phase 14: flock-water-details-page - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-14
**Phase:** 14-flock-water-details-page
**Areas discussed:** Fallback when no database records exist, Target calculation type, Date range filtering

---

## Fallback when no database records exist

| Option | Description | Selected |
|--------|-------------|----------|
| Target-only curves | Display target guidelines (55ml-245ml) in the charts, but actual consumption empty/dashed, with a banner prompting them to register water. | |
| Full empty state | Show a clean empty state card ("Nenhum registro encontrado") with a direct button to go log water. | ✓ |
| Estimated mock fallback | Show mock/estimated consumption data based on the flock's age and stage, with a clear disclaimer label that these are estimates. | |

**User's choice:** Full empty state
**Notes:** The user prefers a clean empty state indicating no records exist, prompting them to go log water directly, rather than populating charts with empty target lines or fake mock data.

---

## Target calculation type

| Option | Description | Selected |
|--------|-------------|----------|
| Dynamic historical targets | Calculate the flock's age in weeks for each date in the chart, comparing that day's consumption to the target for the flock's age on that specific date. | ✓ |
| Static current targets | Compare all historical points against the flock's current target today (based on their current age), using a flat horizontal line in the chart. | |
| Agent Discretion | Let the assistant choose the cleanest implementation. | |

**User's choice:** Dynamic historical targets
**Notes:** Targets in the charts will dynamically calculate age per historical day to compare actual data against the target matching the flock's age on that specific date.

---

## Date range filtering

| Option | Description | Selected |
|--------|-------------|----------|
| Local history range switcher | Keep the range selector on the page (7d, 30d, months, total) to allow independent analysis of this specific flock's lifecycle. | ✓ |
| Global calendar filter | Integrate with the dashboard's global calendar filter context, so changing the date range in the top bar updates this page's charts. | |
| Hybrid | Default to the global calendar filter range, but allow local overrides via the local switcher. | |

**User's choice:** Local history range switcher
**Notes:** The page will maintain its local history range switcher independently of the global calendar context.

---

## the agent's Discretion

None — all decisions were selected explicitly.

---

## Deferred Ideas

None — discussion stayed within phase scope.
