# Phase 15: Real Health History Page - Context

**Gathered:** 2026-06-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Connect flock health history timeline and list views directly to the `health_records` and `mortality` tables, removing mock events and hardcoded data fallback.

</domain>

<decisions>
## Implementation Decisions

### Fallback/Empty State
- **D-01:** If a flock has no database health records and no mortality records, show a clean empty state card ("Nenhum registro de saúde encontrado para este lote").
- **D-02:** The empty state card will feature a direct redirect button that links to the main Health page (`/dashboard/health?register=true`) with the current flock ID pre-selected in the query parameters so the user can easily log their first record.
- **D-03:** If a flock has mortality records but no health records, the pages will render the full layout rather than the empty state, calculating the health score based on the available mortality data.
- **D-04:** Both the flock details health dashboard (`saude/page.tsx`) and the sanitary history timeline (`historico-sanitario/page.tsx`) will share the same empty state logic and UI layout for design consistency.
- **D-05:** In empty or low-data states, the "Padrões identificados" (Identified Patterns) card will be hidden entirely to avoid cluttering the view with insufficient context.

### Mortality Event Integration
- **D-06:** Fetch records from the `mortality` database table for the flock and merge them into the timeline as `"mortalidade"` events to keep the history comprehensive.
- **D-07:** Format mortality timeline events with the title `"Mortalidade registrada: X aves"` (displaying the dead bird count) and place the cause of death and notes in the description/observation field.
- **D-08:** Calculate the weekly mortality count and mortality rate KPIs on the flock health page dynamically using database records for the active date range or the last 7 days.
- **D-09:** Include mortality in the health score calculation with a 40% weight, reusing the existing mock logic (where rate <= 2% is a perfect score and rate >= 10% is 0) with real database metrics.

### Checklist Generation for Inspections
- **D-10:** Generate a standard 12-item checklist (covering temperature, ventilation, feed, water, bedding, behaviour, clinical signs, mortality, egg quality, lighting, biosecurity, and equipment) for database inspection records, defaulting all items to "Ok" (true).
- **D-11:** Dynamically scan the `notes` and `title` fields of inspection/treatment records for keywords (e.g. "pena", "ventilação", "sintoma") to flag specific checklist parameters as false (abnormal).
- **D-12:** If the database status of an inspection is not 'completed' (e.g. 'in_progress', 'scheduled', or 'upcoming'), render all checklist items as unchecked/pending in the UI.
- **D-13:** Calculate the compliance rate percentage dynamically based on the ratio of 'Ok' items to total items, displaying "Pendente" for non-completed inspections.

### Treatment Duration and Results
- **D-14:** Parse treatment duration dynamically from the `notes` field (e.g., matching expressions like "5 dias" or "1 semana") and add it to the start date to compute the end date. Default to "—" (same-day event) if no duration is found.
- **D-15:** Map database status to UI `resultado` as follows: 'completed' -> `"resolvido"`, 'in_progress' -> `"em_tratamento"`, and other statuses -> `"parcial"`.
- **D-16:** Enable full write integration on the flock-specific health page (`saude/page.tsx`) by wiring the Edit modal to trigger actual Supabase `.update()` calls.
- **D-17:** Implement the "Resolve symptom" action by performing an actual Supabase update to set the status of all corresponding in-progress health records that mention the resolved symptom to 'completed'.

### the agent's Discretion
- Standard layout styling for the empty state.
- Keyword lists used for flagging checklist parameters (e.g., mapping "temperatura" to temperature, "ventilação" to ventilation, "ração" to feed, "água" to water, "penas" or "bicagem" or "sintoma" to clinical signs/behavior).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap and Milestones
- `.planning/ROADMAP.md` — Project milestones index.
- `.planning/milestones/v1.3-ROADMAP.md` — Milestone v1.3 goals and definitions.

### Database Schema and Migrations
- `supabase/migrations/00010_health_records.sql` — Schema definition for `health_records` table and RLS policies.
- `supabase/migrations/00001_initial_schema.sql` — Schema definition for `mortality` and `flocks` tables.

### Codebase Entry Points
- `app/dashboard/flocks/detalhes/[loteId]/saude/page.tsx` — Flock health details page.
- `app/dashboard/flocks/detalhes/[loteId]/historico-sanitario/page.tsx` — Flock health history timeline and lists page.

### TypeScript and Service Layers
- `lib/database.types.ts` — TypeScript definitions for database entities.
- `lib/services/health.ts` — Data access layer service for health records.
- `lib/services/mortality.ts` — Data access layer service for mortality records.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/services/health.ts`: Database client helper functions for fetching, inserting, and updating health records.
- `lib/services/mortality.ts`: Database client helper functions for fetching and managing mortality.
- `cn` utility from `lib/utils.ts` for styling composition.

### Established Patterns
- Client component data fetching patterns inside `useEffect` using `createClient()` from `@/lib/supabase/client` and route parameters `useParams()`.
- Recharts `ComposedChart` structure with area and line mapping for displaying dynamic scores over time.

### Integration Points
- `/dashboard/flocks/detalhes/[loteId]/saude` page.
- `/dashboard/flocks/detalhes/[loteId]/historico-sanitario` page.

</code_context>

<specifics>
## Specific Ideas

- Keyword mapping scans should be case-insensitive and check both `title` and `notes` properties.
- Ensure the redirect link includes `?register=true` and `&flockId=...` or equivalent parameter to automatically select the dynamic flock on the `/dashboard/health` page.

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope.

</deferred>

---

*Phase: 15-real-health-history-page*
*Context gathered: 2026-06-14*
