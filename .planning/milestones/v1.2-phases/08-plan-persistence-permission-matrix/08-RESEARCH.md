---
phase: 08
slug: plan-persistence-permission-matrix
status: complete
created: 2026-05-13
requirements:
  - PLAN-01
  - PLAN-02
  - PLAN-03
  - PLAN-04
  - PERM-01
  - PERM-04
  - AI-03
---

# Phase 8 Research: Plan Persistence & Permission Matrix

## Research Complete

Phase 8 should be implemented as a foundation layer, not as full billing or full enforcement. The live Supabase project already has `profiles.plan`, while the repository schema/migrations do not. The safest approach is to align repository schema artifacts with the live model, add explicit trial fields, then centralize all plan parsing, limits, capabilities, and AI credit weights in one TypeScript module that later phases can consume.

## Current Implementation Findings

- `supabase/schema.sql` and `supabase/migrations/00001_initial_schema.sql` define `public.profiles` without `plan` or trial columns.
- `public.handle_new_user()` currently inserts only `id`, `email`, and `full_name`.
- `lib/database.types.ts` already includes `profiles.plan` as `"essencial" | "pro" | "premium"`, but does not include trial fields.
- `components/plan/plan-provider.tsx` defaults to `essencial` and casts `profile.plan` directly, so invalid values can become trusted at runtime.
- `components/auth/auth-provider.tsx` loads `profile` and `farm` and is the best current integration point for profile refresh after plan selection.
- `app/dashboard/layout.tsx` has scattered plan checks in navigation, using `plan === "essencial"` and `pro: true`.
- `app/page.tsx` contains the current commercial pricing/limits and should stop being a separate source of truth after the matrix exists.
- `components/plan/upgrade-popup.tsx` contains divergent plan copy and should not drive Phase 8 commercial rules.
- `app/api/ai/route.ts` already has `simple`, `detailed`, and `diagnostic` modes, but currently trusts the client-submitted tier. Full server enforcement is Phase 10, but Phase 8 should centralize the mode names, labels, and credit costs.

## Recommended Approach

1. Add a new idempotent Supabase migration for `profiles.plan`, trial timestamps, allowed values, default/backfill, and `handle_new_user()` profile creation alignment.
2. Update `supabase/schema.sql` and `lib/database.types.ts` to match the migration.
3. Create a central plan module, for example `lib/plans.ts`, with:
   - `PlanType = "essencial" | "pro" | "premium"`
   - `AIResponseMode = "simple" | "detailed" | "diagnostic"`
   - plan order and defensive parsing helpers
   - capability metadata with `minimumPlan`
   - commercial limits per plan
   - AI monthly credits and per-mode credit costs
   - helpers such as `parsePlan`, `isValidPlan`, `canAccessCapability`, `getRequiredPlan`, and `getAICreditCost`
4. Refactor `PlanProvider` to consume the central parser and expose whether the loaded profile has a valid plan.
5. Add a plan-selection route that lets invalid/missing/expired-trial users select Essencial, Pro, Premium, or start the one-time 7-day Premium trial.
6. Add dashboard-entry routing that redirects invalid/missing/expired-trial users to plan selection without creating a billing integration.

## Constraints

- Do not add Stripe, a billing portal, card collection, webhooks, or real subscription validation.
- Do not replace every scattered UI check in Phase 8; Phase 9 owns broad UI permission integration.
- Do not add route/API enforcement beyond the minimal dashboard-entry redirect needed for invalid plan/trial state; Phase 10 owns route/API/AI guard enforcement.
- Preserve Supabase as the only backend.
- Keep the plan-selection route simple and mobile-friendly, but do not turn this phase into a full pricing redesign.

## Validation Architecture

Validation should combine source-level checks, TypeScript build, and a schema push requirement.

- Automated: `npm run build`.
- Automated/source scan: migration and schema include `plan text default 'essencial'` and `check (plan in ('essencial', 'pro', 'premium'))` or equivalent constraint.
- Automated/source scan: migration and schema include trial timestamp fields.
- Automated/source scan: `components/plan/plan-provider.tsx` no longer casts `profile.plan as PlanType`.
- Automated/source scan: central plan module contains `aiCreditsMonthly`, AI mode costs `1`, `3`, and `5`, and landing-page bird/user limits.
- Automated/source scan: plan-selection route updates `profiles.plan`.
- Manual/local: with mocked or seeded users, verify invalid/null/expired-trial profiles route to plan selection and normal valid profiles reach the dashboard.
- Schema: run Supabase schema push after migration/schema edits when local Supabase is available.

## Planning Implications

The safest plan split is:

1. Schema and profile type alignment, including plan/trial columns and schema push.
2. Central plan, capability, limit, and AI credit matrix with defensive helpers.
3. Plan-selection page and dashboard-entry routing for invalid plan or expired trial.
