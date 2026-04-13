# Roadmap: Granja Pro — MVP Completion

**Milestone:** Finances Module + Calendar Sync
**Created:** 2026-04-11
**Granularity:** Standard
**Total Phases:** 4
**Total v1 Requirements:** 25

---

## Phases

- [x] **Phase 1: Foundation** - Fix date handling, type safety, and financial service infrastructure
- [x] **Phase 2: Calendar Sync** - Wire all dashboard pages to shared date filter context
- [x] **Phase 3: Financial KPIs** - Replace mock data with real Supabase data on finances page and dashboard widget
- [ ] **Phase 4: Charts, CRUD & Revenue Sync** - Deliver live charts, full transaction management, and sales auto-sync

---

## Phase Details

### Phase 1: Foundation
**Goal**: The shared infrastructure is correct, typed, and safe — so all subsequent phases build on a reliable base
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04
**Success Criteria** (what must be TRUE):
  1. A farmer in Brazil (UTC-3) selecting "today" at 10 PM sees today's records, not zero results
  2. All transaction category references across the codebase point to the same constants (no raw Portuguese string literals scattered in service files)
  3. The finances service compiles without TypeScript `any` type warnings on transaction rows
  4. A query for transactions by date range can be made via a single typed service function call
**Plans:** 3 plans

Plans:
- [x] 01-01-PLAN.md — Fix UTC off-by-one bug in DateFilterContext (FOUND-01)
- [x] 01-02-PLAN.md — Create transaction categories constants file (FOUND-02)
- [x] 01-03-PLAN.md — Replace `any` with typed row type in finances.ts and fix return signature (FOUND-03, FOUND-04)

### Phase 2: Calendar Sync
**Goal**: Changing the date range on any dashboard page changes it everywhere — all pages share one source of truth
**Depends on**: Phase 1
**Requirements**: CAL-01, CAL-02, CAL-03, CAL-04, CAL-05
**Success Criteria** (what must be TRUE):
  1. User changes the date range on the main dashboard and the finances page immediately reflects the same period without a separate click
  2. User changes the date range on the finances page and the racao, mortality, and health pages reflect the same period
  3. No page in the dashboard has its own independent date picker that can desync from the others
  4. Removing the local `periodo` state from the finances page does not break any existing UI element
**Plans**: 1 plan

Plans:
- [x] 02-01-PLAN.md — Refactor Finances page to use `useDateFilter()` and `CalendarFilter` (CAL-01, CAL-02, CAL-04)

### Phase 3: Financial KPIs
**Goal**: Farmers see real financial data on the finances page and dashboard — no more mock numbers
**Depends on**: Phase 2
**Requirements**: FIN-01, FIN-02, FIN-03, FIN-04, FIN-05, FIN-06, DASH-01
**Success Criteria** (what must be TRUE):
  1. Revenue KPI card shows the actual total from the database for the selected date range (changes when range changes)
  2. Expenses KPI card shows the actual total broken down by real categories (feed, labor, energy, water, medicines, maintenance, other)
  3. Net profit and profit margin reflect real revenue minus real expenses — not hardcoded values
  4. Profit per bird uses the farm's actual bird count from the database, not a hardcoded number
  5. The financial summary widget on the main dashboard shows real data instead of mock values
**Plans**: 4 plans

Plans:
- [x] 03-01-PLAN.md — Update finances and farms services for aggregation and bird counts (FOUND-03, FOUND-04, FIN-01, FIN-02)
- [x] 03-02-PLAN.md — Update `FinancialSummary` widget to use real data (FIN-05, DASH-01)
- [x] 03-03-PLAN.md — Integrate real data into Finances page (FIN-01, FIN-02, FIN-03, FIN-04)
- [x] 03-04-PLAN.md — Refactor main dashboard data fetching to use services (FIN-06)

### Phase 4: Charts, CRUD & Revenue Sync
**Goal**: Farmers can visualize financial trends over time, manage individual transactions, and see sales automatically reflected in revenue
**Depends on**: Phase 3
**Requirements**: CHART-01, CHART-02, CHART-03, CRUD-01, CRUD-02, CRUD-03, CRUD-04, SYNC-01, SYNC-02
**Success Criteria** (what must be TRUE):
  1. The revenue vs. expenses area chart renders with real data and updates when the date range changes
  2. The expense breakdown chart shows real category proportions from the database
  3. User can add a new transaction (type, category, amount, date, description, payment method) and see it appear immediately in the list
  4. User can edit an existing transaction and see the updated values reflected without a page reload
  5. User can delete a transaction and it is removed from the list and no longer affects KPI totals
  6. Recording a sale in the sales module automatically creates a corresponding revenue entry in financial transactions, with no duplicate counting
**Plans:** 3 plans

Plans:
- [ ] 04-01-PLAN.md — Replace mock chart arrays with real useMemo computations (CHART-01, CHART-02, CHART-03)
- [ ] 04-02-PLAN.md — Wire transaction CRUD modal to Supabase service layer (CRUD-01, CRUD-02, CRUD-03, CRUD-04)
- [ ] 04-03-PLAN.md — Auto-sync sales to revenue transactions (SYNC-01, SYNC-02)

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | Completed | 2026-04-12 |
| 2. Calendar Sync | 1/1 | Completed | 2026-04-12 |
| 3. Financial KPIs | 4/4 | Completed | 2026-04-12 |
| 4. Charts, CRUD & Revenue Sync | 0/3 | Planning | - |

---

*Roadmap created: 2026-04-11*
*Last updated: 2026-04-13 after Phase 4 planning*
