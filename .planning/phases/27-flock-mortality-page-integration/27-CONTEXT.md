# Phase 27: Flock Mortality Page Integration - Context

**Gathered:** 2026-06-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Connect the flock-specific mortality page `/dashboard/flocks/detalhes/[loteId]/mortalidade` directly to the Supabase database, replacing mock statistics, charts, tables, and forms with real data retrieved from the database.

</domain>

<decisions>
## Implementation Decisions

### Flock Mortality Database Integration
- **D-01:** Real Data Fetching: Retrieve all mortality records from the `mortality` table for the specified `flock_id` (`loteId`) and `farm_id`.
- **D-02:** Live Form Submission: Wire the add/edit/delete modal forms to make real inserts, updates, and deletes to the `mortality` table via `lib/services/mortality.ts`.
- **D-03:** Dynamic KPIs: Calculate total deaths, mortality rate (deaths / (active birds + deaths)), weekly deaths, and monthly deaths dynamically from real DB records.
- **D-04:** Dynamic Charts: Render the Recharts area chart (weekly trend) and bar chart (monthly comparison) based on actual logs grouped by date/month.

</decisions>

<canonical_refs>
## Canonical References

### Database Schema and Migrations
- `supabase/migrations/00001_initial_schema.sql` — Schema definition for the `mortality` table.

### Codebase Entry Points
- `app/dashboard/flocks/detalhes/[loteId]/mortalidade/page.tsx` — Flock mortality details page.

### TypeScript and Service Layers
- `lib/database.types.ts` — TypeScript definitions for database entities.
- `lib/services/mortality.ts` — Data access layer service for mortality records.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/services/mortality.ts`: Contains functions to fetch, create, update, and delete mortality records.
- `app/dashboard/mortality/page.tsx`: Contains references to real database connections and charts that can be adapted for flock-specific views.

</code_context>

<specifics>
## Specific Ideas

- Ensure that any change made to the flock count or active birds count on mortality logs matches the database state.
- Handle empty states gracefully if there are no mortality records logged for a given flock.

</specifics>
