# Architecture Patterns: Financial Module Integration

**Domain:** Poultry farm management SaaS — financial module
**Researched:** 2026-04-11
**Confidence:** HIGH (based on direct codebase inspection)

---

## Existing Architecture Overview

GranjaPro uses a flat, file-based service layer pattern — no Redux, no Zustand, no React Query. Each page is a large `"use client"` component that calls service functions directly. The service functions are thin wrappers over the Supabase JS client.

```
Browser
  └── Next.js "use client" Page Component
        ├── useAuth()  →  farm_id, user, profile
        ├── useDateFilter()  →  { startDate, endDate }
        └── lib/services/[module].ts  →  Supabase client  →  PostgreSQL
```

`DateFilterProvider` wraps the entire dashboard shell in `app/dashboard/layout.tsx`, so every child page can call `useDateFilter()` to get ISO date strings without any prop drilling.

RLS is the sole authorization layer. There is no server-side middleware enforcing farm ownership beyond what RLS policies do. The client-side `supabase/client.ts` (browser client) is used in all service files. The server client (`supabase/server.ts`) is available but not yet used by financial services.

---

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `app/dashboard/finances/page.tsx` | All financial UI — KPI cards, charts, transaction table, modals | `lib/services/finances.ts`, `useAuth`, `useDateFilter` |
| `lib/services/finances.ts` | CRUD + aggregation against `financial_transactions` | Supabase client, `financial_transactions` table |
| `lib/services/sales.ts` | CRUD on `sales` table, joins `customers` | Supabase client, `sales` + `customers` tables |
| `lib/services/feed.ts` | CRUD on `feed_consumption`, joins `barns` | Supabase client, `feed_consumption` table |
| `lib/services/production.ts` | CRUD on `egg_production` | Supabase client, `egg_production` table |
| `components/date-filter/date-filter-context.tsx` | Global date range state (dia / intervalo / mes modes) | Consumed by every dashboard page |
| `components/dashboard/financial-summary.tsx` | Dashboard widget showing revenue/expenses/profit | Currently hardcoded with `mock-data.ts` — needs wiring |
| `lib/services/index.ts` | Re-exports all service modules | Used by pages as the import boundary |

---

## Data Flow

### Current (Mock) Flow

```
finances/page.tsx
  └── Renders initialVendas (hardcoded array)
  └── Renders despesasMes / receitaDiaria (hardcoded arrays)
  └── No Supabase calls in the page component itself
```

### Target (Live) Flow

```
User opens /dashboard/finances
  │
  ├── useAuth() resolves farm_id
  ├── useDateFilter() resolves { startDate, endDate }
  │
  ├── getTransactionsByDateRange(farm_id, startDate, endDate)
  │     └── SELECT * FROM financial_transactions
  │           WHERE farm_id = $1 AND date BETWEEN $2 AND $3
  │           (RLS enforces farm_id match via owner_id or profiles.farm_id)
  │
  ├── getSalesByDateRange(farm_id, startDate, endDate)
  │     └── SELECT *, customers(name) FROM sales
  │           WHERE farm_id = $1 AND date BETWEEN $2 AND $3
  │
  ├── getFeedByDateRange(farm_id, startDate, endDate)
  │     └── SELECT *, barns(name) FROM feed_consumption
  │           WHERE farm_id = $1 AND date BETWEEN $2 AND $3
  │
  └── Client-side aggregation:
        revenue   = SUM(amount) WHERE type='revenue'
        expenses  = SUM(amount) WHERE type='expense'
        feedCost  = SUM(amount) WHERE type='expense' AND category='feed'
        profit    = revenue - expenses
        costPerEgg = feedCost / eggs_produced (requires joining egg_production)
```

### Cross-Table Derivations

The `financial_transactions` table is the authoritative ledger. However, two other tables contain financial data that must be reconciled:

