# Phase 4: Charts, CRUD & Revenue Sync - Research

**Researched:** 2026-04-13
**Domain:** Recharts data wiring, Supabase CRUD integration, cross-table auto-sync
**Confidence:** HIGH

## Summary

Phase 4 is the final phase of the MVP milestone. It covers three distinct work areas: (1) replacing mock chart data with real Supabase queries grouped by time period, (2) wiring the existing transaction CRUD modal to actual Supabase service functions instead of local state manipulation, and (3) creating an auto-sync mechanism so that recording a sale in the sales module automatically creates a corresponding revenue entry in `financial_transactions`.

The UI for all three areas already exists. Charts render with hardcoded arrays (`receitaDiaria`, `receitaSemanal`, `receitaAnual`, `fluxoMensal`, `historicoPreco`). The transaction table displays revenue entries mapped from `financial_transactions`. The CRUD modal exists but its `save()` and `deleteVenda()` functions manipulate local state only -- they never call `createTransaction`, `updateTransaction`, or `deleteTransaction` from the service layer. All required service functions already exist in `lib/services/finances.ts`.

**Primary recommendation:** Replace the 5 hardcoded chart data arrays with `useMemo` computations derived from the already-fetched `transactions` array. Wire the modal's save/delete to the existing service layer CRUD functions. Add a `createRevenueFromSale()` helper that the sales page calls after inserting a sale, using the `reference` column on `financial_transactions` to link back to the sale ID and prevent duplicates.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CHART-01 | Revenue vs Expenses area chart uses real Supabase data grouped by period | Replace `receitaDiaria`/`receitaSemanal`/`receitaAnual` with `useMemo` grouping real transactions by day/week/month based on `filterMode` |
| CHART-02 | Monthly summary bar chart (revenue, expenses, profit) uses real data | Replace `fluxoMensal` with `useMemo` grouping transactions by month, computing revenue/expenses/profit per month |
| CHART-03 | Expense breakdown donut/pie chart uses real category data | Already wired -- `despesasFiltradas` is computed from real `summary.categoryTotals` (done in Phase 3). Verify and confirm. |
| CRUD-01 | User can view list of financial transactions filtered by selected date range | Transaction list already fetches real data but maps only revenue entries to `Venda` type. Expand to show all transactions (revenue + expense) |
| CRUD-02 | User can add a new financial transaction | Wire modal `save()` to `createTransaction()` from finances service; transform form to a `financial_transactions` Insert shape |
| CRUD-03 | User can edit an existing financial transaction | Wire modal edit path to `updateTransaction()` from finances service; call `fetchData()` after success |
| CRUD-04 | User can delete a financial transaction | Wire `deleteVenda()` to `deleteTransaction()` from finances service; call `fetchData()` after success |
| SYNC-01 | Sale recorded in sales module auto-creates revenue transaction | Add `createRevenueFromSale()` to finances service; call it from the sales page `save()` function after successful insert |
| SYNC-02 | Auto-synced revenue transactions include reference to source sale | Use `reference` column on `financial_transactions` with format `sale:{sale_id}`; check for existing reference before creating to prevent duplicates |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | 3.8.0 | All charts (area, bar, pie) | Already installed; mandated by CLAUDE.md |
| @supabase/supabase-js | 2.99.3 | Database CRUD operations | Already installed; sole data layer |
| React | 19.0.0 | UI rendering, hooks (useMemo, useCallback) | Already installed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | 0.460.0 | Icons for categories, actions | Already used throughout finances page |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Client-side grouping | Supabase SQL grouping | Client-side is simpler, matches existing pattern; SQL grouping only needed if transaction count exceeds ~1000/month |
| Supabase Database Trigger for sale-to-revenue sync | Client-side dual-write | Client-side is simpler, matches existing no-server-functions constraint; trigger would be more reliable but requires Supabase Edge Function or database trigger setup |

**Installation:** No new packages needed.

## Architecture Patterns

### Current Data Flow (Already Established in Phase 3)
```
useDateFilter() --> dateRange.startDate / endDate
     |
useAuth() --> farm.id
     |
fetchData() [useCallback] --> getTransactionsByDateRange(farmId, start, end)
                           --> getFinancialSummaryInRange(farmId, start, end)
     |
transactions[] --> useMemo --> chart data arrays
summary{} ------> useMemo --> KPI values (already done)
```

