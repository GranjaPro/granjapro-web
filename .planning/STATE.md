# Project State: Granja Pro — MVP Completion

**Last updated:** 2026-04-11
**Milestone:** Finances Module + Calendar Sync

---

## Project Reference

**Core Value:** Help egg farmers simplify daily farm management and improve financial control — the platform must be fast, intuitive, and useful every single day.

**Current Focus:** Replace mock/hardcoded financial data with real Supabase integration; synchronize date filters across all dashboard pages.

---

## Current Position

**Current Phase:** — (not started)
**Current Plan:** —
**Status:** Ready to begin Phase 1

**Progress Bar:**
```
Phase 1 [          ] 0%
Phase 2 [          ] 0%
Phase 3 [          ] 0%
Phase 4 [          ] 0%
```

**Overall:** 0 / 4 phases complete

---

## Phase Summary

| Phase | Goal | Status |
|-------|------|--------|
| 1 - Foundation | Shared infrastructure: date handling, type safety, service layer | Not started |
| 2 - Calendar Sync | All dashboard pages share one date range source of truth | Not started |
| 3 - Financial KPIs | Real Supabase data on finances page and dashboard widget | Not started |
| 4 - Charts, CRUD & Revenue Sync | Live charts, transaction management, sales auto-sync | Not started |

---

## Performance Metrics

- **Phases completed:** 0 / 4
- **Requirements delivered:** 0 / 25
- **Plans completed:** 0 / 0 (plans not yet defined)

---

## Accumulated Context

### Key Decisions

| Decision | Rationale | Status |
|----------|-----------|--------|
| Revenue source: financial_transactions only (Option A) | Prevents double-counting with sales table; no FK exists between them | Recommended — confirm before Phase 3 |
| No UI changes this milestone | Constraint: focus on data integration and bug fixes only | Confirmed |
| Shared DateFilterContext at layout level | Prevents duplicated date logic across 5+ pages | In progress |

### Critical Pitfalls (from research)

1. **Isolated `periodo` state in finances page** — must be fully removed and replaced with `useDateFilter()` before any Supabase queries are wired (Phase 2)
2. **Double-counting revenue** — `sales.total` and `financial_transactions` (type=revenue) are separate; summing both silently doubles income. Use `financial_transactions` only.
3. **RLS empty results** — always guard with `if (!farm?.id) return` before calling service functions
4. **UTC off-by-one in date filtering** — `DateFilterContext` uses `toISOString()` (UTC); must be replaced with local-date string builder for Brazilian timezone (UTC-3)
5. **Category key mismatch** — service layer uses English keys but UI/DB may use Portuguese; resolve via `TRANSACTION_CATEGORIES` constants file

### Architecture Notes

- All pages are `use client` components — no RSC for data pages
- Data fetching pattern: `useCallback` + `useEffect`; KPI computation: `useMemo`
- Farm ID source: `useAuth().farm.id` — only source, never hardcoded
- Reference implementations: `app/dashboard/production/page.tsx`, `racao/page.tsx`, `sales/page.tsx`
- `financial_transactions` table has compound index on `(farm_id, date)` — queries are efficient

### Todos

- [ ] Confirm revenue source decision (Option A/B/C) before Phase 3 begins — document in `docs/database.md`
- [ ] Decide fate of hardcoded `metaReceita` (R$20,000 revenue goal) — remove progress bar or add schema migration

### Blockers

None currently.

---

## Session Continuity

**To resume work:**
1. Read `ROADMAP.md` for phase structure and success criteria
2. Read `REQUIREMENTS.md` for requirement IDs and traceability
3. Check this file for current position and accumulated context
4. Start with `/gsd:plan-phase 1`

**Reference files (do not modify without reason):**
- `.planning/PROJECT.md` — constraints, out-of-scope, key decisions
- `.planning/REQUIREMENTS.md` — all v1 requirements with IDs
- `.planning/research/SUMMARY.md` — architecture findings and pitfall catalogue

---

*State initialized: 2026-04-11*