- `feed_consumption.cost` — feed spend already tracked operationally. When a feed record is created, it should either auto-create a corresponding `financial_transactions` row (type='expense', category='feed') or the finances page should sum both sources. Currently there is no trigger or service logic doing this — both flows are independent.
- `sales.total` — revenue from egg sales. Same problem: `sales` has `total` and `payment_status`, but `financial_transactions` is a separate table. A sale record does not automatically create a transaction row.

**Decision required before build:** choose one of:
1. **Dual-write** — when creating a sale or feed record, also insert into `financial_transactions`. Keep both tables as sources of truth for their own UI but the ledger is always in sync.
2. **Single source with views** — `financial_transactions` is the only ledger; the finances page queries it exclusively. Sales and feed pages stay independent.
3. **Derived aggregation** — finances page queries `financial_transactions` for manual entries AND joins `sales`/`feed_consumption` for auto-calculated totals, merging in the client. No dual-write needed but aggregation is more complex.

The existing `lib/services/finances.ts` is written for option 2 (queries only `financial_transactions`). The finances page UI currently shows a sales table that structurally mirrors `sales`, not `financial_transactions`. This mismatch must be resolved.

---

## RLS Pattern (Existing, Verified)

Every operational table uses the same two-clause RLS select policy:

```sql
-- Pattern replicated across all tables
CREATE POLICY "Users can view [table] of their farm" ON public.[table]
FOR SELECT USING (
  farm_id IN (
    SELECT id FROM public.farms WHERE owner_id = auth.uid()
    UNION
    SELECT farm_id FROM public.profiles WHERE id = auth.uid()
  )
);
```

Insert policies are stricter — only farm owners can insert:

```sql
CREATE POLICY "Users can insert [table] in their farm" ON public.[table]
FOR INSERT WITH CHECK (
  farm_id IN (SELECT id FROM public.farms WHERE owner_id = auth.uid())
);
```

`financial_transactions` already has all four policies (SELECT, INSERT, UPDATE, DELETE) defined in migration `00001_initial_schema.sql`. No new migration is needed for RLS on this table.

---

## financial_transactions Schema (Confirmed)

```sql
financial_transactions (
  id              uuid  PRIMARY KEY,
  created_at      timestamptz DEFAULT now(),
  farm_id         uuid  REFERENCES farms ON DELETE CASCADE NOT NULL,
  date            date  NOT NULL,
  type            text  CHECK (type IN ('revenue', 'expense')) NOT NULL,
  category        text  NOT NULL,
  description     text  NOT NULL,
  amount          numeric(12,2) NOT NULL,
  payment_method  text,
  reference       text   -- free-form: could link to sales.id or feed_consumption.id
)
```

The `reference` column is available as a soft foreign key to `sales.id` or `feed_consumption.id` if dual-write is chosen. There is no hard FK constraint on it today.

Index: `idx_financial_farm_date ON financial_transactions(farm_id, date)` — already exists.

---

## Patterns to Follow

### Pattern 1: Service Function + Direct State (No Hooks Library)
All existing modules use the same pattern. The finances integration must match it exactly.

```typescript
// In finances/page.tsx
const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
const [loading, setLoading] = useState(true);
const { farm } = useAuth();
const { dateRange } = useDateFilter();

useEffect(() => {
  if (!farm?.id) return;
  setLoading(true);
  getTransactionsByDateRange(farm.id, dateRange.startDate, dateRange.endDate)
    .then(setTransactions)
    .catch(console.error)
    .finally(() => setLoading(false));
}, [farm?.id, dateRange.startDate, dateRange.endDate]);
```

### Pattern 2: farm_id Always from useAuth
Every service call receives `farm_id` from `useAuth().farm.id`. Never derive it from URL params or local storage. This is consistent across all existing pages (production, feed, mortality, sales).

### Pattern 3: Date Filtering via useDateFilter Context
The `DateFilterProvider` is already mounted at layout level. The finances page must consume `useDateFilter()` and react to `dateRange` changes — the same way production and feed pages do. The finances page currently has its own local period toggle (dia/semana/mes) in the mock UI. That local state must be replaced with the shared context.

