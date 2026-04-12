# Phase 1: Foundation - Research

**Researched:** 2026-04-11
**Domain:** TypeScript type safety, timezone-safe date computation, service layer patterns (Next.js 15 / Supabase JS 2)
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FOUND-01 | DateFilterContext uses local date strings instead of UTC to prevent off-by-one day errors for Brazilian timezone (UTC-3) | UTC bug confirmed by direct inspection of date-filter-context.tsx lines 33-48; fix pattern is standard JS date math |
| FOUND-02 | Transaction categories are defined as constants (Portuguese strings matching UI) in a shared file, preventing string drift between service layer and UI | finances.ts currently uses English string literals ("feed", "labor") while UI uses Portuguese ("Ração", "Funcionários"); constants file does not yet exist |
| FOUND-03 | lib/services/finances.ts uses typed Supabase row types instead of `any` | finances.ts confirmed to use `any` on every filter and reduce callback (lines 26-47); `Tables<"financial_transactions">` type already exists in lib/database.types.ts |
| FOUND-04 | finances.ts service has a `getTransactionsByDateRange(farmId, startDate, endDate)` function | Function already exists at line 51 of finances.ts; it returns `data` without a null fallback (`data ?? []`) and has no explicit return type annotation |
</phase_requirements>

---

## Summary

Phase 1 is a pure infrastructure correction phase — no new UI, no new Supabase queries beyond what already exists, no new dependencies. All four requirements target defects that exist in the current codebase and are confirmed by direct code inspection.

The UTC date bug in `DateFilterContext` affects every dashboard page and causes a farmer in Brazil (UTC-3) to see zero results after 9 PM local time when filtering by "today". The fix is to replace `date.toISOString().split("T")[0]` with local-date math (`getFullYear()`, `getMonth()`, `getDate()`) in all four branches of the `dateRange` useMemo. This is a single-file change that benefits all future phases automatically.

The category key mismatch is an existing silent bug: `finances.ts` filters on English strings (`"feed"`, `"labor"`) but the finances page UI uses Portuguese labels (`"Ração"`, `"Funcionários"`). Real database records inserted through the UI would use whatever the UI sends — which may be Portuguese or English depending on the insert path. A `TRANSACTION_CATEGORIES` constants file resolves this as the single source of truth for both the service layer and the UI display layer. The `any` type issue in `finances.ts` is a straight substitution of `any` with `Tables<"financial_transactions">` from the already-generated `lib/database.types.ts`. The `getTransactionsByDateRange` function already exists but has a missing null-fallback and no return type — minor fixes required.

**Primary recommendation:** Make all four changes in isolated, sequential edits. Each change is independent and safe to verify individually. Do not batch them into one edit.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript 5.x | 5.x (tsconfig strict: true) | Type checking all service functions | Already enforced project-wide; strict mode enabled |
| @supabase/supabase-js | 2.99.3 | Supabase browser client | Sole database client; singleton via lib/supabase/client.ts |
| Next.js 15 | 15.5.14 | App Router framework | Project framework; all pages are use client components |
| React 19 | 19.0.0 | UI runtime | Project UI library |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lib/database.types.ts | (generated) | `Tables<T>` helper type for all table rows | Always — use `Tables<"financial_transactions">` instead of `any` |

**No new installations required for Phase 1.**

---

## Architecture Patterns

### Relevant Project Structure
```
lib/
├── database.types.ts        # Auto-generated Supabase types — Tables<T>, InsertTables<T>
├── services/
│   └── finances.ts          # FOUND-03, FOUND-04 target
└── constants/               # Does NOT exist yet — FOUND-02 creates this
    └── transaction-categories.ts

components/
└── date-filter/
    └── date-filter-context.tsx   # FOUND-01 target
```

### Pattern 1: Local-Date String Builder (FOUND-01)
**What:** Replace `date.toISOString().split("T")[0]` with local-timezone date parts to avoid UTC rollover.
**When to use:** Any time a `Date` object must be serialized to a `YYYY-MM-DD` string for a Supabase date-column query.
**Example:**
```typescript
// BEFORE (UTC — wrong for UTC-3 after 9 PM)
startDate = rangeStart.toISOString().split("T")[0];

// AFTER (local timezone — correct)
function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
startDate = toLocalDateString(rangeStart);
```
This helper must be applied to all four branches of the `dateRange` useMemo (lines 32-48 of date-filter-context.tsx).

