# Phase 22: Storage Locations and Inventory Database - Context

**Gathered:** 2026-06-30
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers the Supabase inventory re-architecture foundation: database migrations, RLS policies, TypeScript database types, and service-layer readiness for `storage_locations`, `feed_inventory`, `vaccine_inventory`, `packaging_inventory`, and `inventory_losses`. It also defines database triggers for automatic inventory purchase expense logging and safe storage location deletion behavior.

UI tab migration and modal UX belong to Phases 23 and 24.

</domain>

<decisions>
## Implementation Decisions

### Storage Location Model
- **D-01:** Every inventory item must resolve to a storage location. To avoid blocking existing data migration or quick entry flows, the migration must create automatic default storage locations per farm.
- **D-02:** Default locations are category-specific, not a single generic bucket. Each farm should have default locations for feed, vaccines, and packaging, such as "Sem local definido - Racao", "Sem local definido - Vacinas", and "Sem local definido - Embalagens".
- **D-03:** Storage locations are category-fixed. A feed location receives `feed_inventory`, a vaccine location receives `vaccine_inventory`, and a packaging location receives `packaging_inventory`.

### Inventory Traceability
- **D-04:** Inventory records should use complete traceability fields: `farm_id`, `location_id`, `name`, `quantity`, `unit`, `status`, `supplier`, `unit_cost`, `total_cost`, `entry_date`, `lot_number`, `minimum_quantity`, `expiration_date`, and `notes`.
- **D-05:** `expiration_date` is required for vaccines and optional for feed and packaging.
- **D-06:** Use specialized tables with shared common fields plus type-specific fields. Avoid generic JSON extras for MVP because typed columns are better for filtering, reporting, generated TypeScript types, and the repository's zero-`any` rule.
- **D-07:** `feed_inventory` should include feed/input-specific fields, such as feed category or feed type.
- **D-08:** `vaccine_inventory` should include vaccine-specific fields, such as target disease, manufacturer, doses, application route, and required expiration date.
- **D-09:** `packaging_inventory` should include packaging-specific fields, such as package type, size, and material.

### Automatic Financial Expenses
- **D-10:** Creating a feed, vaccine, or packaging inventory item with a purchase cost must automatically create an expense in `financial_transactions`.
- **D-11:** Expense creation belongs in database triggers, not only in the application service layer. This keeps behavior consistent for inserts from the UI, Supabase SQL editor, seeds, or future scripts.
- **D-12:** Each automatic expense must be idempotently linked with a `reference` value, using patterns like `inventory:feed:{id}`, `inventory:vaccine:{id}`, and `inventory:packaging:{id}`.
- **D-13:** Updating an inventory item's relevant purchase fields should update the linked financial transaction instead of creating duplicate expenses. Relevant fields include cost, entry date, item name or description, and category metadata.
- **D-14:** Inventory losses should not create a new financial expense by default. Losses are operational loss records and stock movements; the original purchase expense already captures the cash outflow.

### Safe Storage Location Deletion
- **D-15:** Storage locations need a status such as `active` or `inactive`.
- **D-16:** Locations with inventory items, losses, or other history should be deactivated instead of physically deleted.
- **D-17:** Physical deletion is allowed only when the location is totally empty and has no linked history. If any link exists, the safe behavior is deactivation.

### Inventory Losses
- **D-18:** `inventory_losses` should support controlled operational reasons: expiration, damage, contamination, humidity, sanitary disposal, manual adjustment, and other.
- **D-19:** Recording an inventory loss must automatically reduce the inventory item quantity in the same operation.
- **D-20:** Loss records are history and stock movement records. They preserve the reason, quantity, date, notes, and the specific item/table affected.

