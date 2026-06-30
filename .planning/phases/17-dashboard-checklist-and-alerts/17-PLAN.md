# Phase 17: Dashboard Checklist and Alerts - Implementation Plan

## Objective
Implement auto-resolving system alerts on the main dashboard for key operational metrics: overdue tasks, low feed stock, and sudden mortality spikes. These alerts will be dynamically computed at runtime to eliminate state synchronization issues and ensure they instantly disappear when the underlying issue is resolved.

<threat_model>
- **Threat:** Information Disclosure (Farm A sees Farm B's alerts, tasks, inventory, or mortality data).
  - **Mitigation:** All database queries will strictly enforce the `eq("farm_id", farmId)` condition. Supabase RLS policies are already in place to prevent cross-farm data access.
- **Threat:** Cross-Site Scripting (XSS) via alert messages (e.g., malicious task titles or feed names).
  - **Mitigation:** Rely on React's automatic string escaping in the DOM rendering (`dbAlerts.map(alert => alert.msg)`).
- **Threat:** Privilege Escalation (Accessing dashboard alert endpoints without an active plan).
  - **Mitigation:** Alerts are rendered within the dashboard which is already protected by the `hasMinimumPlan` app-level guard and Supabase RLS.
</threat_model>

## Tasks

### 1. Data Fetching for Dynamic Alerts (app/dashboard/page.tsx)
- Inside the `fetchDashboardData` effect, add the necessary data fetching for the dynamic alerts.
- You can add these queries to the existing `Promise.all` blocks to avoid waterfall delays.
- **Mortality Data:** Query the `mortality` table for records from the last 3 days (`gte('date', threeDaysAgoStr)`).
- **Feed Inventory:** Change the existing `invRes` query (which currently just does a count) to fetch the actual inventory items: `select("id, name, quantity, unit, status")`. The setup check can be updated to use `data.length > 0`.
- **Overdue Tasks:** Query the `tasks` table for one-off tasks (`recurrence = 'unica'`) scheduled before today (`lt('date', todayStr)`). Also fetch `task_exceptions` for these overdue tasks to determine if they were already marked as `done`.

### 2. Dynamic Alerts Evaluation (app/dashboard/page.tsx)
- Process the fetched data and map them into the expected `dbAlerts` array format: `{ id, type, msg, time, action, risk, href }`.
- **Low Feed Alert:** Iterate over the `feed_inventory` data. If `status === 'baixo'`, generate a "danger" alert. If `status === 'alerta'`, generate a "warning" alert.
  - Message: `Estoque baixo/em alerta: ${item.name} (${item.quantity}${item.unit} restante)`.
  - Href: `/dashboard/inventory`.
- **Mortality Spikes Alert:** Iterate over the recent `mortality` data. If `mortality_rate >= 0.5`, generate a "danger" alert.
  - Message: `Pico de mortalidade: ${record.mortality_rate}% em ${record.date}`.
  - Href: `/dashboard/mortality`.
- **Overdue Tasks Alert:** Iterate over the fetched overdue `unica` tasks. Check against the fetched `task_exceptions` to ensure they don't have a `status === 'done'`. For any unresolved overdue task, generate a "danger" alert.
  - Message: `Tarefa atrasada: ${task.title}`.
  - Action: `Resolver`.
  - Href: `#` (or simply anchor to the tasks section of the dashboard).

### 3. State Integration (app/dashboard/page.tsx)
- Combine the dynamically generated alerts (feed, mortality, tasks) with the existing `realAlerts` (from the `alerts` table) and `pending` (setup) alerts.
- Sort the combined alerts array by priority (`danger` first, then `warning`, then `info`) to ensure critical operational alerts surface at the top.
- Call the existing `setDbAlerts` state updater with the final sorted array.

### 4. UI Adjustments (Optional)
- Ensure the `href` routing in the alerts block gracefully handles the anchor link (`#`) for tasks, preventing unwanted full page reloads if the user clicks "Resolver" for an overdue task directly on the dashboard.
