# Domain Pitfalls: Financial Module Integration (Granja Pro)

**Domain:** Poultry farm SaaS — adding financial management to an existing brownfield app
**Researched:** 2026-04-11
**Scope:** Supabase integration, data integrity, calendar/date filtering, finances page

---

## Critical Pitfalls

Mistakes that cause rewrites, silent data bugs, or broken UX.

---

### Pitfall 1: Finances Page Has Its Own Isolated `periodo` State — Not Connected to Shared Calendar

**What goes wrong:**
`finances/page.tsx` uses a local `const [periodo, setPeriodo] = useState<"dia" | "semana" | "mes">("mes")` with hardcoded 2024 dates for filtering mock data. When you wire up Supabase data, it is easy to connect to `getTransactionsByDateRange()` using this same local state instead of `useDateFilter()` from the shared context. The page will then show real data but be completely out of sync with every other dashboard page — the user changes the month in the top-level CalendarFilter and nothing on the finances page responds.

**Why it happens:**
The page predates the shared calendar. Its internal `periodo` toggle (`dia / semana / mes`) visually resembles the shared filter but is a separate mechanism. The mock data filtering uses string comparisons against `"2024-04-17"` (a hardcoded date), which makes the isolation invisible during development.

**Consequences:**
- User sees April data on all other pages but the finances page shows a different month
- Two competing UI controls for the same concept confuse farmers on mobile
- Fixing it later requires refactoring all derived metrics (`receitaPeriodo`, `lucroLiquido`, `margem`, `progressoMeta`, etc.) which are calculated inline from the filtered `periodoVendas` array

**Prevention:**
Remove `periodo` state and its toggle buttons from `finances/page.tsx`. Replace all date-range filtering with `const { dateRange } = useDateFilter()`. Pass `dateRange.startDate` and `dateRange.endDate` directly to `getTransactionsByDateRange()`. The shared CalendarFilter already lives in the layout — no new UI needed.

**Detection (warning sign):**
If you see `setPeriodo` or any `periodo === "dia"` checks still in the finances component after integration, the isolation bug is present.

**Phase:** Financial integration phase. Must be addressed before any Supabase query is wired up, not after.

---

### Pitfall 2: Revenue and Sales Are Two Separate Tables — Double-Counting Revenue

**What goes wrong:**
The schema has both `financial_transactions` (type = `'revenue'`) and `sales`. A sale in the `sales` table and a corresponding revenue entry in `financial_transactions` are not linked by foreign key. If the financial page pulls from `financial_transactions` for KPIs and the sales page pulls from `sales`, totals will diverge. Worse, if a developer adds a sale and also creates a `financial_transaction` of type `revenue` to "record the income," every sale is counted twice.

**Why it happens:**
The existing `sales` table already represents revenue (it has `total`, `payment_status`, `date`). The `financial_transactions` table was designed for general ledger entries. There is no enforced relationship or migration preventing dual-entry.

**Consequences:**
- Revenue KPIs on the finances page show double the actual income
- `lucroLiquido` (net profit) looks artificially high
- The `cost per egg` metric becomes meaningless
- Silent bug — no error thrown, everything just adds up wrong

**Prevention:**
Decide on the single source of truth **before** writing any query: either (a) revenue comes from `sales.total` aggregated by date, and `financial_transactions` is expenses-only, or (b) every sale automatically creates a `financial_transaction` via trigger and the finances page reads only `financial_transactions`. Option (a) is simpler for this project's current state. Document the decision in `docs/database.md`.

**Detection:**
Compare `SUM(sales.total)` for a date range against `SUM(financial_transactions.amount) WHERE type = 'revenue'` for the same range. If both are non-zero and close in value, double-counting is happening.

**Phase:** Financial integration phase, before any KPI queries are written.

---

### Pitfall 3: RLS Policies Use Subquery Pattern That Silently Returns Empty Results

