---
phase: 08-plan-persistence-permission-matrix
status: passed
verified_at: 2026-05-13
verification_type: source-and-build
plans_verified:
  - 08-01
  - 08-02
  - 08-03
requirements_verified:
  - PLAN-03
  - PLAN-04
  - PLAN-05
  - PERM-01
  - PERM-04
  - PERM-06
  - AI-03
---

# Phase 8 Verification: Plan Persistence & Permission Matrix

## Verdict

**PASSED** for implementation readiness.

Phase 8 now provides the database plan/trial fields, generated types, central plan/capability/limit/AI-credit metadata, and the authenticated plan-selection routing foundation required for later UI and API permission phases.

## Evidence

### 08-01 Schema/Profile/Trial Alignment

- `supabase/migrations/00014_profile_plan_trial.sql` adds `profiles.plan`, `trial_started_at`, `trial_ends_at`, and `trial_used_at`.
- The migration normalizes invalid or missing plan values to `essencial` before adding the plan check constraint.
- `public.handle_new_user()` now seeds new profiles with plan `essencial`.
- `supabase/schema.sql`, `supabase/migrations/00001_initial_schema.sql`, and `lib/database.types.ts` include the new fields.
- `npx supabase db push` applied the migration successfully.

### 08-02 Central Plan Matrix

- `lib/plans.ts` owns valid plan values, default plan behavior, capability metadata, published plan limits, and AI response credit costs.
- `components/plan/plan-provider.tsx` uses defensive parsing and exposes valid-plan state.
- `app/page.tsx` consumes matrix values for the commercial limits currently shown on the landing page.

### 08-03 Plan Selection And Trial Routing

- `lib/plans.ts` includes `hasUsedTrial`, `isTrialActive`, `isTrialExpired`, and `requiresPlanSelection`.
- `/dashboard/select-plan` persists normal plan selections to `profiles.plan`.
- The free trial flow stores Premium plus `trial_started_at`, `trial_ends_at`, and `trial_used_at`.
- Normal plan selection clears active trial dates while preserving `trial_used_at`, so expired trials cannot be reused.
- `app/dashboard/layout.tsx` redirects authenticated users with missing, invalid, or expired-trial plan state to `/dashboard/select-plan`, avoids redirect loops on the selection route, and does not render dashboard navigation during the redirect.
- Active trials show a dashboard notice, and expired trials clear `profiles.plan` to `null`.
- Sidebar footer and profile settings both expose a plan-change path to `/dashboard/select-plan`.
- `/dashboard/workers` and `/dashboard/reports` are client-guarded to Pro/Premium plans and redirect insufficient plans to plan selection.
- Assistente IA is no longer marked Pro in the sidebar and appears above Funcionarios.
- Sidebar Pro/Premium labels only render when the active plan does not meet the route's minimum plan.
- The header shows the active account plan persistently, including remaining trial days for active trial accounts.
- `/dashboard/select-plan` hides the sidebar only for `profiles.plan = null`; valid-plan users can use the normal shell while changing plans.
- `profiles.plan` is nullable in schema/types so `null` can represent no active plan.
- New profiles are created without a plan after `00016_new_profiles_start_without_plan.sql`, so first dashboard entry routes them to plan selection.
- The selection page exposes AI credit weights from shared metadata.

## Automated Checks

- `rg -n "PLAN_MATRIX|PLAN_TYPES|AI_RESPONSE_MODES|TRIAL_DAYS|aiCreditsMonthly|creditCost|CAPABILITIES|minimumPlan" lib/plans.ts` - passed.
- `rg -n "plan text not null default 'essencial'|trial_started_at|trial_ends_at|trial_used_at|profiles_plan_check|handle_new_user" supabase/migrations/00014_profile_plan_trial.sql` - passed during 08-01.
- `rg -n "plan: string|trial_started_at: string \\| null|trial_ends_at: string \\| null|trial_used_at: string \\| null" lib/database.types.ts` - passed during 08-01.
- `rg -n "requiresPlanSelection|hasUsedTrial|isTrialExpired" lib/plans.ts app/dashboard/layout.tsx` - passed.
- `rg -n "trial_started_at|trial_ends_at|trial_used_at|TRIAL_DAYS" app/dashboard/select-plan/page.tsx` - passed.
- `rg -n "PLAN_MATRIX|TRIAL_DAYS|trial_started_at|trial_ends_at|trial_used_at|update\\(\\{ plan" app/dashboard/select-plan/page.tsx` - passed.
- `rg -n "requiresPlanSelection|select-plan" app/dashboard/layout.tsx` - passed.
- `rg -n "isPlanSelectionRoute|needsPlanSelection|Teste Premium ativo|Meu plano|plan: null|isTrialExpired|CreditCard" app/dashboard/layout.tsx components/dashboard/profile-settings.tsx` - passed.
- `rg -n "ROUTE_PLAN_REQUIREMENTS|routePlanBlocked|/dashboard/workers|/dashboard/reports|hasMinimumPlan|minimumPlan" app/dashboard/layout.tsx` - passed.
- `rg -n "Assistente IA|Funcionarios|Relatorios|PLAN_BADGE_LABEL|shouldShowPlanBadge|Conta .*ativa|teste gratis|hideShellForPlanSelection" app/dashboard/layout.tsx` - passed.
- `rg -n "pro: true" app/dashboard/layout.tsx` - returned no matches.
- `rg -n "plan text check|insert into public.profiles \\(id, email, full_name\\)|alter column plan drop default" supabase/migrations/00001_initial_schema.sql supabase/schema.sql supabase/migrations/00016_new_profiles_start_without_plan.sql` - passed.
- `npx supabase db push` - applied `00016_new_profiles_start_without_plan.sql`.
- `rg -n "benefits|excluded|Controle basico|Tudo do Profissional|IA avancada|Relatorios avancados" lib/plans.ts app/dashboard/select-plan/page.tsx` - passed.
- `npm run build` - passed.

## Manual/UAT Remaining

The following scenarios require a live authenticated browser session and profile edits in Supabase:

- Set `profiles.plan` to null/invalid and confirm dashboard redirects to `/dashboard/select-plan`.
- Select Essencial, Pro, and Premium and confirm `profiles.plan` updates and dashboard loads.
- Start the trial and confirm Premium plus all three trial timestamps are saved.
- Set `trial_ends_at` to the past with `trial_used_at` present and confirm the trial option is unavailable.
- Confirm the dashboard trial notice appears during an active trial and disappears after plan selection.

## Known Non-Blocking Notes

- Stripe, checkout, card capture, billing portal, webhooks, API-level route enforcement, and AI credit persistence remain intentionally deferred.
- `npm run build` still reports the existing Next.js warning that the `middleware` file convention is deprecated in favor of `proxy`; it does not block the build.

## Final Status

Phase 8 is ready for Phase 9 UI permission integration and Phase 10 route/API/AI usage guard foundations.
