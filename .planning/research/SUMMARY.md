# Project Research Summary — Google Sign-In

**Project:** Granja Pro
**Milestone:** v1.1 Google Sign-In
**Researched:** 2026-05-01
**Confidence:** HIGH

## Executive Summary

Granja Pro already has the core technical pieces needed for a focused Google sign-in milestone. The current Supabase + Next.js auth stack, callback route, middleware, and auth provider flow should be reused rather than expanded with new auth libraries. The main work is provider configuration, integrating Google as an entry point on login and signup, preserving current post-login routing, and handling first-time-user plus same-email-linking behavior explicitly.

## Stack Additions

No new dependencies are required. The milestone depends on correct Google provider configuration in Supabase and correct redirect/callback URLs for local and production environments.

## Feature Table Stakes

- Google sign-in on login and signup pages
- Required signup terms checkbox still enforced before Google auth on signup
- First-time Google users authenticate without password creation
- Existing same-email accounts link into the existing account
- Current post-login dashboard/onboarding behavior remains intact

## Watch Out For

- Misconfigured redirect URLs
- Same-email collision behavior left undefined
- Profile/onboarding assumptions breaking for first-time Google users
- Session/callback flow working on one environment but not another
- Silent duplicate-account or duplicate-record creation

## Suggested Focus

Keep v1.1 limited to core Google sign-in behavior. Defer multi-provider auth, manual account-linking UI, Google profile sync polish, and broader auth-system redesign.
