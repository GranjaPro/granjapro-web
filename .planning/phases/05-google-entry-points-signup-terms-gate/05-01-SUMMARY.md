---
status: complete
phase: 05-google-entry-points-signup-terms-gate
plan: 05-01
completed: 2026-05-02
requirements:
  - AUTH-01
  - AUTH-02
  - SIGN-01
---

# Summary 05-01

## Outcome

Implemented the Phase 5 auth-page changes for Google entry points and the signup terms gate without changing the existing OAuth callback route.

## What Changed

- Updated `app/(auth)/login/page.tsx`
  - Added dedicated `googleLoading` and `googleError` state.
  - Switched the CTA copy to `Entrar com Google`.
  - Disabled email, password, password-toggle, and manual submit while Google OAuth is starting.
  - Added Google-specific loading copy and inline error feedback when `signInWithOAuth` fails before redirect.

- Updated `app/(auth)/signup/page.tsx`
  - Added dedicated `googleLoading` and `googleError` state.
  - Gated the Google CTA strictly on `acceptedTerms`.
  - Added helper text explaining that terms acceptance is required before continuing with Google.
  - Switched the CTA copy to `Criar conta com Google`.
  - Disabled manual signup controls and the terms checkbox while Google OAuth is starting.
  - Preserved manual field state by keeping the Google path separate from manual signup submission state.

## Verification Notes

- Code inspection confirms the implementation matches AUTH-01, AUTH-02, and SIGN-01.
- Phase closeout was approved to continue without phase-level `npm run ...` checks.
- Live OAuth verification remains advisable in a real Supabase/Google environment, but it is no longer blocking Phase 5 closure.

## Files

- `app/(auth)/login/page.tsx`
- `app/(auth)/signup/page.tsx`