### Pattern 1: Chart Data from Transactions via useMemo
**What:** Derive chart-ready arrays from the already-fetched `transactions` array using `useMemo`, replacing hardcoded mock arrays.
**When to use:** For all 3 chart requirements (CHART-01, CHART-02, CHART-03).
**Example:**
```typescript
// Revenue vs Expenses area chart data (CHART-01)
const revenueVsExpenseChartData = useMemo(() => {
  if (!transactions.length) return [];
  const map: Record<string, { dia: string; receita: number; despesa: number }> = {};
  
  transactions.forEach((t) => {
    // Group key depends on filterMode
    const key = filterMode === "mes"
      ? t.date.substring(0, 7)  // YYYY-MM for monthly
      : t.date.substring(5, 10).replace("-", "/"); // MM/DD for daily
    
    if (!map[key]) map[key] = { dia: key, receita: 0, despesa: 0 };
    if (t.type === "revenue") map[key].receita += Number(t.amount);
    else if (t.type === "expense") map[key].despesa += Number(t.amount);
  });
  
  return Object.values(map).sort((a, b) => a.dia.localeCompare(b.dia));
}, [transactions, filterMode]);
```

### Pattern 2: CRUD Modal Wired to Service Layer
**What:** Replace local-state-only save/delete with async calls to existing service functions, followed by `fetchData()` to refresh.
**When to use:** For CRUD-01 through CRUD-04.
**Example:**
```typescript
async function save() {
  if (!farm?.id) return;
  const record = {
    farm_id: farm.id,
    date: form.data,
    type: form.type as "revenue" | "expense",
    category: form.category,
    description: form.description,
    amount: Number(form.amount),
    payment_method: form.paymentMethod || null,
  };
  
  try {
    if (modal === "add") {
      await createTransaction(record);
    } else if (editing) {
      await updateTransaction(editing.id, record);
    }
    setModal(null);
    fetchData(); // Refresh list + KPIs + charts
  } catch (err) {
    console.error("Error saving transaction:", err);
  }
}
```

### Pattern 3: Revenue Auto-Sync from Sales
**What:** After a sale is inserted in the sales page, call a helper that creates a corresponding revenue entry in `financial_transactions` using the `reference` column to link them.
**When to use:** For SYNC-01 and SYNC-02.
**Example:**
```typescript
// lib/services/finances.ts
export async function createRevenueFromSale(
  farmId: string,
  saleId: string,
  date: string,
  amount: number,
  description: string
) {
  const supabase = createClient();
  
  // Check if revenue already exists for this sale (prevent duplicates)
  const { data: existing } = await supabase
    .from("financial_transactions")
    .select("id")
    .eq("farm_id", farmId)
    .eq("reference", `sale:${saleId}`)
    .maybeSingle();
  
  if (existing) return existing; // Already synced
  
  const { data, error } = await supabase
    .from("financial_transactions")
    .insert({
      farm_id: farmId,
      date,
      type: "revenue",
      category: "sales",
      description,
      amount,
      reference: `sale:${saleId}`,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}
```

### Anti-Patterns to Avoid
- **Querying Supabase inside useMemo:** Data fetching must happen in `useCallback`/`useEffect`, never inside `useMemo`. Memo is for transforming already-fetched data.
- **Building separate fetch calls for each chart:** All charts derive from the same `transactions` array already fetched by `fetchData()`. Do not make additional Supabase queries per chart.
- **Passing `undefined` or `null` to Recharts `data` prop:** Recharts crashes on undefined data. Always default: `data={chartData ?? []}`.
- **Modifying the existing UI layout or styling:** CLAUDE.md constraint -- only wire data, do not change designs.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Transaction CRUD | Custom Supabase queries in page | `createTransaction`, `updateTransaction`, `deleteTransaction` from `lib/services/finances.ts` | Functions already exist, tested, handle errors |
| Date grouping for charts | Complex SQL GROUP BY | Client-side `useMemo` with `Record<string, totals>` | Transaction volume is small (<100/month per farm); client-side grouping matches existing pattern |
| Duplicate prevention for sale sync | Complex constraint logic | Simple `reference` column check with `maybeSingle()` | The `reference` column already exists on `financial_transactions` for exactly this purpose |

**Key insight:** Every service function needed for CRUD already exists. The entire CRUD task is wiring, not building.

## Common Pitfalls

