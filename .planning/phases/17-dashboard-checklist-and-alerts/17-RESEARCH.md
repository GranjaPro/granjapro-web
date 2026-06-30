# Phase 17: Dashboard Checklist and Alerts - Research

## Context Summary
- Phase 17 focuses on surfacing system alerts directly on the main dashboard.
- The interactive checklist functionality on the dashboard is deferred.
- Required alerts to implement: **Overdue tasks**, **Low feed stock**, **Sudden mortality spikes**.
- Alerts must be **auto-resolving**: they should disappear automatically once the underlying issue is fixed.
- Banners should follow standard warning/critical styling.

## Key Findings in the Codebase
1. **Existing Alert Infrastructure:**
   - There is already a mocked "Alertas ativos" block in `app/dashboard/page.tsx` that uses a local state array `dbAlerts`.
   - `dbAlerts` is currently populated by querying the physical `alerts` table (`alertsRes`) and combining it with onboarding `setupAlerts`.
   - The `alerts` table exists (`00001_initial_schema.sql` line 559) and is queryable via `lib/services/alerts.ts`.

2. **The "Auto-Resolving" Decision:**
   - If we store these operational alerts in the physical `alerts` table, we must write state synchronization code (PostgreSQL triggers or scattered API logic) to resolve them when a task is completed, feed is bought, or mortality is fixed. This adds significant complexity and risk of state desync.
   - **Recommendation:** Derive these three specific operational alerts *dynamically* at runtime inside `app/dashboard/page.tsx`'s data-fetching effect, alongside the standard `alertsRes` fetch. Since they reflect current database state, calculating them on the fly guarantees they are always accurate and auto-resolve instantly when the user fixes the issue, perfectly matching the project's KISS and Zero-state-sync philosophy.

3. **How to Calculate the Triggers Dynamically (in `app/dashboard/page.tsx`):**
   - **Overdue Tasks:** 
     - We can fetch tasks scheduled for prior dates and check `task_exceptions` to see if they were missed.
   - **Low Feed Stock:**
     - Query the `feed_inventory` table (`supabase.from("feed_inventory").select("*").eq("farm_id", farmId)`).
     - Generate a "danger" alert if any feed item has `status === 'baixo'`, or a "warning" if `status === 'alerta'`.
   - **Mortality Spikes:**
     - Fetch recent records from the `mortality` table (`supabase.from("mortality").select("*").eq("farm_id", farmId).gte("date", recentDate)`).
     - Define a clear threshold (e.g., `mortality_rate >= 0.5%` or a specific number of `dead_birds` in a single day).
     - Surface a "danger" alert if the threshold is met.

4. **UI Integration:**
   - The UI rendering logic already exists perfectly in `app/dashboard/page.tsx` via `dbAlerts.map(...)`.
   - We just need to map our dynamic checks into the same format expected by `setDbAlerts`:
     `{ id: string, type: "danger" | "warning" | "info", msg: string, time: string, action: string, href?: string }`.
   - Example representations:
     - *Overdue Task:* `{ type: "danger", msg: "Tarefa atrasada: Coleta de Ovos", action: "Resolver", href: "#" }`
     - *Low Feed:* `{ type: "warning", msg: "Estoque baixo: Ração Inicial (50kg restante)", action: "Ver estoque", href: "/dashboard/inventory" }`

## Planning Recommendations
- **Action Plan:** Update `app/dashboard/page.tsx` inside the `fetchDashboardData` effect to perform the three dynamic checks.
- Map the results into the `dbAlerts` state array along with any physical alerts.
- **No database migrations** are required for this phase.
- Do not build UI for interactive checklists on the dashboard; rely entirely on the native alerts section to display pending critical actions.
