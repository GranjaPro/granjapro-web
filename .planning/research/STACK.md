# Technology Stack

**Project:** Granja Pro — Finances Module + Calendar Sync
**Researched:** 2026-04-11
**Scope:** Subsequent milestone — existing Next.js 15 + Supabase + TailwindCSS + Recharts stack. Do not re-research the base stack. Focus on what completes the finances module and calendar sync.

---

## Existing Stack (Do Not Change)

| Technology | Version (package.json) | Role |
|------------|------------------------|------|
| Next.js | ^15.5.14 | App framework, App Router |
| React | ^19.0.0 | UI runtime |
| TypeScript | ^5 | Type safety |
| TailwindCSS | ^3.4.1 | Styling |
| @supabase/supabase-js | ^2.99.3 | DB client, auth, realtime |
| @supabase/ssr | ^0.9.0 | SSR-safe Supabase client (Next.js) |
| Recharts | ^3.8.0 | All charts (project rule: mandatory) |
| lucide-react | ^0.460.0 | Icons |

**Confidence:** HIGH — read directly from `package.json`.

---

## Recommended Stack for This Milestone

### No new dependencies needed.

Every requirement for the finances module and calendar sync can be satisfied with what is already installed. Adding new libraries would violate the "avoid overengineering, prefer minimal implementations" constraint stated in PROJECT.md.

---

## Finances Module: Patterns to Use

### Data Fetching Pattern (established in codebase)

The production, mortality, racao, health, and sales pages all follow the same pattern. Finances must follow it exactly.

```typescript
// Pattern: useCallback + useEffect + dateRange dependency
const { dateRange } = useDateFilter(); // from @/components/date-filter

const fetchData = useCallback(async () => {
  if (!farm) { setLoading(false); return; }
  setLoading(true);
  const supabase = createClient(); // from @/lib/supabase/client

  const { startDate, endDate } = dateRange;

  const { data, error } = await supabase
    .from("financial_transactions")
    .select("*")
    .eq("farm_id", farm.id)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: false });

  if (error) { setLoading(false); return; }
  setTransactions(data ?? []);
  setLoading(false);
}, [farm, dateRange]);

useEffect(() => { fetchData(); }, [fetchData]);
```

**Why this pattern:** Every existing module uses it. Deviating creates inconsistency and maintenance burden. The `useCallback` + `useEffect` chain ensures re-fetch fires whenever `dateRange` changes (i.e., whenever the shared calendar filter changes).

**Confidence:** HIGH — verified by reading production, mortality, racao, health, sales pages.

### Supabase Service Layer (lib/services/finances.ts)

A `finances.ts` service already exists at `lib/services/finances.ts` with:
- `getMonthlyFinancials(farmId, year, month)` — month-scoped
- `getFinancialSummary(farmId, year, month)` — aggregated KPIs
- `getTransactionsByDateRange(farmId, startDate, endDate)` — range-scoped
- `createTransaction(record)`, `updateTransaction(id, updates)`, `deleteTransaction(id)` — CRUD

**Gap:** The service functions use `any` types instead of the typed `financial_transactions` row from `database.types.ts`. This should be fixed during implementation to use `Database["public"]["Tables"]["financial_transactions"]["Row"]`.

**Gap:** `getFinancialSummary` only handles month scope. A `getFinancialSummaryByRange(farmId, startDate, endDate)` is needed to support the date-range and single-day filter modes from the shared calendar.

**Confidence:** HIGH — read directly from `lib/services/finances.ts` and `lib/database.types.ts`.

### financial_transactions Table Schema

```typescript
// From lib/database.types.ts
{
  id: string;
  created_at: string;
  farm_id: string;
  date: string;               // ISO date string, used for .gte/.lte filtering
  type: "revenue" | "expense";
  category: string;           // "feed", "labor", "medicines", "utilities", "maintenance", etc.
  description: string;
  amount: number;
  payment_method: string | null;
  reference: string | null;
}
```

**Note:** The `category` field is a plain string, not an enum in the DB schema. The finances page's expense breakdown by category (Ração, Funcionários, Energia, etc.) must be driven by matching against known category strings. This is fragile — a constants file for category keys should be created to avoid typos across service and component code.

**Confidence:** HIGH — read from `lib/database.types.ts`.

### Revenue Calculation Strategy

The finances page shows revenue from `financial_transactions` (type = "revenue"). The `sales` table also tracks egg sales. These are separate concerns:

- `sales` table: individual sale records with customer, quantity, price, payment status
- `financial_transactions` table: general income/expense ledger

**Do not join or cross-query them for the finances charts.** The finances page should read only `financial_transactions`. Sales with payment status can optionally create a corresponding `financial_transactions` entry (as a future automation), but for this milestone, treat them as independent.

**Confidence:** MEDIUM — inferred from schema design; no explicit linking column observed between `sales` and `financial_transactions`.

---

## Calendar Sync: Patterns to Use

### DateFilterProvider (already implemented)

`components/date-filter/date-filter-context.tsx` is fully implemented and already wraps the entire dashboard via `app/dashboard/layout.tsx`. It provides:

- `filterMode`: `"dia" | "intervalo" | "mes"`
- `dateRange`: `{ startDate: string; endDate: string }` — ISO date strings ready for Supabase `.gte`/`.lte` queries
- `CalendarFilter` component: renders the date picker UI

