# Granja Pro

## What This Is

Granja Pro is a SaaS farm management platform for poultry egg producers. It serves as the daily control center of the farm — helping small and medium egg farmers monitor production, track feed and mortality, manage finances, and make better operational decisions. Mobile-first, designed for smartphone use in farm environments.

## Core Value

Help egg farmers simplify daily farm management and improve financial control — the platform must be fast, intuitive, and useful every single day.

## Current State

- v1.2 **Dark Theme & Granular Permissions** shipped on 2026-06-02.
- v1.1 **Google Sign-In** shipped on 2026-05-06.
- v1.0 **Finances Module + Calendar Sync** shipped on 2026-05-01.
- Dashboard now features a native dark theme foundation.
- Plan-based permissions are centralized in `lib/plans.ts` and enforced via root middleware and Supabase RLS policies.
- Trial expiration vulnerability from v1.1 is resolved with server-side and database-level guards.
- Known accepted closeout gaps: AI security guards and credit persistence deferred; pre-v1.0 verification artifacts missing; Phase 5 validation debt.

<details>
<summary>Previous Milestone Details (v1.0 - v1.2)</summary>

- Financial KPIs, charts, and transaction management use Supabase-backed data.
- Dashboard and finances pages share a unified date-filter context.
- Google Sign-In with terms gate and account continuity is fully integrated.
- Permissons/Limits defined for Essencial, Pro, and Premium tiers.
- Route guards protect /dashboard/workers and /dashboard/reports for Pro/Premium users.

</details>

## Next Milestone Goals

- Define the core objective for v1.3 (e.g., Reports/Export, Workers Management, or Advanced Analytics).
- Implement deferred AI security and usage limits if prioritized.
- Address accumulated tech debt or verification gaps if requested.

## Requirements

### Validated

- ✓ Authentication (login, signup, password recovery) — existing
- ✓ Onboarding wizard (farm info, barns, birds, breed) — existing
- ✓ Farm and barn management (registration, capacity, production system) — existing
- ✓ Flock management (breed, arrival date, bird count, barn assignment) — existing
- ✓ Egg production tracking (daily input, broken/dirty/discarded, laying rate, trends) — existing
- ✓ Feed management (quantity, cost, type, feed per flock, cost per egg) — existing
- ✓ Mortality tracking (dead birds, suspected cause, mortality rate, trends) — existing
- ✓ Health records (vaccinations, treatments, inspections) — existing
- ✓ Customer management (markets, restaurants, distributors, direct buyers) — existing
- ✓ Sales tracking (quantity, egg type, price, payment status) — existing
- ✓ Dashboard with KPIs (production, laying rate, birds, mortality, financials) — existing
- ✓ Inventory management — existing
- ✓ Equipment management — existing
- ✓ Financial management — Supabase-backed KPIs, charts, transaction CRUD, and sales-to-revenue create sync — v1.0
- ✓ Shared calendar filter across dashboard surfaces — v1.0

- [x] Google sign-in entry points on login and signup pages - v1.1
- [x] Signup terms gate before Google sign-up - v1.1
- [x] Google OAuth callback account/farm continuity and onboarding routing - v1.1

### Active

- [ ] Dark dashboard theme without system-theme fallback
- [ ] Persisted `profiles.plan` subscription tier in Supabase schema and migrations
- [ ] Central permission matrix for Essencial, Pro, and Premium capabilities
- [ ] Shared UI helpers for locked content that avoid exposing protected data unnecessarily
- [ ] Route/API guard foundations for Pro/Premium routes and AI tiers
- [ ] Real usage-limit foundations for users, birds, farms, tasks, insights, and AI credits
- [ ] Decide and implement sale edit/delete revenue sync behavior
- [ ] Replace accepted verification gaps with formal Phase 1-3 verification artifacts if needed
- [ ] Decide whether to backfill Phase 5 validation/UAT debt or leave it as accepted milestone debt
- [ ] Revenue goals stored in the database instead of a hardcoded default
- [ ] Advanced analytics (cost per egg, feed-cost sync, period comparisons)

### Out of Scope

- Custom backend server — Supabase handles all backend needs
- Real-time chat — not core to farm management
- Mobile native app — web-first, mobile later
- Reports/export — deferred (marked as Pro feature)
- Workers management — deferred (marked as Pro feature)
- Notifications/alerts system — deferred to future milestone

## Next Milestone Goals

- Implement the dark-theme foundation before broad visual polishing.
- Turn plan gating from scattered UX-only checks into a reusable permission model.
- Keep payment processor integration out of scope unless needed for plan persistence.
- Leave accepted v1.0 and v1.1 closeout debts documented unless directly touched by this milestone.

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
