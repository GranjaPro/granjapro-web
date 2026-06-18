# Phase 15: Real Health History Page - Context

**Gathered:** 2026-06-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Connect flock health history timeline and list views directly to the `health_records`, `mortality`, and new `daily_inspections` tables, replacing mock events and hardcoded data fallback. Introduce full traceability for vaccinations/treatments and separate clinical inspection checklists.

</domain>

<decisions>
## Implementation Decisions

### Sanitary Control and Traceability (Treatments and Vaccines)
- **D-01:** Vaccine Traceability: The `health_records` table (when type is 'vaccination') will receive fields for target disease, brand name, batch, expiry date, manufacturer, application route (water, ocular, spray, wing web, intramuscular, subcutaneous), and number of doses.
- **D-02:** Medication Traceability: The `health_records` table (when type is 'treatment') will receive fields for target disease/pathology, active ingredient, dosage/dilution, withdrawal period (days), disposal destination, and prescription/document reference.
- **D-03:** Withdrawal Period Alert: The system will calculate the active egg disposal period (treatment date + withdrawal days) and display a prominent red visual banner on flock screens ("Flock under Sanitarily Withdrawal - Eggs unfit for consumption") during this interval.

### Daily Sanitary Checklist (Clinical Inspections)
- **D-04:** Separate Table: Daily clinical health inspections (simple checklist) will be separated from `health_records` and stored in a new table called `daily_inspections`.
- **D-05:** Checklist Fields: The inspection form in the Health tab will save structured data for feces aspect (Normal, Diarrhea, Blood), respiratory symptoms (None, Snick, Coryza), behavior (Normal, Huddled, Feather Pecking), light timer operation (boolean), water active chlorine (ppm), and pH.
- **D-06:** No Text Scanning: The MVP will abandon key-phrase/regex/AI scanning proposed previously on free-text notes fields to generate the checklist, instead using the structured fields of the `daily_inspections` table directly.

### Mortality and Technical Culling Records
- **D-07:** Mortality/Culling Differentiation: The `mortality` table will differentiate natural mortality from technical culling (removal of severely debilitated or euthanized birds) by adding a corresponding column.
- **D-08:** Updated Causes Dropdown: The mortality cause dropdown in the flock logging screen will include: Natural, Disease, Respiratory, Predators, Heat Stress, Cannibalism/Biting, Technical Culling/Waste, Unknown, and Others.

### MVP Scope (July 2026 Launch)
- **D-09:** Separate Forms: The unified "Field Log" form (egg collection, consumption, and health in 1 minute) is postponed post-MVP. In the MVP, health, mortality, consumption, and egg records will be filled out in their specific modals/pages.
- **D-10:** Fallback and History: Maintain the logic for displaying health history and KPIs based on real data from Supabase.

### the agent's Discretion
- Layout and styling of the alert and withdrawal banners on the interface.
- Implementation of basic validation in treatment and vaccination modals.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Database Schema and Migrations
- `supabase/migrations/00010_health_records.sql` — Schema definition for `health_records` table and RLS policies.
- `supabase/migrations/00001_initial_schema.sql` — Schema definition for `mortality`, `flocks`, and `egg_production` tables.

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
- Mortality causes dropdown already implemented on frontend (mortality record component).

### Integration Points
- `/dashboard/flocks/detalhes/[loteId]/saude` page.
- `/dashboard/flocks/detalhes/[loteId]/historico-sanitario` page.

</code_context>

<specifics>
## Specific Ideas

- The withdrawal calculation must clearly block or flag the commercialization of eggs on the active flock interface.
- The mortality dropdown must be updated to contain the new causes.

</specifics>

<deferred>
## Deferred Ideas

### The Unified Flock Log
- Mobile-first single page quick daily entry form (Production + Consumption + Health + Mortality in < 1 minute) postponed to a later version due to the MVP launch timeline (end of July).

</deferred>

---

*Phase: 15-real-health-history-page*
*Context gathered: 2026-06-16*
