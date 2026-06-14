# Phase 13 Context: Water Consumption Module & Feed Targets

## Decisions

1. **Separation of Concerns**: Feed (`/dashboard/racao`) and Water (`/dashboard/agua`) will be separate pages.
2. **Naming (Portuguese)**:
   - Feed Page: "Gestão de Ração" (Keep existing).
   - Water Page: "Consumo de Água".
3. **Database Architecture**:
   - Create a new table `water_consumption` instead of adding a column to `feed_consumption`.
   - Schema: `id`, `farm_id`, `barn_id`, `flock_id`, `date`, `quantity_liters`, `created_at`.
4. **Data Entry**: Water consumption will be recorded directly on the new Water page (`/dashboard/agua`). The Feed modal will NOT include water inputs.
5. **Plan Gating**:
   - The Water page (`/dashboard/agua`) is exclusive to **Pro** and **Premium** plans.
   - The Feed page (`/dashboard/racao`) remains available for all plans.
6. **Metrics & Targets**:
   - **Feed**: Implement visual indicators for the 110g-130g/bird/day target on the Feed page.
   - **Water**: Use general average metrics for the MVP on the Water page KPIs.
7. **Charts**:
   - The Feed page chart currently shows "Consumo Ração x Água".
   - **Decision**: Keep the comparison chart on the Feed page. For Pro/Premium users, it will pull real data from the new `water_consumption` table. For "Essencial" users, the water line will be hidden/locked or replaced with an upgrade prompt.

## Gray Areas Resolved

- **Renaming**: No renaming of the Feed page; new "Consumo de Água" page created.
- **Water Input**: Mandatory on the Water page; removed from the Feed registration concept.
- **Gating**: Strictly enforced at the route and UI level for the Water page.

## Next Steps

1. Run migration for `water_consumption` table and RLS policies.
2. Implement 110g-130g feed target logic on `/dashboard/racao`.
3. Create `/dashboard/agua` page with:
   - Plan-based access control.
   - Data Entry (Modal).
   - KPIs (Consumption, Avg per bird).
   - Chart (Consumption over time).
4. Update Sidebar and Mobile Nav to include the new "Água" link (Pro/Premium only).
