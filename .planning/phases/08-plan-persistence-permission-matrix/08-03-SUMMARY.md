---
phase: 08-plan-persistence-permission-matrix
plan: 08-03
subsystem: plan-selection-routing
tags: [plans, trial, dashboard-routing, ai-credits]
requires:
  - phase: 08-01
    provides: Profile plan/trial schema and generated types
  - phase: 08-02
    provides: Central plan matrix and AI credit metadata
provides:
  - Authenticated plan-selection page
  - One-time 7-day Premium trial start flow
  - Dashboard redirect for missing, invalid, or expired-trial plan state
  - Visible AI response credit weights on plan selection
  - Dashboard and profile entry points for changing plans
  - Trial expiry handling that clears active plan state
  - Pro/Premium route guard foundation for workers and reports
  - Active-plan header badge and conditional sidebar upgrade badges
affects: [dashboard, auth-profile, plans, trial]
tech-stack:
  added: []
  patterns:
    - Dashboard-shell redirect from central trial/plan helper
    - Client-side profile update followed by auth-context refresh
key-files:
  created:
    - app/dashboard/select-plan/page.tsx
    - .planning/phases/08-plan-persistence-permission-matrix/08-03-SUMMARY.md
  modified:
    - app/dashboard/layout.tsx
    - lib/plans.ts
key-decisions:
  - "Normal plan selection clears the active trial window but preserves trial_used_at."
  - "The free trial is Premium for 7 days and requires no payment data."
  - "The dashboard layout owns the first routing guard for invalid plan state."
requirements-completed: [PLAN-04, PLAN-05, PERM-01, PERM-04, PERM-06, AI-03]
duration: 26min
completed: 2026-05-13
---

# Phase 8 Plan 08-03: Plan Selection and Trial Routing Summary

The dashboard now routes users with missing, invalid, or expired-trial plan state to `/dashboard/select-plan`, where they can pick a plan or start a one-time Premium trial.

## Performance

- **Duration:** 26 min
- **Completed:** 2026-05-13
- **Tasks:** 4 planned tasks addressed
- **Files modified:** 9

## Accomplishments

- Added central trial helpers in `lib/plans.ts`: `hasUsedTrial`, `isTrialActive`, `isTrialExpired`, and `requiresPlanSelection`.
- Created `app/dashboard/select-plan/page.tsx` with Essencial, Pro, and Premium choices sourced from `PLAN_MATRIX`.
- Added a one-time 7-day Premium trial flow that stores `trial_started_at`, `trial_ends_at`, and `trial_used_at`.
- Preserved `trial_used_at` when selecting a normal plan, while clearing the active trial dates so expired-trial users can continue after choosing a plan.
- Added dashboard-shell redirect behavior for invalid plan states without looping on `/dashboard/select-plan`.
- Prevented the dashboard shell, sidebar, and top bar from rendering while a user with missing/invalid plan is being redirected.
- Added active-trial notification inside the dashboard shell and expiry logic that clears `profiles.plan` to `null`.
- Added plan-change entry points in the sidebar footer and profile settings modal.
- Added route protection for `/dashboard/workers` and `/dashboard/reports`, requiring Pro or Premium.
- Removed the Pro badge from Assistente IA and moved it above Funcionarios in the sidebar.
- Made sidebar plan badges conditional: they only appear when the active plan does not satisfy that route's minimum plan.
- Added a persistent header plan badge, including remaining trial days for active Premium trials.
- Kept the sidebar available on `/dashboard/select-plan` for users who already have an active plan, while hiding it for `profiles.plan = null`.
- Updated new profile creation so new users start with `profiles.plan = null` and must choose a plan before entering the dashboard.
- Updated plan cards to use light/dark-safe theme colors, hover feedback, and landing-page-aligned benefits from `PLAN_MATRIX`.
- Kept onboarding gated behind valid plan state.
- Surfaced AI response credit weights from `AI_MODE_META` on the plan-selection page.
- Ran `npm run build` successfully.

## Files Created/Modified

