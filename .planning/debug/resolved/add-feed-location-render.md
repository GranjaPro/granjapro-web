---
status: resolved
phase: 22-storage-locations-and-inventory-database
resolved: 2026-07-01T18:12:46Z
---

# Debug: Add Feed Location and Rendering

## Gap
Adding a new feed inventory item via the Feed page form succeeds and the new item appears in the list.
Actual: Ao adicionar ração a localização deve ser um select com os galpões de armazenamento de ração existentes registrados dentro /inventory, ou o usuário seleciona uma opção "Sem local definido" caso não tenha galpão criado ainda. O registro pela página de ração está funcionando corretamente, mas não está renderizando na página de ração no componente correspondente.

## Investigation

1. **Location Input (Text -> Select)**:
   - In `app/dashboard/racao/page.tsx`, the `localizacao` field in the add stock form (around line 1747) is an `<input type="text">`.
   - It needs to be changed to a `<select>` element.
   - The options should come from the `storage_locations` table where `category === 'feed'`.
   - Currently, `storage_locations` is not being fetched in `app/dashboard/racao/page.tsx`. A new fetch call `getLocations(farmId, 'feed')` needs to be added and stored in state (`locations` or similar) to populate the select.

2. **Item Not Rendering**:
   - The newly added item is sent to the database via `createInventoryItem` (called with `categoria: "Ração"` as per the default state `estoqueForm.categoria`).
   - The `createInventoryItem` saves this as `feed_category: "Ração"` and `feed_type: "Ração"`.
   - When loading data, `getFeedInventory` fetches the rows. `mapFeedInventoryRow` sets the mapped `type` to `"Ração"`.
   - In `app/dashboard/racao/page.tsx` (around line 349), the inventory is mapped and filtered:
     ```typescript
     const mappedInv: ItemEstoque[] = inventoryData
       .filter((d: FeedInventoryCompatibilityRow) => d.type === "racao")
     ```
   - Since `"Ração" !== "racao"`, the newly added item is filtered out and does not render.
   - Because `getFeedInventory` already exclusively queries the `feed_inventory` table, this `.filter` is completely unnecessary (all items are feed). Alternatively, the filter could be made case-and-accent-insensitive, or the form's default `categoria` could be changed to `"racao"`. But removing the filter is the safest since it's already the feed table.

## Suggested Fix
1. Fetch `storage_locations` (where `category === 'feed'`) in `loadData` and store in state.
2. Replace the location text input with a `<select>` that maps the fetched locations and adds a "Sem local definido" option.
3. Remove the `.filter((d) => d.type === "racao")` logic in `app/dashboard/racao/page.tsx` when processing `inventoryData`, as all items returned by `getFeedInventory` are inherently feed items.

## Resolution
- Implemented in `app/dashboard/racao/page.tsx`.
- Verified with targeted `Select-String` checks for `storageLocations`, `location_id`, `total_cost`, and absence of the stale `type === "racao"` filter.
- Verified with `npm run build`.
