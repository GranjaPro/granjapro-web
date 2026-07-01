---
status: resolved
phase: 22-storage-locations-and-inventory-database
resolved: 2026-07-01T18:12:46Z
---

# Debug Session: delete-feed-missing-expense

## Issue
Deleting a previously added feed inventory item successfully removes it from the list, but testing if the associated financial expense transaction is automatically deleted was blocked because the financial expense was not generated in the first place. The feed addition form was missing a price field.

## Root Cause Analysis
1. The `feed_inventory` table has a trigger that calls `public.sync_inventory_purchase_expense`.
2. The trigger relies on `total_cost` or `quantity * unit_cost` being greater than 0 to generate a `financial_transaction`.
3. In `app/dashboard/inventory/page.tsx`, the shared add/edit modal lacked inputs for `valorEstoque`, `quantidade`, and `unidade`.
4. Because the price field was missing from the UI, `total_cost` was inserted as null or 0.
5. The trigger skipped inserting into `financial_transactions` because the amount was 0 or null.
6. Since the transaction was never created, deletion cleanup could not be verified through UAT.

## Files Involved
- `app/dashboard/inventory/page.tsx`: the form/modal lacked inputs for `valorEstoque`, `quantidade`, and `unidade`.
- `supabase/migrations/00023_storage_locations_inventory_database.sql`: contains the trigger logic that skips zero or null generated amounts.

## Suggested Fix
Update the add/edit modal in `app/dashboard/inventory/page.tsx` to include inputs for `valorEstoque`, `quantidade`, and `unidade`.

## Resolution
- Implemented the missing `Quantidade`, `Unidade`, and `Valor Total (R$)` inputs in the shared add/edit modal in `app/dashboard/inventory/page.tsx`.
- The existing save payload already sends `quantity`, `unit`, and `total_cost`.
- Verified with targeted `Select-String` checks and `npm run build`.
