# Phase 22: Storage Locations and Inventory Database - Research

**Researched:** 2026-06-30
**Domain:** Supabase PostgreSQL schema, RLS, triggers, typed inventory services
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Every inventory item must resolve to a storage location; the migration must create automatic default storage locations per farm. [VERIFIED: .planning/phases/22-storage-locations-and-inventory-database/22-CONTEXT.md]
- Default locations are category-specific for feed, vaccines, and packaging. [VERIFIED: .planning/phases/22-storage-locations-and-inventory-database/22-CONTEXT.md]
- Storage locations are category-fixed: feed locations receive feed inventory, vaccine locations receive vaccine inventory, and packaging locations receive packaging inventory. [VERIFIED: .planning/phases/22-storage-locations-and-inventory-database/22-CONTEXT.md]
- Inventory records require traceability fields: `farm_id`, `location_id`, `name`, `quantity`, `unit`, `status`, `supplier`, `unit_cost`, `total_cost`, `entry_date`, `lot_number`, `minimum_quantity`, `expiration_date`, and `notes`. [VERIFIED: .planning/phases/22-storage-locations-and-inventory-database/22-CONTEXT.md]
- `expiration_date` is required for vaccines and optional for feed and packaging. [VERIFIED: .planning/phases/22-storage-locations-and-inventory-database/22-CONTEXT.md]
- Use specialized tables with typed columns; avoid generic JSON extras for MVP. [VERIFIED: .planning/phases/22-storage-locations-and-inventory-database/22-CONTEXT.md]
- Feed inventory needs feed/input-specific fields; vaccine inventory needs target disease, manufacturer, doses, route, and required expiration; packaging inventory needs package type, size, and material. [VERIFIED: .planning/phases/22-storage-locations-and-inventory-database/22-CONTEXT.md]
- Creating inventory with purchase cost must automatically create an expense in `financial_transactions`, via database triggers, using references like `inventory:feed:{id}`. [VERIFIED: .planning/phases/22-storage-locations-and-inventory-database/22-CONTEXT.md]
- Updating purchase fields must update the linked financial transaction instead of creating duplicates. [VERIFIED: .planning/phases/22-storage-locations-and-inventory-database/22-CONTEXT.md]
- Inventory losses do not create a new financial expense by default. [VERIFIED: .planning/phases/22-storage-locations-and-inventory-database/22-CONTEXT.md]
- Storage locations need `active` / `inactive` status; locations with inventory or history are deactivated instead of deleted; physical deletion is allowed only when empty and history-free. [VERIFIED: .planning/phases/22-storage-locations-and-inventory-database/22-CONTEXT.md]
- `inventory_losses` must support controlled reasons: expiration, damage, contamination, humidity, sanitary disposal, manual adjustment, and other. [VERIFIED: .planning/phases/22-storage-locations-and-inventory-database/22-CONTEXT.md]
- Recording an inventory loss must reduce the affected inventory quantity in the same operation. [VERIFIED: .planning/phases/22-storage-locations-and-inventory-database/22-CONTEXT.md]
- Loss records preserve reason, quantity, date, notes, and the specific item/table affected. [VERIFIED: .planning/phases/22-storage-locations-and-inventory-database/22-CONTEXT.md]

### the agent's Discretion

- Exact SQL function names, trigger names, and enum names may follow the repository's existing migration style. [VERIFIED: .planning/phases/22-storage-locations-and-inventory-database/22-CONTEXT.md]
- The planner may choose the simplest typed representation for item linkage in `inventory_losses`, as long as it avoids untyped JSON and preserves farm-scoped RLS. [VERIFIED: .planning/phases/22-storage-locations-and-inventory-database/22-CONTEXT.md]
- The planner may decide whether default storage locations are created by migration backfill, trigger, helper function, or service bootstrap, as long as every farm can reliably receive category-specific defaults. [VERIFIED: .planning/phases/22-storage-locations-and-inventory-database/22-CONTEXT.md]

### Deferred Ideas (OUT OF SCOPE)

