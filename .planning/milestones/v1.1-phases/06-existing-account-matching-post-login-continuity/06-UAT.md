---
status: complete
phase: 06-existing-account-matching-post-login-continuity
source:
  - 06-01-SUMMARY.md
started: 2026-05-04T20:35:00.000Z
updated: 2026-05-06T00:08:00.000Z
---

## Current Test

[testing complete]

## Tests

### 1. Same-email Google account reuses existing app account
expected: Create or identify an email/password account that already has a farm. Then sign in with a Google account using the same verified email. The user should land in the existing account/farm context, not a duplicate app-visible profile or farm context.
result: pass

### 2. Fully set-up Google user reaches dashboard
expected: After successful Google sign-in, a user with an existing farm/profile context should be redirected to `/dashboard` or the safe dashboard `next` destination.
result: pass

### 3. Google user without farm reaches onboarding
expected: After successful Google sign-in, a user without a farm should be redirected to `/dashboard/onboarding` and remain in the existing onboarding flow.
result: pass

### 4. Email confirmation next=/login still works
expected: An auth callback with a valid code and `next=/login` should redirect to `/login` without dashboard farm checks.
result: pass

### 5. Unsafe callback next falls back safely
expected: External, protocol-relative, malformed, or backslash-containing callback `next` values should not redirect off-site; dashboard fallback should be `/dashboard`.
result: pass
verified_by: code inspection and `npm run build`

### 6. Build smoke test
expected: `npm run build` completes successfully with no TypeScript or route-module errors.
result: pass

## Summary

total: 6
passed: 6
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