### Pattern 4: Aggregation in Service Layer, Not Page
`getFinancialSummary()` in `lib/services/finances.ts` already does the right thing — it filters and reduces in JavaScript after fetching. Keep aggregation in the service file, not scattered in the page component.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Re-implementing Date Filtering Locally
**What happens:** The finances page currently has its own local period toggle. If this is kept instead of replaced with `useDateFilter()`, the shared calendar in the dashboard header will not affect the finances page, breaking the cross-page sync requirement.

**Instead:** Remove local period state in the page. Consume `useDateFilter()` from context.

### Anti-Pattern 2: Displaying sales Table Data in Finances UI as if it Were financial_transactions
**What happens:** The current mock UI shows a "Vendas" table with fields (cliente, lote, galpão) that map to the `sales` table, not `financial_transactions`. If the page is wired to `financial_transactions` directly, those fields don't exist.

**Instead:** Decide which table the finances transaction list reads from before building. Either wire the list to `sales` (for revenue rows) and a separate query for expenses, or migrate to querying `financial_transactions` exclusively and update the UI columns to match its schema (type, category, description, amount, payment_method).

### Anti-Pattern 3: Adding a New API Route or Edge Function for Simple Aggregation
**What happens:** Supabase client-side queries with farm_id + date range are sufficient and already RLS-protected. Adding a Next.js route handler or Edge Function for financial summaries adds complexity with no security benefit given existing RLS.

**Instead:** Keep all financial queries in `lib/services/finances.ts` using the browser Supabase client, consistent with every other module.

### Anti-Pattern 4: Trying to Join financial_transactions with sales or feed_consumption in One Query
**What happens:** The tables have no FK relationship at the database level (only the soft `reference` text column). Attempting a Supabase `.select()` join across them will fail or produce incorrect results.

**Instead:** Fetch each table separately and merge in the client, or use a Supabase SQL view (new migration required).

---

## Build Order (Dependencies)

```
1. Decide data source strategy (financial_transactions only vs. join with sales/feed)
   └── Blocks: everything else

2. Wire getTransactionsByDateRange + createTransaction + updateTransaction + deleteTransaction
   (lib/services/finances.ts already has all CRUD — just needs page wiring)
   └── Blocks: finances page live data

3. Replace local period toggle in finances/page.tsx with useDateFilter() context
   └── Blocks: shared calendar sync requirement

4. Wire financial-summary.tsx dashboard widget to use getFinancialSummary()
   (currently uses mock-data.ts)
   └── Depends on: step 2
   └── Blocks: accurate KPIs on main dashboard

5. (Optional) Add migration for financial_transactions.flock_id or sales_id FK
   if dual-write pattern is chosen
   └── Depends on: step 1 decision
```

Step 1 is the only architectural decision gate. Steps 2-4 are straightforward wiring tasks once the strategy is set. No new tables, no new RLS policies, and no new service files are required.

---

## Scalability Considerations

| Concern | Now (small farm) | At scale (many farms, years of data) |
|---------|-----------------|--------------------------------------|
| Query performance | farm_id+date index is sufficient | Index already exists, partitioning by date can be added later |
| Aggregation | Client-side reduce is fine for months of data | Move to Postgres aggregate query or materialized view if >10k rows/farm |
| Cross-table joins | Client merge is acceptable | SQL view in Supabase avoids N+1 across tables |

---

## Sources

- Direct inspection: `supabase/migrations/00001_initial_schema.sql` (RLS policies, table schema, indexes)
- Direct inspection: `lib/services/finances.ts` (existing service layer)
- Direct inspection: `lib/database.types.ts` (TypeScript schema for all tables)
- Direct inspection: `app/dashboard/finances/page.tsx` (current mock UI structure)
- Direct inspection: `app/dashboard/layout.tsx` (DateFilterProvider scope, auth context usage)
- Direct inspection: `components/date-filter/date-filter-context.tsx` (shared filter contract)
- Direct inspection: `components/dashboard/financial-summary.tsx` (dashboard widget still on mock-data)