None. Discussion stayed within Phase 22 scope. [VERIFIED: .planning/phases/22-storage-locations-and-inventory-database/22-CONTEXT.md]
</user_constraints>

## Summary

Phase 22 should be implemented as a schema-specialization migration that keeps Supabase as the sole backend and moves inventory correctness into PostgreSQL constraints, RLS, and triggers. [VERIFIED: .planning/PROJECT.md] The current repo still has a generalized `inventory` table, generated TypeScript types for that table, and UI/service call sites that mix reads from `inventory` with writes/counts against the old `feed_inventory` name. [VERIFIED: supabase/schema.sql] [VERIFIED: lib/database.types.ts] [VERIFIED: lib/services/inventory.ts] [VERIFIED: app/dashboard/inventory/page.tsx] [VERIFIED: app/dashboard/flocks/page.tsx]

The recommended migration shape is: create `storage_locations`; recreate or create specialized `feed_inventory`, `vaccine_inventory`, and `packaging_inventory`; create `inventory_losses`; backfill three default category locations per farm; migrate legacy `inventory` rows into `feed_inventory` when they are feed-like; and keep any destructive cleanup of legacy `inventory` out of Phase 22 unless the planner explicitly includes compatibility views/services for Phase 23. [VERIFIED: supabase/migrations/00011_generalize_inventory.sql] [ASSUMED]

**Primary recommendation:** use database-owned constraints and triggers for invariants, and update `lib/database.types.ts` plus `lib/services/inventory.ts` in the same phase so existing pages can compile while Phase 23/24 perform the UI tab migration. [VERIFIED: AGENTS.md] [VERIFIED: lib/services/inventory.ts]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Inventory schema and typed traceability | Database / Storage | API / Backend service layer | PostgreSQL owns table shape, foreign keys, checks, and generated type surface; services adapt UI calls to typed tables. [VERIFIED: supabase/schema.sql] |
| Farm-scoped authorization | Database / Storage | Frontend Server / Client | Existing project enforces Supabase RLS per farm, with client queries passing `farm_id`. [VERIFIED: .planning/PROJECT.md] [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security] |
| Purchase expense sync | Database / Storage | Service layer for display | Phase context locks trigger-based expense creation so all insert paths behave consistently. [VERIFIED: .planning/phases/22-storage-locations-and-inventory-database/22-CONTEXT.md] |
| Safe location deletion | Database / Storage | UI later | A trigger/function can intercept deletes and deactivate locations with linked history; Phase 23 can surface the behavior. [VERIFIED: .planning/phases/22-storage-locations-and-inventory-database/22-CONTEXT.md] |
| Loss recording and quantity reduction | Database / Storage | Service layer | The stock decrement must be atomic with the loss insert; a trigger or RPC prevents split-write inconsistency. [VERIFIED: .planning/phases/22-storage-locations-and-inventory-database/22-CONTEXT.md] |

## Project Constraints (from AGENTS.md)

- Reuse existing functions, components, services, and migration patterns before creating new abstractions. [VERIFIED: AGENTS.md]
- Ask on ambiguous business rules; do not invent missing rules. [VERIFIED: AGENTS.md]
- Keep changes minimal, direct, modular, and atomic. [VERIFIED: AGENTS.md]
- Update or create tests in the same iteration when logic changes. [VERIFIED: AGENTS.md]
- TypeScript must not use `any`; create precise interfaces/types when needed. [VERIFIED: AGENTS.md]
- Remove unused declarations and avoid commented-out dead code. [VERIFIED: AGENTS.md]
- Keep core logic testable and avoid coupling business rules to UI details. [VERIFIED: AGENTS.md]

## Standard Stack

### Core

