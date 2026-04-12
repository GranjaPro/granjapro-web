# Feature Landscape — Financial Module

**Domain:** Poultry egg farm management SaaS (financial module)
**Project:** Granja Pro
**Researched:** 2026-04-11
**Confidence:** HIGH (based on existing codebase, schema, service layer, and mock UI patterns)

---

## Context

The finances page (`app/dashboard/finances/page.tsx`) already exists as a complete UI with hardcoded mock data.
The service layer (`lib/services/finances.ts`) already has full CRUD against the `financial_transactions` table.
The database schema (`financial_transactions`) is already defined and RLS-protected.

The milestone work is **data integration** — replacing mock data with real Supabase queries — not building new features from scratch. This shapes which features are "table stakes now" vs "differentiators to build later."

---

## Table Stakes

Features users expect. Missing = the financial page is useless and farmers stop trusting the tool.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Monthly revenue total | Core KPI — did I make money this month? | Low | Already computed in `getFinancialSummary()`, just needs wiring |
| Monthly expenses total | Core KPI — what did I spend? | Low | Same service function |
| Monthly profit / loss | Revenue minus expenses — the bottom line | Low | Computed as `profit` in service layer |
| Expense by category breakdown | Feed, labor, energy, medicines, maintenance — farmer needs to know where money goes | Medium | Categories already exist in mock: Ração, Funcionários, Energia, Água, Medicamentos, Manutenção, Outros |
| Cash flow chart (revenue vs expense over time) | Farmers need to see if a month was profitable daily/weekly | Medium | `receitaDiaria` mock shows day-by-day area chart already in UI |
| Add / edit / delete transaction | Manual entry of expenses and income that aren't auto-generated | Medium | `createTransaction`, `updateTransaction`, `deleteTransaction` all exist in service layer |
| Cost per egg | Key poultry metric — total expenses ÷ eggs produced | Medium | Computed in mock as `custoOvo`; requires joining with `egg_production` table |
| Period filter (today / week / month) | Farmers check daily, weekly, and monthly in different contexts | Low | `periodo` state already drives the mock data selection |
| Revenue from egg sales | Primary revenue source — must auto-pull from `sales` table | Medium | Not yet connected; `sales` records have `total` and `date` |
| Transaction list with search | Farmer needs to find a specific transaction | Low | Search already built in UI against mock vendas list |

---

## Differentiators

Features that set Granja Pro apart. Not expected on day one, but high-value for retention and upgrade.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Revenue goal progress bar | Motivational — farmer sees % progress toward monthly target | Low | `metaReceita` and `progressoMeta` already in mock; needs editable goal stored per farm |
| Profit per bird | `lucro ÷ total_birds` — lets multi-barn farms see productivity in financial terms | Low | Already in mock as `lucroPorAve`; just needs real data wired in |
| Revenue breakdown by customer | Which customer generates most revenue? | Medium | `receitaPorCliente` already computed in mock; needs real sales data |
| Revenue breakdown by barn | Which barn is most profitable? | Medium | `receitaPorGalpao` in mock; requires barn join on sales |
| Revenue breakdown by flock | Which flock/lot is most profitable? | Medium | `receitaPorLote` in mock; requires flock join on sales |
| Year-over-year monthly comparison | Is the farm improving vs last year? | High | Requires multi-year data — defer until farmers have 12+ months of history |
| Egg price history trend | Price fluctuation over months — helps negotiate with buyers | Medium | `historicoPreco` in mock; needs derived from sales average unit price |
| Feed cost as % of total expenses | Industry benchmark: feed should be ~50-60% of costs | Low | Derivable from category totals once real data flows |
| Monthly cash flow table (revenue/expense/profit per month) | Running view of the year at a glance | Medium | `fluxoMensal` in mock; requires 12-month aggregate query |
| Auto-sync feed costs from feed_consumption | Reduce double-entry: feed records already have cost; create financial_transaction automatically | High | Requires a trigger or background sync — architectural decision needed |
| Auto-sync sales revenue from sales table | Same as above for egg sales | High | Same concern — avoid double-entry but keep financial_transactions as source of truth |

---

## Anti-Features