### Pattern 2: Transaction Categories Constants File (FOUND-02)
**What:** A single `lib/constants/transaction-categories.ts` exporting canonical category keys and their Portuguese display labels.
**When to use:** Wherever category strings appear — service filters, UI labels, form selects, chart legends.
**Example:**
```typescript
// lib/constants/transaction-categories.ts
export const TRANSACTION_CATEGORIES = {
  feed:        { key: "feed",        label: "Ração" },
  labor:       { key: "labor",       label: "Funcionários" },
  energy:      { key: "energy",      label: "Energia" },
  water:       { key: "water",       label: "Água" },
  medicines:   { key: "medicines",   label: "Medicamentos" },
  maintenance: { key: "maintenance", label: "Manutenção" },
  other:       { key: "other",       label: "Outros" },
} as const;

export type TransactionCategoryKey = keyof typeof TRANSACTION_CATEGORIES;
```
The service layer filters on `t.category === TRANSACTION_CATEGORIES.feed.key`. The UI renders `TRANSACTION_CATEGORIES.feed.label`.

**Important:** The category keys stored in the database must match the `key` values above. If real data was inserted through the UI using Portuguese labels directly, a data migration note is needed. For Phase 1 this is a code-only change; data integrity is a Phase 3 concern when real data queries begin.

### Pattern 3: Typed Supabase Row (FOUND-03)
**What:** Replace `any` with `Tables<"financial_transactions">` from the already-generated types file.
**When to use:** Every `filter`, `reduce`, and function parameter in finances.ts that currently annotates with `: any`.
**Example:**
```typescript
// Source: lib/database.types.ts (already in repo)
import type { Tables } from "@/lib/database.types";

type FinancialTransaction = Tables<"financial_transactions">;

// BEFORE
.filter((t: any) => t.type === "revenue")
.reduce((sum: number, t: any) => sum + Number(t.amount), 0);

// AFTER
.filter((t: FinancialTransaction) => t.type === "revenue")
.reduce((sum: number, t: FinancialTransaction) => sum + Number(t.amount), 0);
```

### Pattern 4: getTransactionsByDateRange Return Type (FOUND-04)
**What:** Add explicit return type annotation and null-safety fallback to the existing function.
**What already exists:** The function body is correct. Only the return type and null guard need adding.
**Example:**
```typescript
// BEFORE (no return type, data could be null)
export async function getTransactionsByDateRange(farmId: string, startDate: string, endDate: string) {
  // ...
  return data;
}

// AFTER
export async function getTransactionsByDateRange(
  farmId: string,
  startDate: string,
  endDate: string
): Promise<FinancialTransaction[]> {
  // ...
  return data ?? [];
}
```

### Anti-Patterns to Avoid
- **`date.toISOString()` for date-column queries:** Converts to UTC, causing off-by-one day for UTC-3 users. Always use local date parts.
- **Inline Portuguese string literals in service filters:** e.g., `t.category === "Ração"` in a `.filter()` call. Use the constants file key, not the display label.
- **`any` on Supabase data rows:** The type is already generated in `lib/database.types.ts`. There is no reason to use `any`.
- **Mixing category key and display label concerns:** The constants file separates them. Do not use display labels as database keys.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Supabase row types | Manual interface definitions | `Tables<"financial_transactions">` from lib/database.types.ts | Types are auto-generated from schema; hand-rolled interfaces drift |
| Local date string formatting | Custom format library | `getFullYear()` / `getMonth()` / `getDate()` | No dependency needed; 3-line helper function is sufficient |
| Category key validation | Runtime checks | TypeScript `TransactionCategoryKey` union type | Compile-time enforcement; no runtime cost |

**Key insight:** Everything needed for Phase 1 already exists in the repository. No new packages, no new Supabase functions, no schema changes.

---

## Common Pitfalls

### Pitfall 1: Partial UTC Fix
**What goes wrong:** Developer fixes only the `"dia"` branch of the `dateRange` useMemo but leaves the `"intervalo"` and `"mes"` branches using `toISOString()`.
**Why it happens:** The `"dia"` branch is most obviously broken; other branches look correct at a glance.
**How to avoid:** Apply `toLocalDateString()` to all four branches of the useMemo — `"dia"`, `"intervalo"`, `"mes"`, and the fallback else branch. All four are listed at lines 32-48 of date-filter-context.tsx.
**Warning signs:** "Today" filter works but "this month" still shows wrong data on the last day of the month.

