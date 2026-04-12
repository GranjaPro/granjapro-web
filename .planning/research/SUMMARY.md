# Project Research Summary

**Project:** Granja Pro - Finances Module + Calendar Sync
**Domain:** Poultry egg farm management SaaS (brownfield integration milestone)
**Researched:** 2026-04-11
**Confidence:** HIGH

## Executive Summary

Granja Pro is a poultry farm management SaaS built on Next.js 15, Supabase, TailwindCSS, and Recharts. The finances module and calendar sync milestone is a data integration task, not a greenfield build. The database schema is complete, the service layer exists, the UI is built with mock data, and the shared date filter context already wraps the dashboard. The work is wiring - replacing hardcoded arrays with real Supabase queries and connecting the finances page to the same useDateFilter() context every other module already uses.

The recommended approach is strict consistency with established patterns: useCallback + useEffect for data fetching, useDateFilter() for all date ranges, useAuth().farm.id as the only source of farm_id, and client-side useMemo for KPI aggregation. No new dependencies are needed. Every pattern required already exists in production, mortality, racao, health, and sales pages - those pages are the reference implementation.

The single biggest risk is architectural: sales and financial_transactions are two separate revenue sources with no foreign key link. If both are queried and summed for revenue KPIs, income will be double-counted silently. This decision must be made before any query is written. The second critical risk is the finances page isolated periodo state, which must be fully replaced with useDateFilter() before any Supabase data is wired up, or the shared calendar sync requirement will remain broken even with live data flowing.
---

## Key Findings

### Recommended Stack

The existing stack requires zero additions for this milestone. Next.js 15 (App Router), React 19, TypeScript 5, TailwindCSS 3, Supabase JS 2 + SSR, and Recharts 3 are all already installed. The DateFilterProvider, useAuth, and the service layer in lib/services/finances.ts are fully implemented. No new libraries, no Supabase Edge Functions, no API routes, no state management libraries.

**Core technologies in use:**
- **Next.js 15 (App Router):** All pages are use client components - no RSC used for data pages
- **Supabase JS 2 + @supabase/ssr:** Browser singleton client (lib/supabase/client.ts) for all queries; RLS is the sole auth layer
- **Recharts 3:** Mandatory per project rules; all charts already rendered in the mock UI
- **DateFilterContext:** Already at layout level; provides dateRange.startDate / endDate as ISO strings to all dashboard pages
- **lib/services/finances.ts:** Existing CRUD + aggregation service; needs type-safety fixes and a getFinancialSummaryByRange() addition

### Expected Features

**Must have (table stakes - wire real data now):**
- Monthly revenue total - pull from financial_transactions WHERE type = revenue
- Monthly expenses total - pull from financial_transactions WHERE type = expense
- Monthly profit / loss - computed from revenue minus expenses
- Expense by category breakdown - 7 canonical categories (feed, labor, energy, water, medicines, maintenance, other)
- Cash flow chart (revenue vs expense over time) - group transactions by date bucket
- Add / edit / delete transaction - CRUD already in service layer, needs modal wiring
- Transaction list with search - client-side filter on fetched data
- Cost per egg - total_expenses / eggs_produced requires join with egg_production
- Period filter wired to shared useDateFilter() - replace local periodo state entirely

**Should have (differentiators - next milestone):**
- Revenue goal progress bar - needs editable goal stored per farm (schema change required)
- Profit per bird - wire useAuth().farm.total_birds instead of hardcoded 2851
- Revenue breakdown by customer / barn / flock - needs JOIN to sales table
- Monthly cash flow table (12-month running view) - requires 12-month aggregate query
- Auto-sync feed costs from feed_consumption - avoids double-entry (architectural decision pending)

**Defer indefinitely (Pro tier):**
- PDF/Excel export - explicitly gated in PROJECT.md
- Invoice generation / NF-e emission - SEFAZ integration, out of scope
- Bank account integration (Open Finance) - no existing pattern in stack
- Worker payroll management - PROJECT.md deferred feature
- Budget planning / forecasting - requires historical data that new users do not have

### Architecture Approach

GranjaPro uses a flat service layer pattern: large use client page components call thin Supabase wrappers in lib/services/. No Redux, no Zustand, no React Query. DateFilterProvider wraps the entire dashboard shell. RLS on all tables is the only authorization layer - no server middleware. The finances page must follow this same flat pattern exactly: useAuth() for farm_id, useDateFilter() for date ranges, inline useCallback + useEffect for fetching, and useMemo for KPI computation.

