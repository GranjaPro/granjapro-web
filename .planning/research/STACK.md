# Technology Stack — Google Sign-In

**Project:** Granja Pro
**Milestone:** v1.1 Google Sign-In
**Researched:** 2026-05-01

## Existing Stack

The current stack is already sufficient for this milestone:
- Next.js + React + TypeScript
- Supabase Auth via `@supabase/supabase-js` and `@supabase/ssr`
- Existing auth pages, callback route, middleware, and auth provider flow

## Required Config Touchpoints

- Enable the **Google** provider in Supabase Auth
- Configure Google client ID/secret inside Supabase
- Ensure redirect/callback URLs are set for local and production
- Keep existing Supabase env vars available to the app

## Minimal Implementation Shape

- User clicks Google button on login or signup
- Client starts `signInWithOAuth` with provider `google`
- Google redirects back to the existing auth callback route
- Callback exchanges code for session and continues the current app flow
- Existing middleware and auth provider keep session behavior consistent

## What Not to Add

- No NextAuth/Auth.js
- No extra Google frontend SDK
- No custom session store
- No extra OAuth backend layer if the current callback route is sufficient

## Recommendations

1. Reuse the existing callback and middleware path instead of creating a parallel auth flow.
2. Verify redirect URLs in Supabase before implementation work starts.
3. Confirm first-time Google users also get the profile/app data the current app expects.
4. Keep scope on Google only; defer broader auth redesign.