**What goes wrong:**
The RLS policies on `financial_transactions` (and most other tables) use:
```sql
farm_id in (
  select id from public.farms where owner_id = auth.uid()
  union
  select farm_id from public.profiles where id = auth.uid()
)
```
If `profiles.farm_id` is `null` (user completed auth but hasn't finished onboarding), or if `auth.uid()` is called outside an authenticated Supabase client context (e.g., a server component using the wrong client factory), the subquery returns an empty set and every query returns zero rows. No error is thrown.

**Why it happens:**
Supabase RLS silently filters rather than erroring. A `null` `farm_id` in `profiles` means the union returns nothing for the second branch, and if `owner_id = auth.uid()` also misses (e.g., wrong auth context), every table returns `[]`. This is easy to mistake for "no data yet" during development when the finances table is empty anyway.

**Consequences:**
- The finances page shows all-zero KPIs even after transactions are inserted
- Developer inserts test rows directly in Supabase Studio (which bypasses RLS) and sees data, but the app shows nothing — confusing
- Hard to distinguish from "table is empty" without checking the auth context

**Prevention:**
Always retrieve `farm_id` from `useAuth().farm?.id` and assert it is defined before calling any service function. The pattern used in `racao/page.tsx` and `production/page.tsx` (`const { farm } = useAuth()` + early return if `!farm`) is correct — follow it exactly in the finances page. Never pass a placeholder string like `""` or `undefined` as `farmId`.

**Detection (warning sign):**
Supabase query returns `data: []` with `error: null` and the table is non-empty in Studio. Check that `auth.uid()` resolves correctly with `supabase.auth.getUser()` in the same session.

**Phase:** Financial integration phase. Apply the guard immediately when replacing mock data.

---

### Pitfall 4: Date Comparison Off-By-One When Using ISO Strings With `gte`/`lte`

**What goes wrong:**
`financial_transactions.date` is a PostgreSQL `date` type (no time component). The `DateFilterContext` computes dates via `new Date().toISOString().split("T")[0]`. On the user's device, `new Date()` reflects local time. In Brazil (UTC-3), `new Date()` at 11 PM on April 30 returns `"2026-05-01"` in ISO (UTC). The query then asks for May 1st, missing the entire day's data.

**Why it happens:**
`Date.toISOString()` always emits UTC. Brazilian farmers are UTC-3 or UTC-4 depending on daylight saving. An 11 PM entry on April 30 in Brasília is May 1 in UTC. The filter computes the wrong date string.

**Consequences:**
- End-of-day sales on April 30 vanish from the April filter
- "Today" filter shows 0 results after 9 PM local time even if transactions were recorded
- Inconsistency between what the farmer recorded and what the finance page shows

**Prevention:**
Generate date strings from local date parts, not from ISO:
```typescript
function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
```
Apply this fix inside `DateFilterContext.dateRange` computation. The existing `rangeStart.toISOString().split("T")[0]` pattern is the bug. This affects every page that uses `useDateFilter()`, not just finances.

**Detection:**
Test by setting local machine time to 22:00 on the last day of a month. If the "Mês" filter shows zero results for that month, the bug is active.

**Phase:** Calendar filter extraction/shared component phase. Fix it once in the context; all pages benefit.

---

### Pitfall 5: Replacing All Mock Data at Once Instead of Incrementally

**What goes wrong:**
`finances/page.tsx` has ~450 lines of intertwined mock data and derived state. Attempting to replace all mock arrays (`despesasMes`, `receitaDiaria`, `fluxoMensal`, `initialVendas`, etc.) simultaneously with Supabase queries in a single PR leads to a partially-broken state that is hard to debug — some charts reference stale mock state while others reference live queries, and loading states are not handled consistently.

**Why it happens:**
Each mock array feeds multiple derived values and chart components. They are not isolated — `despesasMes` feeds the pie chart AND the expense KPI card AND the `custoOvo` calculation. Replacing one breaks the others.

**Consequences:**
- Charts render with `undefined` data and crash (Recharts does not gracefully handle `undefined` in data arrays without guards)
- KPI cards show `NaN` or `Infinity` (e.g., `despesaPeriodo / (volumeTotal * 12)` when `volumeTotal` is 0)
- Loading states cause layout shift on the already-built mobile UI

**Prevention:**
Follow an incremental replacement order:
1. Wire up `financial_transactions` queries first (expenses + revenue KPIs)
2. Wire up `sales` queries for the transactions table and revenue breakdown
3. Replace chart data last, only after KPIs are verified correct
Add `|| []` fallbacks and null-checks before every `.reduce()` and division operation.

**Detection (warning sign):**
Any `NaN`, `Infinity`, or blank chart area visible after partial data wiring.

**Phase:** Financial integration phase. Create a single focused PR per section of the page.

---

## Moderate Pitfalls

---

### Pitfall 6: `getFinancialSummary` Categories Are Hardcoded English Strings

**What goes wrong:**
`lib/services/finances.ts` filters expenses by `t.category === "feed"` and `t.category === "labor"`. The UI mock data uses Portuguese categories: `"Ração"`, `"Funcionários"`, `"Energia"`. If the real `financial_transactions` rows use Portuguese category values (which is likely, since the UI is entirely in Portuguese), `feedCost` and `laborCost` in `getFinancialSummary` always return 0 and `otherExpenses` absorbs everything.

**Prevention:**
Standardize category values. Either: (a) store English enum keys (`feed`, `labor`, `energy`) and translate only in the display layer, or (b) update `getFinancialSummary` to use Portuguese strings matching the actual inserted data. Document the canonical category list in `docs/database.md`.

**Phase:** Financial integration phase, before inserting any seed/test data.

---

### Pitfall 7: `total` Column in `sales` Can Drift From `quantity * unit_price`

**What goes wrong:**
`sales.total` is a stored column, not a computed one. If someone updates `unit_price` without recalculating `total`, the stored total is wrong. The finances page will show one revenue number while manual calculation of `quantity * unit_price` gives another.

**Prevention:**
Either add a database trigger to auto-compute `total = quantity * unit_price` on insert/update, or always set `total` in the service layer as `Math.round(quantity * unit_price * 100) / 100` before inserting. Never let the client pass a freeform `total`.

**Phase:** Sales service layer (existing module). Verify before plugging `sales` into financial KPIs.

---

### Pitfall 8: `useDateFilter` Context Is Not Present If Page Is Rendered Outside Dashboard Layout

**What goes wrong:**
`DateFilterProvider` is mounted in `app/dashboard/layout.tsx`. Any page outside that layout (e.g., a future `/reports` page or a shared link) that tries to call `useDateFilter()` will throw `"useDateFilter must be used within DateFilterProvider"`. This is already guarded by the throw in the hook, but it means the finances page cannot be extracted to a standalone route without restructuring the provider.

**Prevention:**
Keep all financial pages inside the `/dashboard` route tree. If a standalone financial report page is needed in the future, wrap it in `<DateFilterProvider>` locally rather than moving the global one.

**Phase:** Not an immediate risk. Flag if the roadmap ever adds routes outside `/dashboard`.

---

## Minor Pitfalls

---

### Pitfall 9: Recharts Does Not Handle `null`/`undefined` in Data Arrays Gracefully

**What goes wrong:**
If a Supabase query returns fewer data points than the chart expects (e.g., only 3 months of data in a 12-month bar chart), Recharts renders missing bars as zero-height rather than erroring, but if the data array itself is `undefined` (query not yet resolved), Recharts crashes with a runtime error.

**Prevention:**
Always initialize chart data state as `[]` (empty array), never `undefined` or `null`. Add `data={chartData ?? []}` defensively on every `<BarChart>`, `<AreaChart>`, and `<PieChart>`.

---

### Pitfall 10: `totalAves` Is Hardcoded as `2851`

**What goes wrong:**
`finances/page.tsx` line 205: `const totalAves = 2851`. This feeds `lucroPorAve`. With live data, the actual bird count may differ. The metric will be silently wrong.

**Prevention:**
Fetch the real bird count from `useAuth().farm?.total_birds` or sum from active flocks. The `useAuth()` hook already provides the `farm` object which includes `total_birds`.

---

### Pitfall 11: `metaReceita` Is Hardcoded as `20000`

**What goes wrong:**
The revenue goal progress bar uses `const metaReceita = 20000`. This is a hardcoded BRL value that may be meaningless for farms of different sizes.

**Prevention:**
Defer goal-setting to a future milestone. For now, either remove the goal progress UI or use a configurable value from `farms` table settings. Do not invent a fake goal for real data.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Replace mock data with Supabase queries | Double-counting revenue from `sales` + `financial_transactions` | Decide single source of truth first; document it |
| Wire up KPI cards | `NaN`/`Infinity` when volume or bird count is zero | Add zero-guards before every division |
| Connect to shared calendar filter | `periodo` local state conflicts with `useDateFilter()` | Remove `periodo` state entirely; use only the shared context |
| Date range filtering | UTC vs local time off-by-one on end-of-day | Replace `toISOString().split("T")[0]` with local date string builder |
| Category breakdown charts | English category keys vs Portuguese strings | Standardize category enum before inserting any real data |
| Revenue KPIs | Stale `totalAves = 2851` hardcode | Pull from `useAuth().farm?.total_birds` |

---

## Sources

- Direct inspection of `app/dashboard/finances/page.tsx` (mock data structure, isolated `periodo` state, hardcoded dates and values)
- `lib/services/finances.ts` (hardcoded English category strings, `getMonthlyFinancials` signature)
- `supabase/schema.sql` lines 418–520 (`financial_transactions` schema, RLS policies, `sales` schema)
- `components/date-filter/date-filter-context.tsx` (ISO string date computation, UTC risk)
- `components/auth/auth-provider.tsx` (`farm?.total_birds` availability)
- `app/dashboard/layout.tsx` (DateFilterProvider scope)
- Pattern observed in `racao/page.tsx` and `production/page.tsx` (correct `useAuth` + `useDateFilter` usage)
