# Phase 23: storage-locations-and-feed-ui - Context

**Gathered:** 2026-07-01T12:40:00Z
**Status:** Ready for planning

## Phase Boundary

Implementing the user interfaces for managing specialized storage locations and feed inventory, migrating away from the generic inventory system.

## Implementation Decisions

### Navigation Structure
- **D-01:** /racao only records consumption and should remain that way. Any inventory logging must be done inside /inventory using tabs (Storage Locations, Feed, Vaccines, Packaging).

### Storage CRUD Interaction
- **D-02:** Use Modal forms (standard across the app for CRUD) for managing storage locations and inventory items.

### Feed Transfer Interaction
- **D-03:** Use a Dedicated "Transfer/Adjust" modal (allows moving feed between locations or recording losses).

### the agent's Discretion
None.

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements fully captured in decisions above.

## Existing Code Insights

### Reusable Assets
- `app/dashboard/inventory`: Existing generic inventory module to be migrated.
- `app/dashboard/racao`: Existing feed consumption UI (to remain untouched for consumption logging).
- `components/ui/modal-portal.tsx` and standard modal form components used in flocks/barns CRUD.

### Established Patterns
- Tab-based navigation for sub-features, which will be used in `/inventory`.
- Supabase services (e.g. `lib/services/inventory.ts`, `lib/services/feed.ts`) for data access layer.

### Integration Points
- Sidebar navigation might need an update if inventory tabs replace separate pages.
- Data fetching for modal forms and tabs.

## Specific Ideas

No specific requirements — open to standard approaches.

## Deferred Ideas

None — discussion stayed within phase scope.

---

*Phase: 23-storage-locations-and-feed-ui*
*Context gathered: 2026-07-01T12:40:00Z*
