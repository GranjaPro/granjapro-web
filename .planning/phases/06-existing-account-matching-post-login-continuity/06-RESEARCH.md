---
status: complete
phase: 06-existing-account-matching-post-login-continuity
created: 2026-05-03
requirements:
  - AUTH-03
  - AUTH-04
---

# Research 06: Existing Account Matching & Post-Login Continuity

## Research Question

What needs to be understood before planning Phase 6 so Google OAuth reuses same-email accounts and preserves the app's existing post-login flow?

## Findings

### Supabase same-email OAuth behavior

Supabase Auth supports automatic identity linking. When a user signs in with OAuth, Supabase attempts to find an existing user with the same email address and link the OAuth identity to that user instead of creating a separate user, provided the email-linking safety rules are satisfied.

Implication for this app:
- The app should not build a custom duplicate-user merge flow in Next.js.
- The implementation should verify that the existing Google OAuth entry points rely on Supabase Auth's normal OAuth flow and do not create app-level profile records before Supabase resolves the identity.
- Same-email matching is mostly an auth-provider behavior, but the app still needs checks around callback/profile continuity so linked users land in the correct existing farm context.

Source: Supabase Auth identity linking docs, `https://supabase.com/docs/guides/auth/auth-identity-linking`.

### Existing app auth flow

Relevant files:
- `app/(auth)/login/page.tsx` starts Google OAuth with `signInWithOAuth({ provider: "google" })` and redirects to `/auth/callback`.
- `app/(auth)/signup/page.tsx` does the same after enforcing terms acceptance.
- `app/auth/callback/route.ts` exchanges the OAuth code, then checks `profiles.farm_id` and fallback `farms.owner_id` to choose `/dashboard` or `/dashboard/onboarding`.
- `components/auth/auth-provider.tsx` loads the authenticated user, profile, and farm, and backfills `profiles.farm_id` when it finds an owned farm.
- `supabase/migrations/00001_initial_schema.sql` auto-creates a `profiles` row after a new `auth.users` row is created.

Implication:
- Existing same-email account reuse should be validated by asserting the post-callback `user.id` maps to the existing profile/farm rather than a new app-level profile.
- The callback's farm/profile logic should be the main place to harden OAuth continuity.
- The dashboard auth provider remains the client-side source of truth after redirect.

### Risks

- Supabase automatic linking depends on provider/email verification and project Auth configuration. If configuration is wrong, app code alone cannot guarantee same-email linking.
- The callback currently accepts `next` values that start with `/dashboard`; this keeps the flow scoped, but the plan should preserve the non-dashboard redirect escape used by email confirmation.
- New OAuth users can have metadata from Google, but existing password users should retain their existing profile/farm data after linking.
- The `profiles` table does not enforce unique email at the app schema level. That is acceptable for this milestone if Supabase Auth owns identity linking, but verification should explicitly check there is no extra app profile inserted for the same email during OAuth login.

## Planning Guidance

- Keep Phase 6 small: callback hardening, auth continuity checks, and verification scaffolding.
- Do not add manual linking UI or account-settings identity management; those are outside v1.1 scope.
- Do not add a custom backend service; use Supabase Auth and the existing Next.js callback route.
- Treat live Supabase/Google project configuration as a documented manual verification item, because local code cannot fully simulate provider-level linking.

## Validation Architecture

Phase verification should cover:
- Static/code-level checks that the OAuth callback exchanges the session once and resolves the post-login destination through existing profile/farm data.
- Manual/live check that a Google account with the same verified email signs into the existing user/farm.
- Regression check that first-time Google users still reach onboarding.
- Regression check that fully set-up users still reach `/dashboard`.

---

*Research completed: 2026-05-03*