### Pitfall 1: Recharts Crashes on Undefined/Null Data
**What goes wrong:** Passing `undefined` or `null` as the `data` prop to any Recharts component causes a runtime crash with no useful error message.
**Why it happens:** Chart data is computed from async-fetched transactions. Before fetch completes, the memo returns undefined.
**How to avoid:** Initialize chart data arrays as empty arrays `[]`, and always use `data={chartData ?? []}` in JSX.
**Warning signs:** White screen on page load, console error pointing to Recharts internals.

### Pitfall 2: Modal Form Shape Mismatch with financial_transactions Schema
**What goes wrong:** The current modal form collects sales-oriented fields (`cliente`, `lote`, `galpao`, `quantidade`, `precoUn`) which don't map to `financial_transactions` columns (`type`, `category`, `description`, `amount`, `payment_method`).
**Why it happens:** The existing modal was designed for sales recording ("Registrar Venda"), not general financial transactions.
**How to avoid:** Transform the modal form fields to match `financial_transactions` Insert type. The form needs: `type` (revenue/expense), `category` (from `transactionCategories`), `amount`, `date`, `description`, `payment_method`. Do NOT change UI layout -- just change which fields the form collects.
**Warning signs:** Supabase insert errors about missing required columns.

### Pitfall 3: Double-Counting Revenue After Auto-Sync
**What goes wrong:** If a sale creates a revenue transaction AND the user manually adds a revenue transaction for the same sale, revenue is counted twice.
**Why it happens:** No link between manual entries and auto-synced entries.
**How to avoid:** Auto-synced entries use `reference: "sale:{sale_id}"`. The finances page can display this reference so users know which entries are auto-synced. Consider making auto-synced entries read-only or showing a badge.
**Warning signs:** Revenue KPI suddenly doubles after enabling auto-sync.

### Pitfall 4: Sales Page Save Function Lacks Return Value
**What goes wrong:** The sales page `save()` function does `await supabase.from("sales").insert(record)` but does not call `.select().single()` to get back the inserted row's `id`.
**Why it happens:** The current code doesn't need the sale ID after insert.
**How to avoid:** Change the sales insert to use `.select().single()` to get the new sale's `id`, then pass it to `createRevenueFromSale()`.
**Warning signs:** `createRevenueFromSale` receives `undefined` as `saleId`.

### Pitfall 5: Category "sales" Not in Transaction Categories Constants
**What goes wrong:** Auto-synced revenue uses category `"sales"` but `transactionCategories` only has expense categories (feed, labor, energy, water, medicines, maintenance, other).
**Why it happens:** The constants file was designed for expense categories only.
**How to avoid:** Either add a `"sales"` category to the constants file, or use a separate revenue category system. Since the existing codebase only uses categories for expenses (the filtering logic in `getFinancialSummaryInRange` only aggregates categories for `type === "expense"`), using `"sales"` as a revenue category string is safe and does not require constants file changes. Document this choice.
**Warning signs:** Category label showing raw English string "sales" instead of Portuguese.

### Pitfall 6: Transaction List Currently Only Shows Revenue
**What goes wrong:** The current `fetchData` maps only `type === "revenue"` transactions to the `Venda[]` display list (line 161-162 of finances page). This means expense transactions are invisible in the table.
**Why it happens:** The list was designed as a "sales records" view, not a full transaction ledger.
**How to avoid:** For CRUD-01, the list must show all transactions (revenue AND expense). Update the mapping to include both types, and add a type indicator column or badge.
**Warning signs:** User adds an expense transaction but it doesn't appear in the list.

## Code Examples

### Deriving Monthly Cash Flow Chart Data (CHART-02)
```typescript
// Replace hardcoded fluxoMensal array
const fluxoMensalData = useMemo(() => {
  if (!transactions.length) return [];
  const map: Record<string, { mes: string; receita: number; despesa: number; lucro: number }> = {};
  
  transactions.forEach((t) => {
    const ym = t.date.substring(0, 7); // "2026-04"
    if (!map[ym]) map[ym] = { mes: ym, receita: 0, despesa: 0, lucro: 0 };
    if (t.type === "revenue") map[ym].receita += Number(t.amount);
    else if (t.type === "expense") map[ym].despesa += Number(t.amount);
  });
  
  return Object.values(map)
    .map((m) => ({ ...m, lucro: m.receita - m.despesa }))
    .sort((a, b) => a.mes.localeCompare(b.mes));
}, [transactions]);
```

