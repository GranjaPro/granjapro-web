# Requirements: Granja Pro — MVP Completion

**Defined:** 2026-04-12
**Core Value:** Help egg farmers simplify daily farm management and improve financial control

## v1 Requirements

### Foundation

- [ ] **FOUND-01**: DateFilterContext uses local date strings instead of UTC to prevent off-by-one day errors for Brazilian timezone (UTC-3)
- [ ] **FOUND-02**: Transaction categories are defined as constants (Portuguese strings matching UI) in a shared file, preventing string drift between service layer and UI
- [ ] **FOUND-03**: `lib/services/finances.ts` uses typed Supabase row types instead of `any`
- [ ] **FOUND-04**: `finances.ts` service has a `getTransactionsByDateRange(farmId, startDate, endDate)` function

### Calendar Sync

- [ ] **CAL-01**: Finances page uses shared `useDateFilter()` context instead of local `periodo` state
- [ ] **CAL-02**: Racao page uses shared `CalendarFilter` component and `useDateFilter()` context
- [ ] **CAL-03**: Mortality page uses shared `CalendarFilter` component and `useDateFilter()` context
- [ ] **CAL-04**: Health page uses shared `CalendarFilter` component and `useDateFilter()` context
- [ ] **CAL-05**: Main dashboard page uses shared `CalendarFilter` component and `useDateFilter()` context

### Financial KPIs

- [ ] **FIN-01**: Revenue KPI card displays real total from Supabase `financial_transactions` (type=revenue) for selected date range
- [ ] **FIN-02**: Expenses KPI card displays real total from Supabase `financial_transactions` (type=expense) for selected date range
- [ ] **FIN-03**: Expense breakdown by category (feed, labor, energy, water, medicines, maintenance, other) uses real data
- [ ] **FIN-04**: Net profit KPI calculated from real revenue minus real expenses
- [ ] **FIN-05**: Profit margin percentage calculated from real data
- [ ] **FIN-06**: Profit per bird calculated using real financial data and bird count from flocks

### Financial Charts

- [ ] **CHART-01**: Revenue vs Expenses area chart uses real Supabase data grouped by period
- [ ] **CHART-02**: Monthly summary bar chart (revenue, expenses, profit) uses real data
- [ ] **CHART-03**: Expense breakdown donut/pie chart uses real category data

### Transaction CRUD

- [ ] **CRUD-01**: User can view list of financial transactions filtered by selected date range
- [ ] **CRUD-02**: User can add a new financial transaction (type, category, amount, date, description, payment method)
- [ ] **CRUD-03**: User can edit an existing financial transaction
- [ ] **CRUD-04**: User can delete a financial transaction

### Revenue Auto-Sync

- [ ] **SYNC-01**: When a sale is recorded in the sales module, a corresponding revenue transaction is automatically created in `financial_transactions`
- [ ] **SYNC-02**: Auto-synced revenue transactions include a reference to the source sale to prevent double-counting

### Dashboard Widget

- [ ] **DASH-01**: Financial summary widget on main dashboard displays real data from Supabase instead of mock data

## v2 Requirements

### Advanced Analytics

- **ADV-01**: Cost per egg calculation (cross-table JOIN financial_transactions + egg_production)
- **ADV-02**: Auto-sync feed costs from feed_consumption to financial_transactions
- **ADV-03**: Revenue goal stored in database (currently hardcoded as R$20,000)
- **ADV-04**: Trend comparison with previous period

## Out of Scope

| Feature | Reason |
|---------|--------|
| Custom backend server | Supabase handles all backend needs |
| Payment provider integration | Not needed for MVP financial tracking |
| Invoice generation | Complexity beyond MVP scope |
| Multi-currency support | Brazilian market only (BRL) |
| Tax calculations | Farm-specific, too complex for MVP |
| UI redesign | Constraint: no UI changes this milestone |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Pending |
| FOUND-02 | Phase 1 | Pending |
| FOUND-03 | Phase 1 | Pending |
| FOUND-04 | Phase 1 | Pending |
| CAL-01 | Phase 2 | Pending |
| CAL-02 | Phase 2 | Pending |
| CAL-03 | Phase 2 | Pending |
| CAL-04 | Phase 2 | Pending |
| CAL-05 | Phase 2 | Pending |
| FIN-01 | Phase 3 | Pending |
| FIN-02 | Phase 3 | Pending |
| FIN-03 | Phase 3 | Pending |
| FIN-04 | Phase 3 | Pending |
| FIN-05 | Phase 3 | Pending |
| FIN-06 | Phase 3 | Pending |
| DASH-01 | Phase 3 | Pending |
| CHART-01 | Phase 4 | Pending |
| CHART-02 | Phase 4 | Pending |
| CHART-03 | Phase 4 | Pending |
| CRUD-01 | Phase 4 | Pending |
| CRUD-02 | Phase 4 | Pending |
| CRUD-03 | Phase 4 | Pending |
| CRUD-04 | Phase 4 | Pending |
| SYNC-01 | Phase 4 | Pending |
| SYNC-02 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 25 total
- Mapped to phases: 25
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-12*
*Last updated: 2026-04-11 after roadmap phase mapping*
