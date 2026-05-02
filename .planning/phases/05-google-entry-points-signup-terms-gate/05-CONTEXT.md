# Phase 5: Google Entry Points & Signup Terms Gate - Context

**Gathered:** 2026-05-02
**Status:** Ready for planning

## Phase Boundary

This phase adds Google authentication entry points to the existing login and signup pages, and enforces the existing required-terms acceptance before Google signup can start. It does not redesign the auth pages, change the post-login routing model, or broaden the milestone beyond AUTH-01, AUTH-02, and SIGN-01.

## Implementation Decisions

### Terms gate UX
- **D-01:** On the signup page, the Google CTA must stay disabled until the required terms checkbox is accepted.
- **D-02:** While disabled, the Google CTA must have short helper text near the CTA explaining that terms acceptance is required before continuing with Google.
- **D-03:** Once the checkbox is accepted, the Google CTA should become available immediately.
- **D-04:** Enabling the Google CTA depends only on terms acceptance, not on any typed name, email, or password fields.

### Google CTA copy
- **D-05:** Login and signup should use different Google CTA wording.
- **D-06:** CTA labels should use direct-action wording rather than friendly or generic continuation phrasing.
- **D-07:** The login CTA should explicitly feel login-specific / existing-account oriented.
- **D-08:** The signup CTA should keep concise main wording and add small nearby subtext reinforcing the terms gate instead of embedding the requirement into the button label.

### Redirect and error feedback
- **D-09:** After the Google CTA is clicked, it should enter a loading state and become disabled.
- **D-10:** Loading copy should be Google-specific, e.g. equivalent to “Conectando com Google...”, not a generic loading label.
- **D-11:** If the OAuth handoff fails before the page leaves for Google, the page should show an inline error near the Google CTA.
- **D-12:** While Google redirect is in progress, other auth actions should be locked so the user cannot trigger a competing auth flow.

### Layout and path separation
- **D-13:** Keep the current auth-page structure on both login and signup: manual form first, divider, then the Google CTA below.
- **D-14:** Keep the current simple divider wording (`ou`).
- **D-15:** Keep the Google CTA full-width on both pages.
- **D-16:** Manual signup and Google signup remain separate paths; typed manual fields stay on the page but are not consumed by the Google path.
- **D-17:** If the user returns after canceling Google signup, preserve typed manual values when possible.
- **D-18:** Do not add stronger sectioning or a larger layout change to separate manual signup from Google signup.

### Visual consistency
- **D-19:** Keep the Google CTA at the same visual hierarchy/weight it has today as the secondary auth action.
- **D-20:** Disabled Google CTA states should reuse the same disabled visual language already used by the main submit button.
- **D-21:** Google loading states should reuse the same spinner style already used by the main auth submit buttons.
- **D-22:** New helper and error text near the Google CTA should match the existing auth-page message styling.

### Claude's Discretion
None — the phase direction is tightly specified for planning.

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone scope and requirements
- `.planning/ROADMAP.md` — Phase 5 scope boundary, goal, and success criteria.
- `.planning/REQUIREMENTS.md` — Requirements AUTH-01, AUTH-02, and SIGN-01 mapped to this phase.
- `.planning/PROJECT.md` — Project constraints, milestone focus, and no-broad-auth-rewrite guidance.
- `.planning/STATE.md` — Current milestone intent, known pitfalls, and session continuity context.

### Existing auth UI
- `app/(auth)/login/page.tsx` — Current login CTA placement, manual auth flow, and button/error styling patterns.
- `app/(auth)/signup/page.tsx` — Current signup terms checkbox, manual signup flow, Google CTA placement, and success state.

### Existing auth flow
- `app/auth/callback/route.ts` — OAuth callback exchange, `next` redirect handling, and onboarding continuity behavior.
- `lib/supabase/client.ts` — Browser Supabase client used by auth entry points.
- `lib/supabase/middleware.ts` — Public/auth route protection and authenticated-user redirect behavior.

## Existing Code Insights

### Reusable Assets
- `createClient()` in `lib/supabase/client.ts` — Existing browser client already used by login/signup and suitable for the Google entry points.
- Existing auth-page error banner pattern in `app/(auth)/login/page.tsx` and `app/(auth)/signup/page.tsx` — Reusable for Google-path errors.
- Existing `Loader2` submit-button loading treatment on auth pages — Reusable for Google loading states.
- Existing terms checkbox in `app/(auth)/signup/page.tsx` — Natural source of truth for gating Google signup.

### Established Patterns
- Auth pages are client components using local `useState` for loading/error/form state.
- Supabase OAuth currently uses `signInWithOAuth({ provider: "google", options: { redirectTo: ... } })` with `/auth/callback`.
- Auth pages use full-width primary submit buttons, a simple `ou` divider, and a white secondary full-width Google button below the divider.
- The project prefers small, focused changes and avoids unnecessary UI redesigns.

### Integration Points
- `app/(auth)/login/page.tsx` — Google login CTA behavior and page-specific copy.
- `app/(auth)/signup/page.tsx` — Terms gate, Google signup CTA, helper text, and loading/disabled states.
- `app/auth/callback/route.ts` — Existing handoff target that already preserves onboarding continuity after auth succeeds.
- `lib/supabase/middleware.ts` — Existing auth route redirect rules that must stay coherent with the updated entry points.

## Specific Ideas

- Preferred copy direction is direct-action, page-specific wording. Examples aligned with the discussion: login label equivalent to `Entrar com Google`, signup label equivalent to `Criar conta com Google`, and loading label equivalent to `Conectando com Google...`.
- The Google path on signup should feel clearly gated by terms acceptance, but without a major visual redesign or strong path-switch messaging.

## Deferred Ideas

None — discussion stayed within phase scope.

---

*Phase: 5-Google Entry Points & Signup Terms Gate*
*Context gathered: 2026-05-02*