| Library / Platform | Version | Purpose | Why Standard |
|--------------------|---------|---------|--------------|
| Supabase CLI | 2.83.0 installed | Migration application and generated database types | The repo already uses Supabase migrations and `lib/database.types.ts`. [VERIFIED: npx supabase --version] [VERIFIED: lib/database.types.ts] |
| PostgreSQL via Supabase | Project managed | Tables, constraints, RLS, triggers, functions | Phase goal is database-first and the project forbids a custom backend server. [VERIFIED: .planning/PROJECT.md] |
| `@supabase/supabase-js` | 2.99.3 in `package.json` | Client-side typed table access | Existing services use `createClient()` and `.from(...)` calls. [VERIFIED: package.json] [VERIFIED: lib/services/inventory.ts] |
| TypeScript | 5.x in `package.json` | Typed service compatibility | Zero-`any` rule requires generated/static table types for new tables. [VERIFIED: package.json] [VERIFIED: AGENTS.md] |

### Supporting

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| Node.js | v22.14.0 | Build and local scripts | Required by the Next.js/Supabase toolchain. [VERIFIED: node --version] |
| npm | 10.9.2 | Package scripts | Run existing `npm run build` verification after type updates. [VERIFIED: npm --version] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Specialized tables | Keep generic `inventory` plus `type` | Violates the Phase 22 decision to use specialized typed tables and makes vaccine/packaging required fields harder to type. [VERIFIED: .planning/phases/22-storage-locations-and-inventory-database/22-CONTEXT.md] |
| Trigger-based expense sync | Service-only insertion | Violates locked decision D-11 and misses SQL-editor/seed/script insert paths. [VERIFIED: .planning/phases/22-storage-locations-and-inventory-database/22-CONTEXT.md] |
| JSON linkage for losses | `jsonb` item reference | Conflicts with typed MVP and zero-`any` repository rule. [VERIFIED: .planning/phases/22-storage-locations-and-inventory-database/22-CONTEXT.md] [VERIFIED: AGENTS.md] |

**Installation:** No new external packages are required. [VERIFIED: package.json]

## Package Legitimacy Audit

No external package installation is recommended for this phase. [VERIFIED: package.json]

## Recommended Migration Shape

### Tables and Columns

Use a new migration after the current highest migration number and keep it idempotent where possible with `create table if not exists`, guarded policy creation, `create index if not exists`, and `drop trigger if exists` before creating triggers. [VERIFIED: supabase/migrations/00020_water_consumption.sql] [VERIFIED: supabase/migrations/00022_flock_tasks_crud.sql]

Recommended table shape:

```sql
create table if not exists public.storage_locations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  name text not null,
  category text not null check (category in ('feed', 'vaccine', 'packaging')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  is_default boolean not null default false,
  notes text,
  unique (farm_id, category, name)
);
```

The three inventory tables should share the locked common columns and category-specific fields. [VERIFIED: .planning/phases/22-storage-locations-and-inventory-database/22-CONTEXT.md] Use `location_id uuid not null references public.storage_locations(id)` and add a trigger that rejects category mismatches because PostgreSQL foreign keys alone cannot verify `storage_locations.category` against a row's table category. [ASSUMED]

Recommended status values should keep existing UI states in mind: `normal`, `alerta`, and `baixo` are already used on the feed page and dashboard low-stock alerts. [VERIFIED: app/dashboard/racao/page.tsx] [VERIFIED: app/dashboard/page.tsx] A planner should either preserve those strings for feed compatibility or plan service mapping from new canonical statuses to existing UI states. [ASSUMED]

### Default Storage Locations and Backfill

Create a helper function such as `public.ensure_default_storage_locations(target_farm_id uuid)` that inserts one default location per category with `on conflict (farm_id, category, name) do nothing`. [ASSUMED] Run it for every existing farm during migration and add an `after insert on public.farms` trigger so future farms also receive defaults. [VERIFIED: public.farms exists in supabase/schema.sql] [ASSUMED]

Default names should match the context intent but use ASCII-safe literals in SQL if the project keeps migration files ASCII-only: `Sem local definido - Racao`, `Sem local definido - Vacinas`, `Sem local definido - Embalagens`. [VERIFIED: .planning/phases/22-storage-locations-and-inventory-database/22-CONTEXT.md] [ASSUMED]