### Wiring Delete to Service Layer (CRUD-04)
```typescript
async function handleDelete(id: string) {
  try {
    await deleteTransaction(id);
    setDeleteConfirm(null);
    fetchData(); // Refresh all data
  } catch (err) {
    console.error("Error deleting transaction:", err);
  }
}
```

### Auto-Sync in Sales Page Save (SYNC-01 + SYNC-02)
```typescript
// In sales/page.tsx save() function
if (modal === "add") {
  const { data: newSale, error } = await supabase
    .from("sales")
    .insert(record)
    .select()
    .single();
  
  if (error) throw error;
  
  // Auto-sync: create revenue transaction
  const customerName = customers.find(c => c.id === form.clienteId)?.name || "Venda";
  await createRevenueFromSale(
    currentFarm.id,
    newSale.id,
    record.date,
    record.total,
    `Venda - ${customerName}`
  );
}
```

## State of the Art

| Old Approach (Current) | Current Approach (Phase 4) | Impact |
|------------------------|---------------------------|--------|
| Hardcoded chart arrays (5 mock datasets) | `useMemo` from real transactions | Charts show real data, update with date range |
| `save()` manipulates local `vendas` state only | `save()` calls `createTransaction`/`updateTransaction` then `fetchData()` | Transactions persist to database |
| `deleteVenda()` filters local array | `handleDelete()` calls `deleteTransaction()` then `fetchData()` | Deletes persist, KPIs recalculate |
| Sales and financial_transactions are independent | Sale insert triggers revenue auto-creation | Revenue automatically tracks sales |
| Transaction list shows only revenue entries | List shows all transactions with type badge | Full financial ledger visibility |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None configured (no test framework in project) |
| Config file | none |
| Quick run command | `npm run lint` |
| Full suite command | `npm run lint && npx tsc --noEmit` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CHART-01 | Area chart renders with real data | manual | Visual inspection in browser | N/A |
| CHART-02 | Bar chart renders with real monthly data | manual | Visual inspection in browser | N/A |
| CHART-03 | Pie chart uses real category data | manual | Visual inspection -- already wired in Phase 3, verify only | N/A |
| CRUD-01 | Transaction list shows all types | manual | Visual inspection + lint | N/A |
| CRUD-02 | Add transaction persists to DB | manual | Add transaction, refresh page, verify it persists | N/A |
| CRUD-03 | Edit transaction updates in DB | manual | Edit transaction, refresh page, verify update | N/A |
| CRUD-04 | Delete transaction removes from DB | manual | Delete transaction, refresh page, verify removal | N/A |
| SYNC-01 | Sale auto-creates revenue entry | manual | Create sale, check financial_transactions in Supabase dashboard | N/A |
| SYNC-02 | Auto-synced entry has sale reference | manual | Check `reference` column in Supabase dashboard | N/A |

### Sampling Rate
- **Per task commit:** `npm run lint && npx tsc --noEmit`
- **Per wave merge:** Full lint + type check + manual browser verification
- **Phase gate:** All 6 success criteria verified manually in browser

### Wave 0 Gaps
- No test framework exists -- all verification is manual + lint + TypeScript compiler
- This is consistent with the project's existing approach (no test framework configured)

## Sources

### Primary (HIGH confidence)
- `app/dashboard/finances/page.tsx` -- full existing UI with mock data arrays, modal structure, current save/delete functions
- `lib/services/finances.ts` -- existing CRUD functions (`createTransaction`, `updateTransaction`, `deleteTransaction`, `getTransactionsByDateRange`)
- `lib/database.types.ts` -- `financial_transactions` schema (lines 328-365), `sales` schema (lines 407-447)
- `app/dashboard/sales/page.tsx` -- current sales save function (lines 350-382), no auto-sync to financial_transactions
- `lib/constants/transaction-categories.ts` -- 7 expense categories defined
- `.planning/research/SUMMARY.md` -- architecture decisions, pitfall catalog from initial research
- `.planning/STATE.md` -- confirmed decision: revenue from `financial_transactions` only (Option A)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all libraries already in use
- Architecture: HIGH -- all patterns verified by direct codebase inspection; existing service functions cover CRUD
- Pitfalls: HIGH -- identified by reading actual current code; mock data arrays and local-only save confirmed line-by-line
- Charts: HIGH -- Recharts 3.8.0 confirmed installed; existing chart JSX in finances page provides exact component structure to keep

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (stable -- no external API or library changes expected)
