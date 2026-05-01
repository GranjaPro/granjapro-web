# Feature Landscape — Google Sign-In

**Project:** Granja Pro
**Milestone:** v1.1 Google Sign-In
**Researched:** 2026-05-01

## Table Stakes

- Google sign-in is available on the **login** page
- Google sign-in is available on the **signup** page
- Signup-page Google flow respects the required terms checkbox
- First-time Google users can authenticate without creating a password
- Existing users with the same email are linked into the existing account
- Users continue into the same post-login flow already used by the app

## First-Time User Expectations

- Minimal friction on first sign-in
- No forced password creation for Google auth
- Onboarding only when the user still lacks required app setup
- Clear error handling when Google auth is canceled or fails

## Explicit Deferrals

- Multiple social providers beyond Google
- Manual account-linking/settings UI
- Google profile/avatar sync polish
- One Tap or aggressive Google-prompt UX
- Broad auth rewrite or security/settings overhaul

## UX Pitfalls to Avoid

- Making Google appear required when email/password still exists
- Sending Google users into a different post-login experience than other users
- Creating duplicate accounts silently
- Vague same-email collision behavior
- Letting Google signup bypass terms acceptance if product policy requires it

## Recommendations

1. Treat Google as another entry into the same auth/onboarding pipeline.
2. Keep the milestone focused on the core sign-in flow only.
3. Define same-email linking behavior explicitly in requirements.
4. Keep signup terms behavior explicit instead of implicit.