Backfill legacy rows from `public.inventory` into `public.feed_inventory` only for rows where `type` maps to feed values such as `racao`, `Racao`, `insumo`, `suplemento`, or `mineral`; because historical values are not fully enumerated in the schema, the planner should include a SQL audit query before migration execution. [VERIFIED: supabase/schema.sql] [ASSUMED]

### Category-Fixed Constraints

Use a shared trigger function that receives the expected category through `TG_ARGV[0]` and checks `storage_locations.farm_id = new.farm_id`, `storage_locations.status = 'active'`, and `storage_locations.category = expected_category`. [ASSUMED] This enforces both farm isolation and fixed category routing before rows are accepted. [ASSUMED]

### Financial Trigger Design

Add a unique index on `financial_transactions(reference)` where `reference is not null` before relying on idempotent `on conflict` behavior. [VERIFIED: financial_transactions.reference exists in supabase/schema.sql] [ASSUMED] If duplicate legacy references exist, this index can fail; planner should include a preflight duplicate check. [ASSUMED]

Use one trigger function parameterized by inventory kind:

- Reference: `inventory:feed:{id}`, `inventory:vaccine:{id}`, `inventory:packaging:{id}`. [VERIFIED: .planning/phases/22-storage-locations-and-inventory-database/22-CONTEXT.md]
- Insert/update only when `total_cost > 0` or `unit_cost * quantity > 0`. [ASSUMED]
- Upsert `financial_transactions` with `type = 'expense'`, a stable category (`feed` for feed, `health` or `vaccine` for vaccines, `packaging` for packaging), `date = entry_date`, `amount = total_cost`, and a description built from item name. [ASSUMED]
- On relevant updates, update the existing transaction by reference; do not create duplicates. [VERIFIED: .planning/phases/22-storage-locations-and-inventory-database/22-CONTEXT.md]
- If cost becomes zero or null after update, either delete the generated transaction or update amount to zero; deletion is cleaner for financial reports but is a business rule not locked in context, so planner should ask or choose a documented policy. [ASSUMED]

The service layer currently has a sale reference helper that checks `reference = sale:{id}` before insert, but Phase 22 should move inventory purchase sync into SQL triggers as locked by context. [VERIFIED: lib/services/finances.ts] [VERIFIED: .planning/phases/22-storage-locations-and-inventory-database/22-CONTEXT.md]

### Inventory Losses

Use typed linkage columns instead of JSON:

```sql
inventory_type text not null check (inventory_type in ('feed', 'vaccine', 'packaging')),
feed_inventory_id uuid references public.feed_inventory(id) on delete restrict,
vaccine_inventory_id uuid references public.vaccine_inventory(id) on delete restrict,
packaging_inventory_id uuid references public.packaging_inventory(id) on delete restrict,
check (
  (inventory_type = 'feed' and feed_inventory_id is not null and vaccine_inventory_id is null and packaging_inventory_id is null)
  or (inventory_type = 'vaccine' and vaccine_inventory_id is not null and feed_inventory_id is null and packaging_inventory_id is null)
  or (inventory_type = 'packaging' and packaging_inventory_id is not null and feed_inventory_id is null and vaccine_inventory_id is null)
)
```

This is verbose but gives generated TypeScript fields without `any`, preserves referential integrity, and lets RLS remain farm-scoped through `farm_id`. [VERIFIED: AGENTS.md] [ASSUMED]

