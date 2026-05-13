---
phase: 08-plan-persistence-permission-matrix
plan: 08-01
subsystem: schema
tags: [supabase, profiles, plan, trial, types]
requires: []
provides:
  - Repository schema alignment for profiles.plan
  - One-time Premium trial timestamp fields
  - New-user profile default plan insertion
  - TypeScript database type alignment for trial fields
affects: [supabase, auth, profiles, database-types]
tech-stack:
  added: []
  patterns:
    - Idempotent Supabase migration for existing live-column alignment
    - Explicit profile trial timestamp fields
key-files:
  created:
    - supabase/migrations/00014_profile_plan_trial.sql
    - .planning/phases/08-plan-persistence-permission-matrix/08-01-SUMMARY.md
  modified:
    - supabase/schema.sql
    - supabase/migrations/00001_initial_schema.sql
    - lib/database.types.ts
key-decisions:
  - "profiles.plan remains the persisted source of truth with allowed values essencial, pro, and premium."
  - "The free trial is represented by timestamp fields and will grant Premium during its active window."
patterns-established:
  - "New profile creation inserts plan = 'essencial'."
  - "Schema changes are reflected in migration, complete schema snapshot, initial schema, and TypeScript types."
requirements-completed: [PLAN-01, PLAN-02, PLAN-03]
duration: 18min
completed: 2026-05-13
---

# Phase 8 Plan 08-01: Profile Plan and Trial Schema Alignment Summary

Repository schema, profile creation, live Supabase migration, and TypeScript database types now agree on `profiles.plan` and the trial timestamp fields.

## Performance

- **Duration:** 18 min
- **Started:** 2026-05-13T00:40:00-03:00
- **Completed:** 2026-05-13T00:58:00-03:00
- **Tasks:** 4 planned tasks addressed
- **Files modified:** 5

## Accomplishments

- Added `supabase/migrations/00014_profile_plan_trial.sql`.
- Added idempotent migration logic for `profiles.plan`, `trial_started_at`, `trial_ends_at`, and `trial_used_at`.
- Backfilled null/invalid plans to `essencial` before enforcing not-null and valid plan values.
- Updated `public.handle_new_user()` in the new migration, complete schema, and initial schema to insert `plan = 'essencial'`.
- Updated `supabase/schema.sql` and `supabase/migrations/00001_initial_schema.sql` with plan and trial fields.
- Updated `lib/database.types.ts` with profile trial fields in Row, Insert, and Update.
- Ran `npm run build` successfully.
- Ran Supabase schema push successfully and applied `00014_profile_plan_trial.sql`.

## Task Commits

Pending phase execution commit.

## Files Created/Modified

- `supabase/migrations/00014_profile_plan_trial.sql` - Adds the profile plan/trial migration and updates `handle_new_user()`.
- `supabase/schema.sql` - Adds plan/trial fields to the complete schema snapshot and profile trigger.
- `supabase/migrations/00001_initial_schema.sql` - Adds plan/trial fields to fresh install schema and profile trigger.
- `lib/database.types.ts` - Adds trial timestamp fields to profile TypeScript types.
- `.planning/phases/08-plan-persistence-permission-matrix/08-01-SUMMARY.md` - Captures plan outcome and verification status.

## Decisions Made

- Kept `plan` as `text` with a check constraint instead of introducing a PostgreSQL enum, matching the current live database shape and keeping migration friction low.
- Used explicit `trial_started_at`, `trial_ends_at`, and `trial_used_at` fields for one-time trial behavior.
- Preserved `essencial` as default for new profiles.

## Deviations from Plan

None.

## Issues Encountered

- The local `.npm-cache` directory referenced by the preferred Supabase command did not exist, so PowerShell printed a `Resolve-Path` warning before `npx supabase db push` continued.
- Supabase CLI reported `column "plan" of relation "profiles" already exists, skipping`, which is expected because the live database already had the column.
- Supabase CLI reported a newer CLI version is available. This does not block the phase.

## Verification

Automated:

- `rg -n "trial_started_at|trial_ends_at|trial_used_at|profiles_plan_check|plan.*essencial" supabase/migrations/00014_profile_plan_trial.sql` - passed.
- `rg -n "insert into public.profiles \(id, email, full_name, plan\)|plan text default 'essencial' not null|trial_started_at|trial_ends_at|trial_used_at" supabase/schema.sql supabase/migrations/00001_initial_schema.sql` - passed.
- `rg -n 'trial_started_at|trial_ends_at|trial_used_at|plan:' lib/database.types.ts` - passed.
- `npm run build` - passed.
- `$env:npm_config_cache=(Resolve-Path '.npm-cache').Path; npx supabase db push` - exited 0 and applied `00014_profile_plan_trial.sql`.

Manual:

- No manual Supabase table-editor check was performed in-browser. CLI migration output indicates the remote migration applied successfully.

## User Setup Required

None for this plan. Future environments should run Supabase migrations before relying on the new trial fields.

## Next Phase Readiness

Plan 08-02 can build the central TypeScript plan matrix against the aligned database types.

## Self-Check: PASSED

- PLAN-01 covered by migration and schema snapshot.
- PLAN-02 covered by `handle_new_user()` inserting `plan = 'essencial'`.
- PLAN-03 covered by updated TypeScript database types and passing build.
- Schema push was attempted and succeeded.

---
*Phase: 08-plan-persistence-permission-matrix*
*Completed: 2026-05-13*