### the agent's Discretion
- Exact SQL function names, trigger names, and enum names may follow the repository's existing migration style.
- The planner may choose the simplest typed representation for item linkage in `inventory_losses`, as long as it avoids untyped JSON and preserves farm-scoped RLS.
- The planner may decide whether default storage locations are created by migration backfill, trigger, helper function, or service bootstrap, as long as every farm can reliably receive category-specific defaults.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Scope
- `.planning/PROJECT.md` - Overall project goals, v1.3 inventory specialization goal, Supabase-only backend constraint, and mobile-first MVP constraints.
- `.planning/milestones/v1.3-ROADMAP.md` - Phase 22 goal and phase boundaries with Phases 23 and 24.
- `.planning/STATE.md` - Current milestone state and accumulated v1.3 decisions.

### Existing Database and Migrations
- `supabase/migrations/00001_initial_schema.sql` - Existing `financial_transactions`, RLS policy style, `handle_updated_at`, and legacy `inventory` table context.
- `supabase/migrations/00009_feed_inventory.sql` - Original `feed_inventory` schema and policies before generalization.
- `supabase/migrations/00011_generalize_inventory.sql` - Existing general `inventory` migration that Phase 22 supersedes with specialized tables.
- `supabase/schema.sql` - Current aggregate schema snapshot, including legacy inventory and financial transaction definitions.

### TypeScript and Service Layers
- `lib/database.types.ts` - Generated/static database type surface that must be updated for new inventory tables without `any`.
- `lib/services/inventory.ts` - Current inventory service still reads from `inventory`; must be replaced or adapted to specialized tables.
- `lib/services/finances.ts` - Existing financial transaction service and sale reference pattern for idempotent generated transactions.
- `lib/services/index.ts` - Service export surface for inventory services.

### Existing UI Integration Points
- `app/dashboard/inventory/page.tsx` - Current storage/inventory UI reads `inventory` and has stale writes to `feed_inventory`; useful for understanding migration compatibility.
- `app/dashboard/racao/page.tsx` - Current feed page consumes inventory service data and filters feed stock.
- `app/dashboard/page.tsx` - Dashboard low-stock alerts currently read legacy `inventory` rows.
- `app/dashboard/flocks/page.tsx` - Setup/checklist logic checks `feed_inventory`; this may need compatibility cleanup after schema specialization.

### Prior Phase Context
- `.planning/phases/15-real-health-history-page/15-CONTEXT.md` - Vaccine traceability expectations in health records.
- `.planning/phases/17-dashboard-checklist-and-alerts/17-CONTEXT.md` - Low feed stock alerts depend on inventory data.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `public.handle_updated_at` in `supabase/migrations/00001_initial_schema.sql`: reuse for `updated_at` triggers on new tables.
- `financial_transactions.reference` in `lib/services/finances.ts`: existing idempotent reference pattern should be reused for inventory-generated expenses.
- `lib/services/inventory.ts`: current service boundary can be replaced with typed specialized services while keeping pages insulated from raw Supabase query details.

### Established Patterns
- Supabase RLS policies scope table access through `farm_id` and ownership/profile membership checks.
- Service functions throw Supabase errors and return typed data arrays; new inventory services should follow that shape.
- Database migrations are idempotent where possible, using `create table if not exists`, policy existence checks, and `drop trigger if exists` before trigger creation in newer migrations.

### Integration Points
- New tables must replace or migrate data from legacy `inventory`.
- `feed_inventory` must serve `/dashboard/racao` and future Phase 23 feed tab behavior.
- `vaccine_inventory` should align with Phase 15 vaccine traceability fields in `health_records`.
- `packaging_inventory` feeds Phase 24 packaging UI.
- `inventory_losses` feeds Phase 23 loss modal flow and future operational alerts.
- `financial_transactions` receives automatic purchase expenses through database triggers.

</code_context>

<specifics>
## Specific Ideas

- Default storage locations should be per category, not one global catch-all location.
- Loss reasons should be controlled values, not free text only.
- Loss insertion should reduce quantity immediately so stock balances stay trustworthy.
- Purchase expense references should be table-specific to avoid collisions and duplicates.

</specifics>

<deferred>
## Deferred Ideas

None. Discussion stayed within Phase 22 scope.

</deferred>

---

*Phase: 22-storage-locations-and-inventory-database*
*Context gathered: 2026-06-30*