Use a `before insert` trigger to validate that the linked item belongs to the same farm, that `quantity > 0`, and that the item has enough stock; then update the target item quantity in the same transaction. [ASSUMED] PostgreSQL triggers run as part of the statement transaction, which is the right boundary for stock movement atomicity. [CITED: https://www.postgresql.org/docs/current/sql-createtrigger.html]

### Safe Location Deletion

Use a `before delete` trigger on `storage_locations`. [ASSUMED] If any linked inventory row or `inventory_losses` row references the location, update the location to `inactive` and return `null` to cancel physical deletion; otherwise return `old` to allow deletion. [ASSUMED] This matches the Phase 22 safe deletion requirement and keeps the UI delete button from destroying history. [VERIFIED: .planning/phases/22-storage-locations-and-inventory-database/22-CONTEXT.md]

## Architecture Patterns

### System Architecture Diagram

```text
Farm created or migration runs
  -> ensure_default_storage_locations(farm_id)
  -> storage_locations(feed/vaccine/packaging defaults)

Inventory insert/update
  -> category/location validation trigger
  -> specialized inventory table
  -> purchase expense trigger
  -> financial_transactions(reference = inventory:{kind}:{id})

Inventory loss insert
  -> typed item reference check
  -> quantity validation
  -> decrement target inventory quantity
  -> inventory_losses history row

Storage location delete request
  -> safe delete trigger
  -> if linked rows exist: mark inactive and cancel delete
  -> if no links: allow physical delete
```

### Recommended Project Structure

```text
supabase/migrations/
  00023_storage_locations_inventory_database.sql  # new Phase 22 migration
supabase/schema.sql                               # update aggregate schema snapshot
lib/database.types.ts                            # add typed tables
lib/services/inventory.ts                        # adapt to specialized inventory tables
lib/services/index.ts                            # export compatible service functions
```

### Pattern 1: RLS Policies

Reuse the existing farm policy pattern: owner-only writes and owner/profile-member reads where needed. [VERIFIED: supabase/migrations/00020_water_consumption.sql] [VERIFIED: supabase/migrations/00022_flock_tasks_crud.sql] Supabase documents RLS as PostgreSQL row filtering policies, and the project already enables RLS on farm-scoped tables. [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security] [VERIFIED: supabase/schema.sql]

Prefer guarded `do $$ begin if not exists (...) then create policy ... end if; end $$;` blocks for re-runnable migrations where this repo has used them. [VERIFIED: supabase/migrations/00020_water_consumption.sql]

### Pattern 2: Type-Safe Services

Replace `Record<string, any>` in `lib/services/inventory.ts` with `TablesInsert<"feed_inventory">`, `TablesUpdate<"feed_inventory">`, and matching vaccine/packaging types. [VERIFIED: lib/services/inventory.ts] [VERIFIED: lib/database.types.ts] The current service violates the zero-`any` rule and should be corrected while table types are added. [VERIFIED: AGENTS.md] [VERIFIED: lib/services/inventory.ts]

### Anti-Patterns to Avoid

- **Leaving UI reads on legacy `inventory` without compatibility:** dashboard alerts and feed page inventory will break after specialization unless services or compatibility views bridge the change. [VERIFIED: app/dashboard/page.tsx] [VERIFIED: app/dashboard/racao/page.tsx]
- **Using `location` text instead of `location_id`:** this bypasses category-fixed storage and safe deletion requirements. [VERIFIED: app/dashboard/inventory/page.tsx] [VERIFIED: .planning/phases/22-storage-locations-and-inventory-database/22-CONTEXT.md]
- **Creating expenses in services only:** this violates the locked trigger decision and misses non-UI insert paths. [VERIFIED: .planning/phases/22-storage-locations-and-inventory-database/22-CONTEXT.md]
- **Generic JSON loss references:** this weakens type generation and conflicts with the zero-`any` repository rule. [VERIFIED: AGENTS.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Farm authorization | Client-only farm checks | Supabase RLS policies | Existing project standard and database-enforced. [VERIFIED: .planning/PROJECT.md] |
| Timestamp maintenance | Manual `updated_at` writes in services | `public.handle_updated_at` trigger | Existing helper is already used across tables. [VERIFIED: supabase/migrations/00001_initial_schema.sql] |
| Expense idempotency | Ad hoc duplicate checks only in UI | Unique `reference` plus trigger upsert | Works for UI, SQL editor, seeds, and scripts. [VERIFIED: .planning/phases/22-storage-locations-and-inventory-database/22-CONTEXT.md] |
| Loss quantity updates | Two separate client writes | Database trigger or RPC transaction | Prevents history row without stock decrement. [ASSUMED] |

**Key insight:** this phase is about preserving data invariants; the database should own invariants and services should expose typed, ergonomic calls. [ASSUMED]

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | Existing `public.inventory` rows may contain feed-like stock data after migration 00011 renamed `feed_inventory` to `inventory`. [VERIFIED: supabase/migrations/00011_generalize_inventory.sql] | Add migration audit and backfill into `feed_inventory`; do not assume all rows are feed. [ASSUMED] |
| Live service config | Supabase database contains live RLS policies/triggers; no external service config was identified for inventory. [VERIFIED: supabase/schema.sql] | Apply migration and regenerate schema/types. |
| OS-registered state | None found in required inputs; this is a database migration phase. [VERIFIED: required input scan] | No OS registration action. |
| Secrets/env vars | No new secrets/env vars are needed. [VERIFIED: package.json] | No action. |
| Build artifacts | `lib/database.types.ts` is a checked-in generated/static artifact. [VERIFIED: lib/database.types.ts] | Update it after migration shape is finalized. |

## Common Pitfalls

### Pitfall 1: `feed_inventory` Name Collision

**What goes wrong:** migration 00009 created `feed_inventory`, but 00011 renamed it to `inventory`; code still writes/counts `feed_inventory` in several places. [VERIFIED: supabase/migrations/00009_feed_inventory.sql] [VERIFIED: supabase/migrations/00011_generalize_inventory.sql] [VERIFIED: app/dashboard/inventory/page.tsx]  
**How to avoid:** explicitly recreate `feed_inventory` and update services/pages or provide compatibility during Phase 22. [ASSUMED]

### Pitfall 2: Location Category Drift

**What goes wrong:** a feed item can point to a vaccine location if only `location_id` is constrained by FK. [ASSUMED]  
**How to avoid:** add a trigger validating location farm, active status, and category for every specialized inventory table. [ASSUMED]

### Pitfall 3: Duplicate Financial Expenses

**What goes wrong:** repeated inserts/updates create multiple expenses for one inventory item. [VERIFIED: .planning/phases/22-storage-locations-and-inventory-database/22-CONTEXT.md]  
**How to avoid:** add unique reference enforcement and update-by-reference behavior in the trigger. [ASSUMED]

### Pitfall 4: Loss Rows Without Stock Reduction

**What goes wrong:** a service inserts a loss history row but fails before decrementing item quantity. [ASSUMED]  
**How to avoid:** perform the reduction inside the database trigger or a single SQL function called by the service. [ASSUMED]

### Pitfall 5: Phase 23/24 UI Assumptions

**What goes wrong:** dashboard low-stock alerts currently expect `inventory.status` values `baixo`/`alerta`, feed page filters `d.type === "racao"`, and flocks setup counts `feed_inventory`. [VERIFIED: app/dashboard/page.tsx] [VERIFIED: app/dashboard/racao/page.tsx] [VERIFIED: app/dashboard/flocks/page.tsx]  
**How to avoid:** Phase 22 should either update service compatibility or document exact follow-up edits for Phase 23/24. [ASSUMED]

## Code Examples

### RLS Policy Skeleton

```sql
create policy "Users can view feed inventory from their farm"
  on public.feed_inventory for select
  using (
    farm_id in (
      select id from public.farms where owner_id = auth.uid()
      union
      select farm_id from public.profiles where id = auth.uid()
    )
  );
```

Source: existing migration style. [VERIFIED: supabase/migrations/00020_water_consumption.sql]

### Type-Safe Service Skeleton

```typescript
import { createClient } from "@/lib/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/lib/database.types";

type FeedInventoryInsert = TablesInsert<"feed_inventory">;
type FeedInventoryUpdate = TablesUpdate<"feed_inventory">;

export async function createFeedInventoryItem(record: FeedInventoryInsert) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("feed_inventory")
    .insert(record)
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

Source: existing service/type helper pattern. [VERIFIED: lib/services/health.ts] [VERIFIED: lib/database.types.ts]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `feed_inventory` table | Renamed/generalized to `inventory` | Migration 00011 | Phase 22 must reintroduce specialized tables deliberately. [VERIFIED: supabase/migrations/00011_generalize_inventory.sql] |
| Free-text location | `location_id` to `storage_locations` | Phase 22 decision | Enables category-fixed locations and safe deletion. [VERIFIED: .planning/phases/22-storage-locations-and-inventory-database/22-CONTEXT.md] |
| Service-only sale revenue reference | SQL trigger for inventory purchase expenses | Phase 22 decision | Inventory costs must sync regardless of insert source. [VERIFIED: lib/services/finances.ts] [VERIFIED: .planning/phases/22-storage-locations-and-inventory-database/22-CONTEXT.md] |

**Deprecated/outdated:**
- `public.inventory` as the primary inventory table is superseded by Phase 22 specialized tables. [VERIFIED: .planning/milestones/v1.3-ROADMAP.md]
- `Record<string, any>` service inputs are incompatible with AGENTS.md. [VERIFIED: AGENTS.md] [VERIFIED: lib/services/inventory.ts]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Legacy `inventory` rows can be safely backfilled into feed only when type is feed-like. | Recommended Migration Shape | Bad data migration if non-feed rows are converted. |
| A2 | `financial_transactions.reference` can receive a unique partial index after duplicate audit. | Financial Trigger Design | Migration may fail if duplicate references exist. |
| A3 | Zero-cost updates should delete or neutralize generated expenses; exact policy needs confirmation. | Financial Trigger Design | Financial reports may show stale or zero-value expenses. |
| A4 | Typed nullable FK linkage is the simplest loss representation. | Inventory Losses | Planner may prefer separate loss tables or SQL functions. |
| A5 | Default location names should be ASCII in migrations. | Default Storage Locations | UI copy may need accented Portuguese labels later. |

## Open Questions (RESOLVED)

1. **What should happen when an inventory item's `total_cost` is changed to zero after an expense was generated?**
   - What we know: updates must update linked transactions rather than duplicate them. [VERIFIED: .planning/phases/22-storage-locations-and-inventory-database/22-CONTEXT.md]
   - Resolution: delete the linked generated transaction when the generated amount becomes zero, null, or negative. This prevents stale or zero-value expenses from skewing financial reports.

2. **Should vaccine inventory financial category be `health`, `vaccine`, or another finance category?**
   - What we know: existing financial categories are string-based and `feed` is used in summaries. [VERIFIED: lib/services/finances.ts]
   - Resolution: use only existing category constants in Phase 22. Feed inventory uses `feed`, vaccine inventory uses `medicines`, and packaging inventory uses `other`.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Type/build verification | yes | v22.14.0 | none |
| npm | Build scripts | yes | 10.9.2 | none |
| Supabase CLI | Local type/schema generation | yes | 2.83.0 | Manually update `lib/database.types.ts` from migration shape if CLI cannot connect. |

**Missing dependencies with no fallback:** None found. [VERIFIED: environment probes]

**Missing dependencies with fallback:** Supabase CLI reported Docker config access warning during version check; version still printed. [VERIFIED: npx supabase --version]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None configured beyond Next.js build/lint scripts. [VERIFIED: package.json] |
| Config file | none found for Jest/Vitest/Playwright. [VERIFIED: rg --files test config scan] |
| Quick run command | `npm run build` |
| Full suite command | `npm run build` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| P22-DB-01 | New tables exist with constraints and RLS. | migration smoke | `npx supabase db push` then SQL introspection | no |
| P22-DB-02 | Defaults are created per farm and category. | SQL integration | SQL select count per farm/category | no |
| P22-DB-03 | Inventory purchase insert/update syncs one expense by reference. | SQL integration | SQL insert/update transaction check | no |
| P22-DB-04 | Loss insert decrements target quantity atomically. | SQL integration | SQL insert loss and assert quantity | no |
| P22-DB-05 | Location delete deactivates linked locations and deletes empty ones. | SQL integration | SQL delete scenarios | no |
| P22-TS-01 | TypeScript services compile without `any`. | build/type | `npm run build` | no |

### Sampling Rate

- **Per task commit:** `npm run build`
- **Per wave merge:** `npm run build`
- **Phase gate:** migration applied locally or reviewed in SQL, generated types updated, build green.

### Wave 0 Gaps

- [ ] SQL migration verification script or manual checklist for trigger behavior.
- [ ] TypeScript service tests are absent; use build as the minimum contract. [VERIFIED: package.json]
- [ ] No test runner is configured; adding one is outside Phase 22 unless planner chooses a small SQL validation script. [VERIFIED: package.json]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | yes | Supabase Auth user context via `auth.uid()` in policies. [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security] |
| V3 Session Management | no direct schema change | Supabase client/session remains unchanged. [VERIFIED: lib/supabase/client usage in services] |
| V4 Access Control | yes | Farm-scoped RLS on every new table. [VERIFIED: .planning/PROJECT.md] |
| V5 Input Validation | yes | PostgreSQL check constraints, foreign keys, and triggers. [VERIFIED: supabase/schema.sql] |
| V6 Cryptography | no | No secrets or custom crypto in this phase. [VERIFIED: phase goal] |

### Known Threat Patterns for Supabase Inventory Data

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-farm data access | Information Disclosure | RLS `using` / `with check` on `farm_id`. [VERIFIED: supabase/migrations/00020_water_consumption.sql] |
| Cross-category storage injection | Tampering | Trigger validates location category and farm before insert/update. [ASSUMED] |
| Duplicate generated expenses | Tampering | Unique reference plus update-by-reference trigger. [ASSUMED] |
| Negative stock through loss entries | Tampering | Quantity check and atomic stock decrement trigger. [ASSUMED] |
| Trigger privilege/search path risk | Elevation of Privilege | Use explicit `set search_path = public` on trigger functions following newer repo style. [VERIFIED: supabase/schema.sql] [CITED: https://supabase.com/docs/guides/database/functions] |

## Sources

### Primary (HIGH confidence)

- `.planning/phases/22-storage-locations-and-inventory-database/22-CONTEXT.md` - locked Phase 22 decisions and boundaries.
- `.planning/PROJECT.md` - project stack, Supabase-only backend, RLS requirement.
- `.planning/milestones/v1.3-ROADMAP.md` - Phase 22/23/24 sequencing.
- `supabase/migrations/00001_initial_schema.sql` - base schema, RLS style, `handle_updated_at`, `financial_transactions`.
- `supabase/migrations/00009_feed_inventory.sql` - old feed inventory schema.
- `supabase/migrations/00011_generalize_inventory.sql` - legacy rename to generic `inventory`.
- `supabase/schema.sql` - current aggregate schema.
- `lib/database.types.ts` - current generated/static types and helper aliases.
- `lib/services/inventory.ts`, `lib/services/finances.ts`, `lib/services/health.ts` - service patterns and compatibility risks.
- `app/dashboard/inventory/page.tsx`, `app/dashboard/racao/page.tsx`, `app/dashboard/page.tsx`, `app/dashboard/flocks/page.tsx` - UI integration points.
- `supabase/migrations/00020_water_consumption.sql`, `00021_health_and_inspections.sql`, `00022_flock_tasks_crud.sql` - recent migration style.

### Secondary (MEDIUM confidence)

- Supabase RLS docs: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase database functions docs: https://supabase.com/docs/guides/database/functions
- Supabase TypeScript generation docs: https://supabase.com/docs/guides/api/rest/generating-types
- PostgreSQL trigger docs: https://www.postgresql.org/docs/current/sql-createtrigger.html

### Tertiary (LOW confidence)

- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - verified from `package.json`, CLI probes, and existing services.
- Architecture: HIGH - constrained by locked Phase 22 decisions and existing Supabase-only architecture.
- Migration details: MEDIUM - table/trigger shapes are prescriptive recommendations, but a few business choices remain open.
- Pitfalls: HIGH - based on direct code and migration references.

**Research date:** 2026-06-30
**Valid until:** 2026-07-30 for repo-specific findings; re-check Supabase docs and installed CLI before applying migrations.