**Major components and responsibilities:**
1. app/dashboard/finances/page.tsx - all financial UI (KPI cards, charts, transaction table, modals); fetches and aggregates data
2. lib/services/finances.ts - CRUD + range queries against financial_transactions; needs type fixes and getFinancialSummaryByRange() added
3. components/date-filter/date-filter-context.tsx - global date range state; finances page must consume this instead of local periodo state
4. components/dashboard/financial-summary.tsx - dashboard widget; currently on mock-data.ts, needs wiring to getFinancialSummary()
5. financial_transactions table (Supabase) - authoritative ledger; all RLS policies already in place, compound index on (farm_id, date) exists

**Critical architectural decision (unresolved - must decide before build):**
- **Option A (recommended):** Revenue from financial_transactions only; sales page is independent. Simplest for current state.
- **Option B:** Dual-write - creating a sale also inserts a financial_transactions revenue row (use reference column as soft FK). More consistent long-term but adds write complexity.
- **Option C:** Finances page queries both tables and merges client-side. Most complex; not recommended.

### Critical Pitfalls

1. **Isolated periodo state in finances page** - The page has its own dia/semana/mes state with hardcoded 2024 dates. If Supabase queries are wired to this instead of useDateFilter(), the shared calendar sync requirement is broken even with live data. Fix first, before any query is written. Remove periodo entirely; use only const { dateRange } = useDateFilter().

2. **Double-counting revenue** - sales.total and financial_transactions (type=revenue) are separate tables with no FK. Summing both for revenue KPIs gives double the actual income silently (no error thrown). Decide single source of truth before writing any KPI query; document in docs/database.md.

3. **RLS returning empty results silently** - If profiles.farm_id is null (incomplete onboarding) or the wrong Supabase client is used, RLS subqueries return an empty set and every query returns [] with no error. Always guard with if (!farm?.id) return before calling any service function, identical to racao/page.tsx and production/page.tsx.

4. **UTC off-by-one in date filtering** - DateFilterContext uses toISOString().split(T)[0] which emits UTC. Brazilian farmers at UTC-3 will see today filter show 0 results after 9 PM local time. Replace with a local-date string builder (getFullYear(), getMonth(), getDate()). Fix once in date-filter-context.tsx; all pages benefit.

5. **English category keys vs Portuguese strings in service layer** - lib/services/finances.ts filters by t.category === feed but the UI and likely real data use Portuguese values. Define a TRANSACTION_CATEGORIES constants file with canonical English keys; use them everywhere from DB to display layer.

---

## Implications for Roadmap

Based on combined research, this milestone breaks cleanly into 4 ordered phases. Each phase has a single, verifiable output and no circular dependencies.

### Phase 1: Resolve Architecture Decision + Fix Foundation

**Rationale:** Two blocking decisions must be made before any data can be wired: (1) single source of truth for revenue (financial_transactions only vs. dual-write with sales), and (2) category key standardization. Writing any queries before these decisions creates rework. Also fix the UTC date bug in DateFilterContext here - it affects every page and takes 10 lines.

**Delivers:**
- Documented single source of truth decision in docs/database.md
- TRANSACTION_CATEGORIES constants file with canonical English keys + PT-BR display labels
- DateFilterContext date computation fixed (local date strings, not UTC)
- getFinancialSummaryByRange(farmId, startDate, endDate) added to lib/services/finances.ts
- any types in lib/services/finances.ts replaced with typed financial_transactions Row type

**Avoids:** Pitfall 2 (double-counting), Pitfall 4 (UTC off-by-one), Pitfall 6 (category key mismatch)

**Research flag:** None - standard patterns, no external research needed.

---

### Phase 2: Calendar Sync (Replace Local periodo State)

**Rationale:** The shared calendar sync is the explicitly stated requirement. It must be done before data queries are wired so that fetchData is built against useDateFilter() from the start. Building queries against the local periodo state and migrating later creates throwaway work.

**Delivers:**
- finances/page.tsx imports useDateFilter() and removes all periodo state and toggle buttons
- All computed values (receitaPeriodo, lucroLiquido, margem, etc.) refactored to depend on dateRange.startDate / endDate
- Finances page responds to the dashboard-level CalendarFilter in sync with all other pages

**Avoids:** Pitfall 1 (isolated period state), Anti-Pattern 1 (re-implementing date filtering locally)

**Research flag:** None - well-documented pattern, reference implementations exist in production/racao/sales pages.

---

### Phase 3: KPI Cards + Aggregations (Core Data Integration)

**Rationale:** With the calendar context wired and the architecture decision made, data fetching can begin. KPI cards are the most visible output and validate that the query and aggregation layer is correct before charts are built on top of it.

