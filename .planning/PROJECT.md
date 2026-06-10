# Granja Pro

## What This Is

Granja Pro is a SaaS farm management platform for poultry egg producers. It serves as the daily control center of the farm — helping small and medium egg farmers monitor production, track feed and mortality, manage finances, and make better operational decisions. Mobile-first, designed for smartphone use in farm environments.

## Core Value

Help egg farmers simplify daily farm management and improve financial control — the platform must be fast, intuitive, and useful every single day.

## Current State

- v1.3 **Inventory, Tasks & UI Consolidation** in progress.
- v1.2 **Dark Theme & Granular Permissions** shipped on 2026-06-02.
- v1.1 **Google Sign-In** shipped on 2026-05-06.
- v1.0 **Finances Module + Calendar Sync** shipped on 2026-05-01.
- Dashboard features a native dark theme foundation.
- Plan-based permissions are centralized in `lib/plans.ts` and enforced via root middleware and Supabase RLS policies.
- Trial expiration vulnerability is resolved with server-side and database-level guards.
- Known accepted closeout gaps: AI security guards and credit persistence deferred; pre-v1.0 verification artifacts missing; Phase 5 validation debt.

<details>
<summary>Previous Milestone Details (v1.0 - v1.2)</summary>

- Financial KPIs, charts, and transaction management use Supabase-backed data.
- Dashboard and finances pages share a unified date-filter context.
- Google Sign-In with terms gate and account continuity is fully integrated.
- Permissons/Limits defined for Essencial, Pro, and Premium tiers.
- Route guards protect /dashboard/workers and /dashboard/reports for Pro/Premium users.

</details>

## Next Milestone Goals (v1.3)

- **Inventory Integration**: Full database connection for the inventory management page.
- **Form Standardization**: Centralized form components with Zod validation schemas across all registration forms.
- **Task System**: Dedicated management for recurring and manual farm tasks.
- **Notifications System**: In-app alerts for low stock, productivity drops, and task deadlines.
- **Reports Refinement**: Optimized PDF/CSV exports and data integration for all report types.
- **KPI Customization**: Interactive metrics and goals that users can personalize.
- **Code Consolidation**: Refactor large dashboard pages into reusable, atomic components.

## Requirements

### Validated

- ✓ Authentication (login, signup, password recovery)
- ✓ Onboarding wizard (farm info, barns, birds, breed)
- ✓ Farm and barn management (registration, capacity, production system)
- ✓ Flock management (breed, arrival date, bird count, barn assignment)
- ✓ Egg production tracking (daily input, broken/dirty/discarded, laying rate, trends)
- ✓ Feed management (quantity, cost, type, feed per flock, cost per egg)
- ✓ Mortality tracking (dead birds, suspected cause, mortality rate, trends)
- ✓ Health records (vaccinations, treatments, inspections)
- ✓ Customer management (markets, restaurants, distributors, direct buyers)
- ✓ Sales tracking (quantity, egg type, price, payment status)
- ✓ Dashboard with KPIs (production, laying rate, birds, mortality, financials)
- ✓ Inventory management — database integrated in v1.3
- ✓ Equipment management
- ✓ Financial management — Supabase-backed KPIs, charts, transaction CRUD
- ✓ Shared calendar filter across dashboard surfaces
- ✓ Google sign-in entry points and signup terms gate
- ✓ Dark dashboard theme without system-theme fallback
- ✓ Plan persistence and central permission matrix
- ✓ Route/API guard foundations for Pro/Premium routes

### Active

- [ ] Centralized `RegistrationForm` component with Zod validation schemas
- [ ] Inventory page full Supabase integration (CRUD + status tracking)
- [ ] Task management in dashboard with scheduling and completion tracking
- [ ] Real-time notification system for critical farm events
- [ ] PDF/CSV export optimization for the Reports page
- [ ] Clickable/Customizable KPI goals on all kpis in app
- [ ] Page-to-component refactor for Inventory and Reports
- [ ] Advanced analytics (cost per egg, feed-cost sync, period comparisons)

### Out of Scope

- Custom backend server — Supabase handles all backend needs
- Real-time chat — not core to farm management
- Mobile native app — web-first, mobile later
- Workers management — deferred (marked as Pro feature)
- Payment processor integration — using internal tier management for now

## Context

- Brownfield project — most MVP modules are already built and functional.
- Frontend: Next.js + React + TailwindCSS + TypeScript.
- Backend: Supabase (PostgreSQL, Auth, Storage, Realtime).
- Charts: Recharts (mandatory per project rules).
- All database tables use `farm_id` with Row Level Security (RLS).
- Target user: farmer on smartphone, sometimes with limited connectivity and low tech familiarity.
- UI must remain mobile-first, with large touch-friendly elements and an agritech green/earth palette.
- The financial workflow now relies on `financial_transactions` as the single revenue/expense source for dashboard and finances reporting.
- Key database tables: users, farms, barns, flocks, egg_production, feed_consumption, inventory, mortality, health_records, financial_transactions, customers, sales, tasks, alerts.

## Constraints

- **Tech stack**: Next.js + Supabase only, no custom backend server.
- **UI rule**: Do not change existing UI designs unless a future milestone explicitly requires it.
- **Security**: All data access must be protected by Supabase RLS, each farm sees only its own data.
- **Charts**: All charts must use Recharts.
- **Simplicity**: Avoid overengineering, prefer minimal implementations.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase as sole backend | Reduces complexity, faster iteration | ✓ Good |
| Shared calendar context | Prevents duplicated calendar code across 5+ pages | ✓ Good |
| No UI changes for the financial milestone | Focus on data integration and bug fixes | ✓ Good |
| Revenue source: `financial_transactions` only | Prevents double-counting between sales and finances views | ✓ Good |
| Revenue sync uses `reference: sale:{id}` | Creates idempotent sale-to-revenue inserts | ⚠ Revisit for edit/delete lifecycle |
| Google OAuth stays provider-owned in Supabase | Avoids custom auth backend and account merge UI | Good |
| Callback redirects sanitize `next` before dashboard routing | Prevents open redirects while preserving email confirmation flow | Good |
| Plan gating must move behind a central permission matrix | Scattered component checks are hard to audit and easy to bypass | Active |
| Dark theme should be app-controlled, not delegated to system preference | User requested removing the system theme mode for this milestone | Active |

## Evolution

This document evolves at milestone boundaries as shipped capabilities become part of the stable product surface.

---
*Last updated: 2026-05-06 after v1.2 milestone initialization*
