# Granja Pro

## What This Is

Granja Pro is a SaaS farm management platform for poultry egg producers. It serves as the daily control center of the farm — helping small and medium egg farmers monitor production, track feed and mortality, manage finances, and make better operational decisions. Mobile-first, designed for smartphone use in farm environments.

## Core Value

Help egg farmers simplify daily farm management and improve financial control — the platform must be fast, intuitive, and useful every single day.

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

### Active

- [ ] Financial management — full integration with Supabase (revenue tracking, expense tracking, cash flow, monthly profit, cost per egg)
- [ ] Shared calendar filter — synchronize date filters across all dashboard pages via shared component
- [ ] Calendar sync verification — ensure all pages (dashboard, production, racao, mortality, health) properly respond to calendar date range changes

### Out of Scope

- Custom backend server — Supabase handles all backend needs
- Real-time chat — not core to farm management
- Mobile native app — web-first, mobile later
- Advanced analytics/AI — deferred to future milestone
- Reports/export — deferred (marked as Pro feature)
- Workers management — deferred (marked as Pro feature)
- Notifications/alerts system — deferred to future milestone

## Context

- Brownfield project — most MVP modules are already built and functional
- Frontend: Next.js + React + TailwindCSS + TypeScript
- Backend: Supabase (PostgreSQL, Auth, Storage, Realtime)
- Charts: Recharts (mandatory per project rules)
- All database tables use `farm_id` with Row Level Security (RLS)
- Target user: farmer on smartphone, sometimes with limited connectivity and low tech familiarity
- UI must be mobile-first, large touch-friendly elements, agritech green/earth color palette
- The finances page currently uses mock/hardcoded data and needs Supabase integration
- Calendar filter component is being extracted into a shared component (`components/date-filter/`) to sync across pages
- Key database tables: users, farms, barns, flocks, egg_production, feed_consumption, inventory, mortality, health_records, financial_transactions, customers, sales, tasks, alerts

## Constraints

- **Tech stack**: Next.js + Supabase only, no custom backend server
- **UI rule**: Do not change existing UI designs — only add missing functionality and fix data integration
- **Security**: All data access must be protected by Supabase RLS, each farm sees only its own data
- **Charts**: All charts must use Recharts
- **Simplicity**: Avoid overengineering, prefer minimal implementations

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase as sole backend | Reduces complexity, faster iteration | ✓ Good |
| Shared calendar context | Prevents duplicated calendar code across 5+ pages | — Pending |
| No UI changes for this milestone | Focus on data integration and bug fixes | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-11 after initialization*