**Delivers:**
- fetchData using useCallback + useEffect pattern against financial_transactions
- Revenue total, expenses total, net profit - all real Supabase data
- Expense by category breakdown (using TRANSACTION_CATEGORIES constants)
- lucroPorAve using useAuth().farm?.total_birds (replacing hardcoded 2851)
- custoOvo using join with egg_production count for the same date range
- Dashboard widget financial-summary.tsx wired to getFinancialSummary()
- Loading states and zero-guards on all KPI divisions

**Avoids:** Pitfall 3 (RLS empty results), Pitfall 5 (big-bang replacement - KPIs first, charts second), Pitfall 10 (hardcoded totalAves), Pitfall 11 (hardcoded metaReceita)

**Research flag:** None - all patterns established in codebase.

---

### Phase 4: Charts + Transaction Table CRUD

**Rationale:** Charts depend on the same aggregated data as KPI cards. Build them last, after KPIs are verified correct, to avoid debugging chart rendering issues alongside data issues simultaneously.

**Delivers:**
- Cash flow chart (revenue vs expense area chart) - group transactions by date bucket
- Expense breakdown pie/bar chart - driven by category aggregation from Phase 3
- Transaction list - real financial_transactions data with client-side search
- Add / edit / delete transaction modals wired to createTransaction, updateTransaction, deleteTransaction service functions
- null guards (data={chartData ?? []}) on all Recharts components

**Avoids:** Pitfall 9 (Recharts undefined crash), Anti-Pattern 2 (displaying sales table fields in a financial_transactions-driven list)

**Research flag:** None - standard CRUD wiring, Recharts patterns well-established in codebase.

---

### Phase Ordering Rationale

- Phase 1 before everything: unresolved architectural ambiguity (revenue source) contaminates every subsequent query. Decide once, document once.
- Phase 2 before Phase 3: building fetchData against useDateFilter() from the start avoids rewriting it after calendar sync is added.
- Phase 3 before Phase 4: charts are derived from the same data as KPIs; validate the data layer first so chart debugging is isolated to rendering, not data.
- Incremental replacement (KPIs then charts then CRUD) directly avoids Pitfall 5, which explicitly warns against replacing all mock data simultaneously.

### Research Flags

Phases with standard patterns (skip deeper research):
- **Phase 1:** All patterns already established in codebase - constants file, service typing, date math
- **Phase 2:** Reference implementations exist in 6 other pages - copy the pattern
- **Phase 3:** Supabase query pattern and useCallback+useEffect well-documented in codebase
- **Phase 4:** Recharts and Supabase CRUD patterns well-established - no novel integration

No phase in this milestone requires /gsd:research-phase. All required patterns exist in the codebase and research files.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies read from package.json directly; no new dependencies needed |
| Features | HIGH | Mock UI reveals intended feature set; service layer reveals data model; schema confirmed in migrations |
| Architecture | HIGH | All patterns verified by direct codebase inspection across 6+ existing pages |
| Pitfalls | HIGH | All pitfalls identified from direct code inspection; no inferred or speculative issues |

**Overall confidence:** HIGH

### Gaps to Address

- **Revenue source decision:** The single unresolved gap. Research identifies the options (A/B/C) and recommends Option A, but the team must confirm before Phase 3 begins. Document in docs/database.md.
- **Revenue goal feature:** metaReceita is hardcoded 20000. Either remove the progress bar UI for this milestone or add a revenue_goal column to the farms table. A schema migration is needed - scope it to next milestone or decide in Phase 1.
- **sales.total integrity:** Research flags that total may drift from quantity * unit_price if updates are done without recalculation. Verify the insert/update path in lib/services/sales.ts before plugging sales into any financial KPI (only relevant if Option B or C is chosen).

---

## Sources

### Primary (HIGH confidence)

- app/dashboard/finances/page.tsx - existing mock UI structure, isolated periodo state, hardcoded values
- lib/services/finances.ts - service layer CRUD, category string handling
- lib/database.types.ts - TypeScript schema for all tables
- supabase/migrations/00001_initial_schema.sql - financial_transactions schema, RLS policies, indexes
- components/date-filter/date-filter-context.tsx - shared filter contract, UTC date computation bug
- app/dashboard/layout.tsx - DateFilterProvider scope
- app/dashboard/production/page.tsx, racao/page.tsx, sales/page.tsx - reference data fetching pattern
- components/dashboard/financial-summary.tsx - dashboard widget still on mock-data
- package.json - dependency versions
- .planning/PROJECT.md - constraints, out-of-scope features, Pro tier gates
- docs/mvp.md - canonical expense/revenue categories

### Secondary (MEDIUM confidence)

- Revenue source strategy (Option A/B/C) - inferred from schema design and absence of FK between sales and financial_transactions; confirmed by absence of any trigger or dual-write code in the codebase

---
*Research completed: 2026-04-11*
*Ready for roadmap: yes*
