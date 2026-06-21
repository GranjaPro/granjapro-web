# Phase 17: dashboard-checklist-and-alerts - Context

**Gathered:** 2026-06-21
**Status:** Ready for planning

## Phase Boundary

This phase delivers the surfacing of system alerts directly on the main dashboard. Note that checklist functionality is deferred, keeping the scope strictly to system alerts.

## Implementation Decisions

### Alert Triggers
- **D-01:** Key operational alerts only. The system will trigger alerts for specific critical events: overdue tasks, low feed stock, and sudden mortality spikes.

### Alert Dismissal
- **D-02:** Auto-resolving. Alerts disappear automatically once the underlying issue is fixed (e.g., the overdue task is completed or the feed is logged).

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Scope
- `.planning/PROJECT.md` — Overall project goals and existing integrations
- `.planning/REQUIREMENTS.md` — General requirements context

### Phase Context
- `.planning/phases/16-flock-tasks-crud/16-CONTEXT.md` — Context from the preceding tasks module phase

## Existing Code Insights

### Reusable Assets
- Dashboard component structure: Look at existing cards and layout in the dashboard page to fit the alerts cleanly.
- Shared calendar filter: Alerts may need to be aware of the active farm context, though they typically reflect current state.

### Established Patterns
- Supabase queries: Alerts will be derived dynamically from existing tables (`tasks`, `feed_inventory`, `mortality`) or stored in a dedicated `alerts` table based on cron checks.

### Integration Points
- `tasks` table: For overdue task alerts.
- `feed_inventory` table: For low feed alerts.
- `health_records` / mortality metrics: For mortality spike alerts.

## Specific Ideas

No specific requirements — open to standard approaches for alert presentation (e.g., standard warning/critical banners).

## Deferred Ideas

- Checklist Interaction on the dashboard is deferred; Phase 17 focuses strictly on alerts.
- Informational or non-critical alerts (like upcoming vaccinations without immediate urgency).

---

*Phase: 17-dashboard-checklist-and-alerts*
*Context gathered: 2026-06-21*
