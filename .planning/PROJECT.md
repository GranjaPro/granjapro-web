# Granja Pro

## What This Is

Granja Pro is a SaaS farm management platform for poultry egg producers. It serves as the daily control center of the farm — helping small and medium egg farmers monitor production, track feed and mortality, manage finances, and make better operational decisions. Mobile-first, designed for smartphone use in farm environments.

## Core Value

Help egg farmers simplify daily farm management and improve financial control — the platform must be fast, intuitive, and useful every single day.

## Current State

- v1.0 **Finances Module + Calendar Sync** shipped on 2026-05-01.
- Financial KPIs, charts, and transaction management now use Supabase-backed data instead of mock values.
- Dashboard and finances pages share the same date-filter source of truth.
- Known accepted closeout gaps: missing Phase 1-3 `VERIFICATION.md` artifacts, and sale edit/delete does not sync linked revenue transactions.

## Current Milestone: v1.1 Google Sign-In

**Goal:** Add focused Google authentication using Supabase.

**Target features:**
- Google sign-in on login and signup pages
- Auto-create/authenticate users through Google
- Preserve the existing post-login app behavior after successful sign-in

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

### Active

- [ ] Google login authentication
- [ ] Google sign-in available on login and signup pages
- [ ] Auto-create/authenticate users through Google with the existing app flow
- [ ] Decide and implement sale edit/delete revenue sync behavior
- [ ] Replace accepted verification gaps with formal Phase 1-3 verification artifacts if needed
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

- Add Google sign-in to the login and signup flows.
- Define the required Supabase provider configuration and post-login routing for social sign-in.
- Keep this milestone focused on Google auth without broad auth-system rewrites.
- Decide whether accepted v1.0 gaps become follow-up work or remain documented tech debt.

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

## Evolution

This document evolves at milestone boundaries as shipped capabilities become part of the stable product surface.

---
*Last updated: 2026-05-01 after v1.1 milestone initialization*
