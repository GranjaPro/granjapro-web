# Phase 11: Stripe Checkout Redirect - Research

**Researched:** 2026-06-14  
**Status:** Complete  
**Scope:** Create Stripe Checkout Sessions for monthly Essencial, Pro, and Premium subscriptions, and redirect users from existing plan selection surfaces.

## Phase Boundary

Phase 11 should only create Checkout Sessions and redirect users to Stripe-hosted Checkout. It must not update `profiles.plan` after a button click. Plan persistence, subscription lifecycle handling, webhook signature validation, and premium route hardening are Phase 12 responsibilities.

## Existing Repo Patterns

- Plan definitions already live in `lib/plans.ts` through `PLAN_TYPES`, `PlanType`, and `PLAN_MATRIX`.
- The current plan selection flow is `app/dashboard/select-plan/page.tsx`; it directly updates `profiles.plan` and explicitly tells users there is no Stripe/card flow yet.
- The upgrade modal in `components/plan/upgrade-popup.tsx` also directly updates `profiles.plan` for Pro/Premium upgrades.
- Server-side Supabase access is available through `lib/supabase/server.ts`.
- API routes use App Router route files, e.g. `app/api/ai/route.ts`.
- There is no test runner configured beyond `npm run build`/Next type checking, so verification must use build plus focused route/client behavior checks unless a test harness is introduced in a later phase.

## Stripe Findings

- Stripe Checkout Sessions are created server-side and return a hosted Checkout `url`.
- Subscription checkout uses `mode: "subscription"` with a recurring Price ID in `line_items`.
- `success_url`, `cancel_url`, `client_reference_id`, `customer_email`, and `metadata` are appropriate for linking the session back to the authenticated Granja Pro user and selected plan.
- The API route must validate the requested plan against `PlanType` before reading the mapped Price ID.
- Stripe secret keys and Price IDs must come from environment variables; agents must not invent product or price IDs.

## Recommended Design

Use a small typed Stripe checkout config module to map Granja Pro plan keys to required environment variables:

- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ESSENCIAL_MONTHLY`
- `STRIPE_PRICE_PRO_MONTHLY`
- `STRIPE_PRICE_PREMIUM_MONTHLY`

Create `POST /api/checkout` that:

1. Authenticates the current Supabase user.
2. Parses and validates `{ plan }`.
3. Resolves the matching Stripe Price ID from env.
4. Creates a Checkout Session with `mode: "subscription"`.
5. Returns `{ url }` for the client to redirect.

The client should preserve the existing plan cards and loading/error states, but call `/api/checkout` and assign `window.location.href = url` after success. `success_url` should return to `/dashboard/select-plan?checkout=success&session_id={CHECKOUT_SESSION_ID}` so the app can display a non-final "payment received, activation pending" state until Phase 12 webhooks update the profile.

## Risks

- **Missing Price ID env vars:** API route should return a clear 500 without exposing secrets.
- **Unauthenticated checkout requests:** API route should return 401 and the client should surface a login/session error.
- **Plan update bypass before payment:** Remove direct client-side `profiles.plan` updates from Phase 11 surfaces.
- **Webhook gap before Phase 12:** Success copy must not imply the plan is already active.

## Sources

- Stripe API Reference: Create a Checkout Session - https://docs.stripe.com/api/checkout/sessions/create
- Stripe Checkout quickstart - https://docs.stripe.com/checkout/quickstart
- stripe-node repository - https://github.com/stripe/stripe-node

## Research Complete

Phase 11 can proceed as one implementation plan focused on checkout session creation and redirect wiring.