### Pitfall 2: Treating `getTransactionsByDateRange` as Missing
**What goes wrong:** Developer creates a second version of the function, causing a duplicate export and compilation error.
**Why it happens:** FOUND-04 says "finances.ts service has a function" — implying it should be created — but the function already exists at line 51.
**How to avoid:** Read finances.ts before writing. The existing function only needs return type annotation and `data ?? []` null guard, not a full rewrite.
**Warning signs:** TypeScript "duplicate identifier" error on the function name.

### Pitfall 3: Category Key Mismatch Between Code and Database
**What goes wrong:** Phase 1 defines English category keys in constants; real database records from earlier manual testing used Portuguese strings. Phase 3 queries return zero results for expense categories.
**Why it happens:** Phase 1 is a code-only change; it cannot retroactively fix existing database rows.
**How to avoid:** Phase 1 scope is correct — define the constants. Flag in the plan that Phase 3 must verify what category strings actual database records contain before wiring category breakdown queries.
**Warning signs:** Category breakdown shows all zeros with no error, while total expenses show a non-zero sum.

### Pitfall 4: Import Path for Constants File
**What goes wrong:** Service file imports from `"../constants/transaction-categories"` (relative) while page files import from `"@/lib/constants/transaction-categories"` (alias) — both work but are inconsistent.
**Why it happens:** Developers default to relative imports in service files.
**How to avoid:** Follow project convention — use `@/` alias path for all imports per CLAUDE.md conventions (`@/*` maps to project root via tsconfig.json).
**Warning signs:** ESLint import-order warnings; inconsistency visible in code review.

---

## Code Examples

### Complete toLocalDateString Helper (FOUND-01)
```typescript
// To be placed inside DateFilterProvider or as a module-level helper
// in components/date-filter/date-filter-context.tsx
function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
```

### Fixed dateRange useMemo (FOUND-01)
```typescript
const dateRange = useMemo(() => {
  let startDate: string;
  let endDate: string;

  if (filterMode === "dia" && rangeStart) {
    startDate = toLocalDateString(rangeStart);
    endDate = startDate;
  } else if (filterMode === "intervalo" && rangeStart && rangeEnd) {
    startDate = toLocalDateString(rangeStart);
    endDate = toLocalDateString(rangeEnd);
  } else if (filterMode === "mes") {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    startDate = toLocalDateString(new Date(year, month, 1));
    endDate = toLocalDateString(new Date(year, month + 1, 0));
  } else {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    startDate = toLocalDateString(start);
    endDate = toLocalDateString(end);
  }

  return { startDate, endDate };
}, [filterMode, rangeStart, rangeEnd, selectedDate]);
```