- `lib/plans.ts` - Trial and selection requirement helpers.
- `app/dashboard/select-plan/page.tsx` - Authenticated plan and trial selection page.
- `app/dashboard/layout.tsx` - Dashboard-entry redirect for missing, invalid, or expired-trial profiles.
- `components/dashboard/profile-settings.tsx` - Profile modal plan-change entry point.
- `supabase/migrations/00015_allow_null_profile_plan.sql` - Allows `profiles.plan = null` as no-plan state.
- `supabase/schema.sql`, `supabase/migrations/00001_initial_schema.sql`, `supabase/migrations/00014_profile_plan_trial.sql`, `lib/database.types.ts` - Align nullable plan state.
- `.planning/phases/08-plan-persistence-permission-matrix/08-03-SUMMARY.md` - Captures plan outcome and verification status.

## Decisions Made

- Normal plan selection clears `trial_started_at` and `trial_ends_at` because an expired trial would otherwise keep forcing selection on every dashboard entry.
- `trial_used_at` is retained across normal plan selection to prevent reusing the free trial.
- `profiles.plan = null` is the explicit no-plan state after trial expiry.
- New profiles also start with `profiles.plan = null`; `essencial` is selected only when the user explicitly chooses it.
- Workers and Reports receive a Phase 8 client route guard because the user requested those two routes before the broader Phase 10 guard pass.
- Upgrade badges are based on minimum-plan mismatch, not fixed route labels.
- The selection page clearly avoids checkout behavior because Stripe integration is deferred.

## Issues Encountered

- Next.js continues to warn that the `middleware` file convention is deprecated in favor of `proxy`. This is unrelated to Phase 8 and does not block the build.

## Verification

Automated:

- `rg -n "requiresPlanSelection|hasUsedTrial|isTrialExpired" lib/plans.ts app/dashboard/layout.tsx` - passed.
- `rg -n "trial_started_at|trial_ends_at|trial_used_at|TRIAL_DAYS" app/dashboard/select-plan/page.tsx` - passed.
- `rg -n "PLAN_MATRIX|TRIAL_DAYS|trial_started_at|trial_ends_at|trial_used_at|update\\(\\{ plan" app/dashboard/select-plan/page.tsx` - passed.
- `rg -n "requiresPlanSelection|select-plan" app/dashboard/layout.tsx` - passed.
- `rg -n "Resumo simples|Analise detalhada|Diagnostico com recomendacoes|creditCost" app/dashboard/select-plan/page.tsx lib/plans.ts` - passed.
- `rg -n "isPlanSelectionRoute|needsPlanSelection|Teste Premium ativo|Meu plano|plan: null|isTrialExpired|CreditCard" app/dashboard/layout.tsx components/dashboard/profile-settings.tsx` - passed.
- `rg -n "ROUTE_PLAN_REQUIREMENTS|routePlanBlocked|/dashboard/workers|/dashboard/reports|hasMinimumPlan|minimumPlan" app/dashboard/layout.tsx` - passed.
- `rg -n "Assistente IA|Funcionarios|Relatorios|PLAN_BADGE_LABEL|shouldShowPlanBadge|Conta .*ativa|teste gratis|hideShellForPlanSelection" app/dashboard/layout.tsx` - passed.
- `rg -n "pro: true" app/dashboard/layout.tsx` - returned no matches.
- `rg -n "plan text check|insert into public.profiles \\(id, email, full_name\\)|alter column plan drop default" supabase/migrations/00001_initial_schema.sql supabase/schema.sql supabase/migrations/00016_new_profiles_start_without_plan.sql` - passed.
- `npx supabase db push` - applied `00016_new_profiles_start_without_plan.sql`.
- `rg -n "benefits|excluded|Controle basico|Tudo do Profissional|IA avancada|Relatorios avancados" lib/plans.ts app/dashboard/select-plan/page.tsx` - passed.
- `npm run build` - passed.

Manual:

- Live profile mutation and redirect scenarios still need browser/UAT confirmation with real Supabase session data.

## User Setup Required

None.

## Self-Check: PASSED

- PLAN-04 covered by invalid/missing/expired-trial redirect behavior.
- PLAN-05 covered by active-trial notices and expiry-to-null behavior.
- PERM-01 supported by central plan selection and matrix use.
- PERM-04 surfaced through matrix-driven plan limits.
- PERM-06 covered by sidebar and profile-settings plan-change entry points.
- SEC-01 partially covered for `/dashboard/workers` and `/dashboard/reports`; broader route/API enforcement remains for Phase 10.
- AI-03 surfaced through shared AI response credit weights.

---
*Phase: 08-plan-persistence-permission-matrix*
*Completed: 2026-05-13*
