# Domain Pitfalls — Google Sign-In

**Project:** Granja Pro
**Milestone:** v1.1 Google Sign-In
**Researched:** 2026-05-01

## Common Mistakes

- Misconfigured Supabase/Google redirect URLs
- Callback/session exchange works inconsistently across environments
- Losing post-login redirect state through OAuth
- Assuming auth success means app profile/setup data is already ready
- Creating duplicate accounts when the same email already exists

## App-Specific Integration Pitfalls

- Current app flows expect profile data immediately after sign-in
- Onboarding/farm routing must behave the same after Google auth
- Same-email linking behavior must be explicit, not accidental
- Signup terms acceptance can be bypassed unless intentionally enforced
- Retry/back-button flows can accidentally create duplicated app records if not checked

## Verification Checklist

- Google login works from both login and signup pages
- Signup-page Google button respects terms acceptance
- Existing same-email account links to the existing user correctly
- First-time Google user reaches the expected onboarding/dashboard destination
- Session survives callback, refresh, and protected-route navigation
- Local and production redirect URLs are both valid

## Requirement / Phase Implications

- Requirements should explicitly define same-email linking behavior
- Requirements should explicitly define the signup terms rule for Google
- Early work should verify provider/callback/session behavior before UI polish
- Completion should require full-flow verification, not only button click success

## Recommendations

1. Decide same-email linking policy before implementation.
2. Verify profile/onboarding assumptions before calling auth work complete.
3. Keep terms behavior explicit on signup.
4. Verify both local and production redirect behavior.
