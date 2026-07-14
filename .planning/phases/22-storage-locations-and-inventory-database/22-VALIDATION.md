---
phase: 22
slug: storage-locations-and-inventory-database
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-01
---

# Phase 22 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Next.js build plus SQL migration smoke checks |
| **Config file** | `package.json`, `supabase/migrations/00023_storage_locations_inventory_database.sql` |
| **Quick run command** | `npm run build` |
| **Full suite command** | `npm run build` plus optional `npx supabase db push` when local Supabase is available |
| **Estimated runtime** | ~120 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build`
- **After every plan wave:** Run `npm run build`; run Supabase migration smoke checks when local Supabase is available
- **Before `/gsd-verify-work`:** Build must be green and migration behavior must be reviewed or smoke-tested
- **Max feedback latency:** 120 seconds for TypeScript/build feedback; local Supabase runtime may be slower

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 22-01-01 | 01 | 1 | P22-DB-01/P22-DB-02 | T-22-01/T-22-02 | New tables, default locations, and category validation exist with farm-scoped RLS | build/sql review | `Select-String -Path 'supabase/migrations/00023_storage_locations_inventory_database.sql' -Pattern 'storage_locations','feed_inventory','vaccine_inventory','packaging_inventory','ensure_default_storage_locations'` | yes | pending |
| 22-01-02 | 01 | 1 | P22-DB-03 | T-22-03 | Generated expenses are one-per-inventory item by reference and stale non-positive expenses are removed | build/sql review | `Select-String -Path 'supabase/migrations/00023_storage_locations_inventory_database.sql' -Pattern 'financial_transactions','inventory:feed','inventory:vaccine','inventory:packaging','delete from public.financial_transactions'` | yes | pending |
| 22-01-03 | 01 | 1 | P22-DB-04/P22-DB-05 | T-22-04/T-22-05 | Loss inserts decrement stock atomically and linked locations deactivate instead of deleting history | build/sql review | `Select-String -Path 'supabase/migrations/00023_storage_locations_inventory_database.sql' -Pattern 'inventory_losses','sanitary_disposal','manual_adjustment','before delete','inactive'` | yes | pending |
| 22-02-01 | 02 | 2 | P22-TS-01 | T-22-06/T-22-08 | New table types are strict and expose no `any` | build/type | `$matches = Select-String -Path 'lib/database.types.ts' -Pattern '\bany\b'; if ($matches) { throw 'database.types.ts contains any' }` | yes | pending |
| 22-02-02 | 02 | 2 | P22-TS-01 | T-22-06/T-22-09 | Inventory service uses typed specialized tables and leaves generated expenses to triggers | build/type | `$matches = Select-String -Path 'lib/services/inventory.ts' -Pattern '\bany\b|Record<string'; if ($matches) { throw 'inventory.ts contains any or Record<string>' }` | yes | pending |
| 22-02-03 | 02 | 2 | P22-COMPAT-01 | T-22-07 | Existing inventory consumers compile against `feed_inventory` compatibility without Phase 23/24 tab scope | build/type | `npm run build` | yes | pending |

*Status: pending, green, red, flaky*

---

## Wave 0 Requirements

- [ ] Confirm whether local Supabase is available for `npx supabase db push`.
- [ ] If local Supabase is unavailable, document skipped runtime SQL smoke checks in the plan summary and rely on SQL review plus `npm run build`.
- [ ] If local Supabase is available, create a temporary SQL smoke checklist for default locations, generated expenses, stock loss decrement, and safe location deletion before phase verification.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Migration applies cleanly to Supabase | P22-DB-01 through P22-DB-05 | Local Supabase may be unavailable in this environment | Run `npx supabase db push`; then insert sample farm/location/inventory/loss rows and verify trigger results. |
| Safe location deletion behavior | P22-DB-05 | Requires database trigger execution | Delete an empty location and confirm physical delete; delete a linked location and confirm `status = 'inactive'`. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all missing references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s for build/type feedback
- [ ] `nyquist_compliant: true` set in frontmatter after execution validates the phase

**Approval:** pending