**The finances page is the only dashboard page NOT consuming `useDateFilter`.** It has its own local `periodo` state (`"dia" | "semana" | "mes"`) that is disconnected from the shared context.

**Fix:** Remove local `periodo` state from `finances/page.tsx`. Replace with `const { dateRange } = useDateFilter()` and wire all data fetching and chart display to `dateRange.startDate` / `dateRange.endDate`.

**Confidence:** HIGH — verified by reading `date-filter-context.tsx`, `app/dashboard/layout.tsx` (DateFilterProvider wraps all children), and confirmed finances page does NOT import from `@/components/date-filter`.

### Pages Already Using Calendar Sync

These pages correctly implement the shared calendar pattern — use them as reference implementations:

| Page | File |
|------|------|
| Production | `app/dashboard/production/page.tsx` |
| Mortality | `app/dashboard/mortality/page.tsx` |
| Feed (Racao) | `app/dashboard/racao/page.tsx` |
| Health | `app/dashboard/health/page.tsx` |
| Sales | `app/dashboard/sales/page.tsx` |
| Customers | `app/dashboard/customers/page.tsx` |
| Main Dashboard | `app/dashboard/page.tsx` |

---

## Supabase Client Pattern

The project uses a singleton browser client:

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";
let client: SupabaseClient | null = null;
export function createClient() {
  if (client) return client;
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
  );
  return client;
}
```

All client-side data fetching calls `createClient()` directly in the component (not via the service layer, in most existing pages). Both approaches are used — inline `createClient()` in components (production, mortality, etc.) and service functions in `lib/services/`. Either is fine; the inline approach avoids an extra function call layer and matches existing code in most pages.

**Recommendation:** For the finances page, use `createClient()` inline in the component's `fetchData` callback, consistent with how production, mortality, and other heavy pages do it. Use `lib/services/finances.ts` only for the simpler CRUD operations (createTransaction, updateTransaction, deleteTransaction).

**Confidence:** HIGH — read from `lib/supabase/client.ts` and multiple page implementations.

---

## What NOT to Use

| Library/Approach | Why Not |
|------------------|---------|
| React Query / TanStack Query | Not in project. All existing data fetching uses `useEffect` + `useCallback`. Introducing a data-fetching library now creates inconsistency across the codebase. |
| SWR | Same reason as above. |
| Zustand / Redux | State is local to each page component. No global financial state is needed beyond `DateFilterContext` which already exists. |
| date-fns / day.js | Not installed. The `dateRange` from `DateFilterProvider` already outputs ISO strings. No date manipulation library needed — use native `Date` and `toISOString().split("T")[0]` as the rest of the codebase does. |
| Supabase Realtime subscriptions | Out of scope for this milestone. Finances data does not need live updates. Adds complexity without value. |
| Supabase Edge Functions | Out of scope. All finance logic (aggregations, summaries) can be done client-side in JavaScript after fetching the raw transactions. The dataset per farm per month is small (< 200 records typically). |
| shadcn/ui date pickers | Not installed. The project has a custom `CalendarFilter` component that already handles all date selection needs. |
| Chart.js / Victory / Nivo | Recharts is mandatory per project rules. |

---

## Derived KPIs (Client-Side Computation)

These KPIs shown on the finances page must be computed from raw `financial_transactions` data in the component, not fetched as pre-aggregated values:

| KPI | Computation |
|-----|-------------|
| Total Revenue | `transactions.filter(t => t.type === "revenue").reduce(sum + t.amount, 0)` |
| Total Expenses | `transactions.filter(t => t.type === "expense").reduce(sum + t.amount, 0)` |
| Net Profit | Revenue - Expenses |
| Expense by Category | Group by `t.category`, sum amounts per group |
| Revenue vs Expense by period | Group transactions by date bucket (day/week/month) for chart series |

**Why client-side:** The transaction count per farm per month is small. PostgreSQL aggregate views or RPC functions are not needed and would add schema complexity. `useMemo` in React is sufficient.

**Confidence:** HIGH — consistent with how all other pages compute their KPIs from raw Supabase data.

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Data fetching | `useEffect` + `useCallback` (existing pattern) | TanStack Query | Inconsistency with rest of codebase |
| Date filtering | `useDateFilter()` shared context (existing) | Local `periodo` state (current finances page) | Defeats calendar sync requirement |
| Aggregation | Client-side `useMemo` | Supabase RPC / Views | Overkill for small dataset; adds schema changes |
| Category constants | `const CATEGORIES = { FEED: "feed", ... }` | Inline strings | Prevents typo bugs across component and service layer |

---

## Sources

- `package.json` — dependency versions (HIGH confidence)
- `lib/database.types.ts` — financial_transactions schema (HIGH confidence)
- `lib/services/finances.ts` — existing service layer (HIGH confidence)
- `components/date-filter/date-filter-context.tsx` — shared calendar context (HIGH confidence)
- `components/date-filter/calendar-filter.tsx` — CalendarFilter component (HIGH confidence)
- `app/dashboard/layout.tsx` — DateFilterProvider scope (HIGH confidence)
- `app/dashboard/production/page.tsx` — reference data fetching pattern (HIGH confidence)
- `app/dashboard/finances/page.tsx` — current mock-only implementation (HIGH confidence)
