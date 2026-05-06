---
phase: 06-existing-account-matching-post-login-continuity
plan: 06-01
subsystem: auth
tags: [supabase, oauth, google, callback, onboarding]
requires:
  - phase: 05-google-entry-points-signup-terms-gate
    provides: Google OAuth login/signup entry points and signup terms gate
provides:
  - Safe internal-only OAuth callback destination handling
  - Existing-account farm continuity for same-user OAuth sessions
  - Server-side profile farm_id backfill from owned farms
  - Live verification checklist for Supabase same-email account reuse
affects: [auth, onboarding, dashboard-routing, supabase]
tech-stack:
  added: []
  patterns:
    - Server callback owns OAuth post-login routing
    - Dashboard next destinations require farm continuity checks
    - Non-dashboard internal callback destinations bypass farm checks for email confirmation
key-files:
  created:
    - .planning/phases/06-existing-account-matching-post-login-continuity/06-01-SUMMARY.md
  modified:
    - app/auth/callback/route.ts
    - supabase/migrations/00001_initial_schema.sql
key-decisions:
  - "Kept login and signup Google OAuth entry points provider-owned via Supabase signInWithOAuth."
  - "Rejected external, protocol-relative, and malformed callback next values by falling back to /dashboard."
  - "Backfilled profiles.farm_id only from farms owned by the authenticated user."
patterns-established:
  - "Callback redirects sanitize first, then apply dashboard-only farm continuity checks."
  - "Owned-farm fallback can repair an empty profile farm_id without creating or merging app accounts."
requirements-completed: [AUTH-03, AUTH-04]
duration: 24min
completed: 2026-05-04
---

# Phase 6 Plan 06-01: OAuth Account Reuse and Login Continuity Summary

**Supabase Google OAuth callback now uses safe internal redirects, preserves dashboard farm continuity, and backfills profile farm links from owned farms.**

## Performance

- **Duration:** 24 min
- **Started:** 2026-05-04T16:45:00-03:00
- **Completed:** 2026-05-04T17:09:00-03:00
- **Tasks:** 6 planned tasks addressed
- **Files modified:** 2

## Accomplishments

- Hardened `/auth/callback` so `next` must be an internal relative destination, with unsafe values falling back to `/dashboard`.
- Preserved email confirmation continuity by allowing non-dashboard internal destinations such as `/login` to bypass farm checks.
- Kept dashboard destinations behind the existing authenticated user, profile, and farm continuity checks.
- Added server-side `profiles.farm_id` backfill when an authenticated user owns a farm but the profile row is missing the farm link.
- Confirmed Google-created profiles can derive `full_name` from OAuth metadata or email prefix, and aligned the initial migration trigger with the schema search path.
- Documented live Supabase/Google verification requirements for same-email account reuse because local tests cannot prove provider identity linking.

## Task Commits

No commits were created in this run. The worktree already contained unrelated uncommitted source and planning changes before Phase 6 execution, including Phase 5 artifacts and dashboard/schema edits. To avoid mixing ownership, changes were left unstaged.

## Files Created/Modified

- `app/auth/callback/route.ts` - Adds callback destination sanitization, dashboard-route detection, and profile farm backfill from owned farms.
- `supabase/migrations/00001_initial_schema.sql` - Aligns `handle_new_user` with the current schema function search path while keeping OAuth metadata/email-prefix `full_name` fallback.
- `.planning/phases/06-existing-account-matching-post-login-continuity/06-01-SUMMARY.md` - Captures plan outcome and verification status.

## Decisions Made

- Supabase remains responsible for Google OAuth identity linking; the app does not create profile rows from login/signup pages or implement manual merge tooling.
- `/dashboard` and `/dashboard/*` are the only callback destinations that require farm continuity checks.
- Internal non-dashboard destinations remain supported for flows like email confirmation.
- The profile backfill uses only `farms.owner_id = user.id`, never email matching.

## Deviations from Plan

None - implementation stayed within the planned callback, trigger, and verification-documentation scope.

## Issues Encountered

`npm run build` compiled successfully but failed TypeScript checking in an unrelated dashboard file:

- `app/dashboard/flocks/detalhes/[loteId]/operacional/page.tsx:374`
- The new custom task object passed to `setTasks` is missing the required `missed` field on type `Task`.

This blocks full automated phase verification, but it is outside the Phase 6 auth callback scope.

## Verification

Automated:

- `npm run build` - failed on the unrelated `Task.missed` type error above after compilation succeeded.

Manual live checks still required:

1. Create or identify an email/password account with a farm.
2. Sign in with a Google account using the same verified email.
3. Confirm the Supabase session resolves to the existing account/profile context and no duplicate app-visible farm context appears.
4. Confirm a fully set-up Google user lands in `/dashboard`.
5. Confirm a Google user with no farm lands in `/dashboard/onboarding`.
6. Confirm email confirmation with `next=/login` still redirects to `/login`.
7. Confirm external or malformed callback `next` values fall back to `/dashboard`.

## User Setup Required

None - no new environment variables or provider configuration were added.

## Next Phase Readiness

Phase 6 is implemented but needs verification after the unrelated dashboard TypeScript blocker is resolved and the live Supabase/Google checks are run.

## Self-Check: PARTIAL

- Code changes for callback routing and farm continuity are present.
- No local auth route test harness exists in the repo.
- Full build verification is blocked by an unrelated TypeScript error outside the auth scope.

---
*Phase: 06-existing-account-matching-post-login-continuity*
*Completed: 2026-05-04*