### Typed finances.ts (FOUND-03 + FOUND-04)
```typescript
import type { Tables } from "@/lib/database.types";

type FinancialTransaction = Tables<"financial_transactions">;

export async function getTransactionsByDateRange(
  farmId: string,
  startDate: string,
  endDate: string
): Promise<FinancialTransaction[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("financial_transactions")
    .select("*")
    .eq("farm_id", farmId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `date.toISOString().split("T")[0]` | `toLocalDateString(date)` using local date parts | Fixes UTC-3 off-by-one for Brazilian users |
| `any` on Supabase rows | `Tables<"financial_transactions">` | TypeScript compiler catches type mismatches at build time |
| Scattered Portuguese string literals | `TRANSACTION_CATEGORIES` constants | Single source of truth; no drift between service layer and UI |

---

## Open Questions

1. **What category strings exist in the live database?**
   - What we know: finances.ts uses English keys; UI displays Portuguese labels; insert path is not yet confirmed
   - What's unclear: Whether existing database rows (if any from testing) use English or Portuguese values for `category`
   - Recommendation: Phase 1 defines the constants with English keys. Phase 3 must run a spot-check query (`SELECT DISTINCT category FROM financial_transactions LIMIT 20`) before wiring any category-breakdown KPI.

2. **`metaReceita` hardcoded revenue goal (R$20,000)**
   - What we know: Line 211 in finances page: `const metaReceita = 20000;`
   - What's unclear: Whether to remove the progress bar UI or add a `revenue_goal` column to the `farms` table
   - Recommendation: Out of scope for Phase 1. Deferred to post-MVP per STATE.md Todos section. Planner should not address this in Phase 1 tasks.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 1 is purely code and configuration changes with no external service dependencies beyond the already-configured Supabase project and Node.js runtime.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — no jest, vitest, or playwright in package.json |
| Config file | None |
| Quick run command | `npm run build` (TypeScript compilation as type gate) |
| Full suite command | `npm run build && npm run lint` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FOUND-01 | A date at 22:00 local time (UTC-3) returns today's date string, not yesterday's | manual-only | n/a — no test framework | No test framework |
| FOUND-02 | Category key constants file exports 7 keys with Portuguese labels | unit | `npm run build` (TypeScript compilation) | No test framework |
| FOUND-03 | finances.ts compiles without `any` warnings under strict mode | build gate | `npm run build` | No test framework |
| FOUND-04 | getTransactionsByDateRange accepts (farmId, startDate, endDate) and returns typed array | build gate | `npm run build` | No test framework |

**Manual validation for FOUND-01:** After implementing the fix, open the browser at 22:00 local time in Brazil (UTC-3), set the filter to "dia", and confirm today's date is shown, not zero results. Alternatively, create a Date object at `new Date(2024, 0, 1, 22, 0, 0)` (10 PM local) and assert `toLocalDateString(d) === "2024-01-01"` in a console test.

### Sampling Rate
- **Per task commit:** `npm run build` — confirms TypeScript compilation clean
- **Per wave merge:** `npm run build && npm run lint`
- **Phase gate:** Both commands green before marking Phase 1 complete

### Wave 0 Gaps
- [ ] No test framework installed — `npm run build` is the only automated gate
- [ ] Manual browser test procedure needed for FOUND-01 UTC timezone validation
- [ ] Consider installing vitest for future phases: `npm install -D vitest` (out of scope for Phase 1)

---

## Sources

### Primary (HIGH confidence)
- `components/date-filter/date-filter-context.tsx` — UTC bug confirmed at lines 33, 37, 40, 46; `toISOString()` used in all 4 branches
- `lib/services/finances.ts` — `any` annotations confirmed at lines 26-47; `getTransactionsByDateRange` exists at line 51 with missing return type and null guard
- `lib/database.types.ts` — `Tables<"financial_transactions">` type confirmed at lines 328-365; `Tables<T>` helper at line 658
- `app/dashboard/finances/page.tsx` (lines 60-211) — Portuguese category strings in mock data confirmed; `periodo` local state confirmed; hardcoded `totalAves = 2851` and `metaReceita = 20000` confirmed
- `CLAUDE.md` — project constraints, conventions, import path rules, stack confirmation
- `.planning/research/SUMMARY.md` — architecture decisions, pitfall catalogue
- `package.json` — no test framework scripts; confirms no jest/vitest/playwright

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — key decisions, architecture notes
- `docs/mvp.md` — canonical expense categories (feed, medicines, labor, utilities, maintenance)

---

## Project Constraints (from CLAUDE.md)

All directives from `CLAUDE.md` that the planner must enforce:

| Directive | Applies To Phase 1 |
|-----------|-------------------|
| Next.js + Supabase only, no custom backend | Yes — no new backend code |
| Do not change existing UI designs | Yes — Phase 1 touches zero JSX |
| All data access protected by Supabase RLS | N/A — Phase 1 adds no new queries |
| All charts must use Recharts | N/A — Phase 1 adds no charts |
| Avoid overengineering, prefer minimal implementations | Yes — constants file is the simplest solution; no runtime validation needed |
| Use `@/` alias paths for imports, not relative | Yes — new constants file must be imported as `@/lib/constants/transaction-categories` |
| Use `import type` for TypeScript-only imports | Yes — `Tables<T>` import in finances.ts must be `import type { Tables }` |
| Constants: camelCase naming | Yes — `TRANSACTION_CATEGORIES` violates this; project uses camelCase for constants per CONVENTIONS.md section "Constants: camelCase" |
| File naming: kebab-case | Yes — `transaction-categories.ts` is correct |
| No test framework configured | Yes — build gate is the only automated validation |

**NAMING NOTE for planner:** The CONVENTIONS.md states "Constants: camelCase". The canonical pattern in the codebase uses `camelCase` for constant objects (e.g., `quickActions`, `setupAlerts`, `sidebarNav`). However, `TRANSACTION_CATEGORIES` as an ALL_CAPS name is the TypeScript/JavaScript community standard for module-level frozen constant objects. The planner should use `transactionCategories` if strictly following project conventions, or `TRANSACTION_CATEGORIES` if prioritizing clarity for a constants file. Either is acceptable — pick one and note it in the plan.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions read directly from package.json and source files
- Architecture: HIGH — all patterns confirmed by direct inspection of 6 source files
- Pitfalls: HIGH — all pitfalls identified from direct code inspection; no speculation
- Validation: HIGH — confirmed no test framework exists; build gate is the only automated option

**Research date:** 2026-04-11
**Valid until:** 2026-05-11 (stable codebase; no fast-moving dependencies)
