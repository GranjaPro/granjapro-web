---
phase: 08-plan-persistence-permission-matrix
plan: 08-02
subsystem: plan-matrix
tags: [permissions, limits, ai-credits, plan-provider, pricing]
requires:
  - phase: 08-01
    provides: Profile plan/trial schema and types
provides:
  - Central PlanType and AIResponseMode definitions
  - Product-facing capability matrix with minimum-plan metadata
  - Commercial limits for users, birds, farms, tasks, insights, and AI credits
  - Defensive plan parsing helpers
  - Landing page consumption of central plan limits
affects: [plans, permissions, landing-page, plan-provider]
tech-stack:
  added: []
  patterns:
    - Central source of truth module for plan metadata
    - Runtime parser separate from invalid-plan detection
key-files:
  created:
    - lib/plans.ts
    - .planning/phases/08-plan-persistence-permission-matrix/08-02-SUMMARY.md
  modified:
    - components/plan/plan-provider.tsx
    - app/page.tsx
key-decisions:
  - "Most capabilities use minimumPlan metadata."
  - "All AI response modes are available to all plans, gated by monthly credits."
  - "AI mode credit costs are 1, 3, and 5."
patterns-established:
  - "parsePlan falls back to essencial while getPlanOrNull preserves invalid-plan detection."
  - "PlanProvider exposes hasValidPlan and keeps the existing setPlan API."
requirements-completed: [PLAN-03, PLAN-04, PERM-01, PERM-04, AI-03]
duration: 24min
completed: 2026-05-13
---

# Phase 8 Plan 08-02: Central Plan, Capability, Limit, and AI Credit Matrix Summary

The app now has a central plan model for valid plan values, capabilities, commercial limits, AI monthly credits, AI response-level credit weights, and defensive runtime parsing.

## Performance

- **Duration:** 24 min
- **Started:** 2026-05-13T00:59:00-03:00
- **Completed:** 2026-05-13T01:23:00-03:00
- **Tasks:** 4 planned tasks addressed
- **Files modified:** 4

## Accomplishments

- Created `lib/plans.ts` with `PLAN_TYPES`, `PlanType`, `AI_RESPONSE_MODES`, `AIResponseMode`, `PLAN_MATRIX`, `CAPABILITIES`, `AI_MODE_META`, and helper functions.
- Added commercial limits for Essencial, Pro, and Premium, including birds, users, farms, tasks, insights, and monthly AI credits.
- Added AI response costs: simple = 1, detailed = 3, diagnostic = 5.
- Added helpers for strict plan validation, fallback parsing, invalid-plan detection, minimum-plan checks, capability access checks, and AI credit cost lookup.
- Refactored `PlanProvider` to use `parsePlan` and `getPlanOrNull` instead of `profile.plan as PlanType`.
- Added `hasValidPlan` to plan context so later routing can distinguish fallback display from valid persisted data.
- Kept compatibility for existing imports by re-exporting `PlanType` from `components/plan/plan-provider.tsx`.
- Updated `app/page.tsx` to consume published plan limits from `PLAN_MATRIX`.
- Ran `npm run build` successfully.

## Task Commits

Pending phase execution commit.

## Files Created/Modified

- `lib/plans.ts` - Central plan, permission, limit, and AI credit matrix.
- `components/plan/plan-provider.tsx` - Defensive plan parsing and `hasValidPlan` context field.
- `app/page.tsx` - Landing page uses central published plan limits.
- `.planning/phases/08-plan-persistence-permission-matrix/08-02-SUMMARY.md` - Captures plan outcome and verification status.

## Decisions Made

- Kept `parsePlan()` and `getPlanOrNull()` separate because the app needs both safe fallback rendering and hard invalid-plan detection.
- Kept `PlanType` re-exported from the provider to avoid breaking existing components before Phase 9 integration.
- Kept visible landing page copy and layout unchanged except for sourcing numeric limits from `PLAN_MATRIX`.

## Deviations from Plan

- The first build failed because `LockedOverlay` imported `PlanType` from `plan-provider`. The fix was to re-export `PlanType` from `plan-provider` while still owning the type in `lib/plans.ts`.
- AI mode labels in `lib/plans.ts` are ASCII-normalized (`Analise`, `Diagnostico`) to keep the new source file ASCII. The existing UI copy can localize/format these later.

## Issues Encountered

- Next.js continues to warn that the `middleware` file convention is deprecated in favor of `proxy`. This is unrelated to Phase 8 and does not block the build.

## Verification

Automated:

- `rg -n "PLAN_MATRIX|PLAN_TYPES|AI_RESPONSE_MODES|TRIAL_DAYS|aiCreditsMonthly|creditCost|CAPABILITIES|minimumPlan" lib/plans.ts` - passed.
- `rg -n "birds: 300|birds: 1000|users: 5|creditCost: 5|function isValidPlan|function parsePlan|function getPlanOrNull|function canAccessCapability|function getAICreditCost" lib/plans.ts` - passed.
- `rg -n "parsePlan|getPlanOrNull|hasValidPlan|as PlanType" components/plan/plan-provider.tsx` - confirmed parser usage and no unsafe cast.
- `rg -n "PLAN_MATRIX|aiCreditsMonthly|birds|users" app/page.tsx` - passed.
- `npm run build` - passed.

## User Setup Required

None.

## Next Phase Readiness

Plan 08-03 can use `lib/plans.ts` to build the plan-selection page and dashboard-entry redirect behavior.

## Self-Check: PASSED

- PERM-01 covered by `CAPABILITIES` and minimum-plan helpers.
- PERM-04 covered by `PLAN_MATRIX.limits`.
- AI-03 covered by monthly AI credits and weighted AI mode costs.
- PLAN-04 supported by defensive runtime parsing and invalid-plan detection.

---
*Phase: 08-plan-persistence-permission-matrix*
*Completed: 2026-05-13*
