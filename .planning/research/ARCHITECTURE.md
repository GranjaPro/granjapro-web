# Architecture Patterns — Google Sign-In

**Project:** Granja Pro
**Milestone:** v1.1 Google Sign-In
**Researched:** 2026-05-01

## Likely Modified Areas

- `app/(auth)/login/page.tsx`
- `app/(auth)/signup/page.tsx`
- `app/auth/callback/route.ts`
- `middleware.ts`
- `lib/supabase/client.ts`
- `lib/supabase/server.ts`
- `lib/supabase/middleware.ts`
- `components/auth/auth-provider.tsx`
- Any onboarding/profile logic that assumes password-created users only

## End-to-End Flow Sketch

1. User clicks Google sign-in on login or signup
2. Browser starts Supabase OAuth with Google
3. Google redirects to the existing callback route
4. Callback exchanges the auth code for a session
5. Existing auth/session plumbing restores normal app behavior
6. User is sent to dashboard or onboarding depending on current app state

## Integration Checks

- New Google users get the profile row/data the app expects
- Existing users with matching email are linked to the existing account policy
- Users with no farm/setup still route into onboarding correctly
- Middleware recognizes the session after callback and refresh
- Protected-route behavior remains unchanged

## Suggested Build Order

1. Provider config and callback verification
2. Login/signup button behavior
3. Existing-account linking behavior
4. First-time-user routing into current app flow
5. Regression check for auth redirects and session persistence

## Recommendations

1. Keep redirect decisions centralized in the callback flow.
2. Reuse existing onboarding rules; do not invent a second Google-only path.
3. Validate both returning-user and first-time-user flows.
4. Regression-test normal email/password auth after Google auth changes.
