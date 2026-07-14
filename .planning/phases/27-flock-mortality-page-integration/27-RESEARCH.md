# Phase 27: Flock Mortality Page Integration - Research

## Scope

Connect `/dashboard/flocks/detalhes/[loteId]/mortalidade` to live Supabase data for the active farm and selected flock, replacing page-local mock fixtures with real mortality records, metrics, charts, and CRUD writes.

## Existing Assets

- `app/dashboard/flocks/detalhes/[loteId]/mortalidade/page.tsx` currently owns the full UI but still uses `lotesMortalidade` mock data and local-only add/edit/delete state.
- `app/dashboard/mortality/page.tsx` already shows the real data pattern for mortality records: it fetches flocks, barns, and mortality rows filtered by `farm_id`, maps DB rows into the UI model, computes KPIs/charts from records, and writes to `mortality`.
- `app/dashboard/flocks/detalhes/[loteId]/saude/page.tsx` and `historico-sanitario/page.tsx` show the flock-detail guard pattern: use `useAuth`, `useParams`, fetch the selected flock with both `id` and `farm_id`, track loading/not-found states, then query `mortality` by `farm_id` and `flock_id`.
- `lib/services/mortality.ts` already exports typed create/update/delete functions and farm/date range fetches, but it does not yet expose a flock-specific fetch helper.
- `lib/services/index.ts` already re-exports mortality services and should re-export any new helper.

## Data Model Notes

- `mortality` has `farm_id`, `flock_id`, `barn_id`, `date`, `dead_birds`, `cause`, `notes`, `mortality_rate`, and `mortality_type`.
- `flocks` provides `code`, `bird_count`, and `barn_id`; `barns` provides display names for the form/table.
- RLS policies already exist for `mortality`; client queries must still include both `farm_id` and `flock_id` to avoid cross-farm leakage and accidental wrong-lot records.

## Recommended Plan Shape

- One execution plan is enough. This is a vertical integration of one existing page plus one service helper.
- Keep UI structure intact; replace data source and handlers rather than redesigning the page.
- Add `getMortalityByFlock(farmId, flockId)` to reuse service style and keep this phase aligned with the CONTEXT.md requirement to use `lib/services/mortality.ts`.
- Prefer typed row aliases from `Tables<"mortality">`, `TablesInsert<"mortality">`, and `TablesUpdate<"mortality">`. Do not introduce `any`.

## Risks

- The page currently uses numeric mock IDs; DB rows use string UUIDs. The plan must update local types and delete/edit state accordingly.
- The mock page derives several analytics from fixed aggregate fixtures. The implementation must derive those values from DB rows and the fetched flock `bird_count`.
- If the selected flock is missing or not owned by the active farm, the page must render the existing not-found style rather than silently showing fallback mock data.

## Verification

- `npm run build` is the primary automated verification available in this project.
- Focused grep checks should ensure the mock fixture is gone, the new service helper exists, and the page queries/writes through the service layer.

## RESEARCH COMPLETE