Features to explicitly NOT build in this milestone.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Accounts payable / receivable aging | This is accounting software territory; overkill for small egg farms | Use `payment_status` on sales (pending/paid/overdue) — already in schema |
| Multi-currency support | All target users are Brazilian, BRL only | Hard-code BRL, use `formatCurrency` util already in place |
| Tax calculation (DAS, Simples Nacional) | Requires Brazilian tax law knowledge and changes; out of scope | Farmer manages tax with accountant; Granja Pro gives the numbers, not the tax |
| Invoice generation / NF-e emission | Complex legal/technical requirement (SEFAZ integration) | Mark as future Pro tier feature |
| Budget planning / forecasting | Requires historical data that new users don't have | Defer until after 3+ months of data accumulates |
| Double-entry bookkeeping | Farmers are not accountants; complexity kills usability | Single-entry: one transaction = one record |
| Bank account integration (Open Finance) | Complex OAuth + bank API maintenance; no existing pattern in stack | Defer to Pro tier with dedicated integration milestone |
| PDF/Excel export of financial reports | Marked as Pro feature in PROJECT.md | Gate behind upgrade prompt; do not build now |
| Worker payroll management | Marked as deferred Pro feature in PROJECT.md | Show labor as a single expense category, not itemized payroll |
| Fixed vs variable cost categorization | Accounting concept too abstract for the target user | Keep flat category list: Ração, Funcionários, Energia, Água, Medicamentos, Manutenção, Outros |

---

## Feature Dependencies

```
financial_transactions (Supabase) → All KPI cards (revenue, expenses, profit)
financial_transactions → Cash flow chart
financial_transactions (category=feed) → Feed cost breakdown
sales table → Revenue from egg sales (if auto-synced)
egg_production table → Cost per egg calculation
farms.total_birds → Profit per bird calculation
farms table → Revenue goal (needs goal column or separate config)

Period filter state → Expense breakdown
Period filter state → Cash flow chart
Period filter state → Revenue/expenses/profit KPIs
Period filter state → Transaction list

[future] feed_consumption.cost → financial_transactions auto-insert (avoids double-entry)
[future] sales.total → financial_transactions auto-insert (avoids double-entry)
```

---

## MVP Recommendation for This Milestone

The goal is to connect the existing UI to real data — not to redesign or expand features.

**Build now (wire real data):**
1. Monthly revenue total — pull from `financial_transactions WHERE type = 'revenue'`
2. Monthly expenses total — pull from `financial_transactions WHERE type = 'expense'`
3. Monthly profit — computed from (1) and (2)
4. Expense by category breakdown — GROUP BY category WHERE type = 'expense'
5. Cash flow chart — GROUP BY date within selected period, sum revenue and expense
6. Transaction list with search — paginated query with client-side search
7. Add / edit / delete transaction — wire existing modal forms to service layer CRUD
8. Period filter — map UI periodo state to `getTransactionsByDateRange()` calls
9. Cost per egg — join financial_transactions expenses with egg_production COUNT for the same period

**Defer (next milestone):**
- Revenue goal (needs schema change — goal column on farms or separate table)
- Auto-sync from sales/feed_consumption (architectural decision: avoid dual writes)
- Year-over-year comparison (needs historical data)
- Customer/barn/flock revenue breakdowns (needs JOIN to sales, useful but not blocking)

**Defer indefinitely (Pro tier):**
- Export (PDF/Excel)
- Invoice generation
- Bank integration
- Payroll

---

## Expense Category Conventions

The mock UI and project domain both converge on these 7 categories. Use these as the canonical set:

| Category Key (DB) | Display Label (PT-BR) | Icon | Color |
|-------------------|-----------------------|------|-------|
| `feed` | Ração | Wheat | amber |
| `labor` | Funcionários | Users | blue |
| `energy` | Energia | Zap | orange |
| `water` | Água | Droplets | cyan |
| `medicines` | Medicamentos | Pill | red |
| `maintenance` | Manutenção | Wrench | purple |
| `other` | Outros | MoreHorizontal | gray |

Revenue categories:

| Category Key (DB) | Display Label (PT-BR) |
|-------------------|-----------------------|
| `egg_sales` | Venda de Ovos |
| `other_income` | Outras Receitas |

---

## Sources

- `app/dashboard/finances/page.tsx` — existing UI with mock data revealing intended feature set (HIGH confidence)
- `lib/services/finances.ts` — service layer revealing data model assumptions (HIGH confidence)
- `supabase/migrations/00001_initial_schema.sql` — `financial_transactions` table schema (HIGH confidence)
- `docs/mvp.md` — Financial Management section defining revenue/expense categories (HIGH confidence)
- `.planning/PROJECT.md` — Active/Out of Scope requirements and constraints (HIGH confidence)
