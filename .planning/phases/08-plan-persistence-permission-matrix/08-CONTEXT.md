# Phase 8: Plan Persistence & Permission Matrix - Context

**Gathered:** 2026-05-13
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers the persisted plan foundation and central permission/limit model for Granja Pro. It aligns the app repository with the real Supabase `profiles.plan` source of truth, defines how invalid or missing plan states are handled, and creates the reusable Essencial, Pro, and Premium capability/limit matrix that later UI, route, API, and AI guard phases will consume.

This phase may add the plan-selection/trial routing foundation needed for users without a valid plan. It does not integrate Stripe, implement real payment checkout, enforce every commercial limit across the product, or replace all scattered UI checks. Those remain future or later-phase work.

</domain>

<decisions>
## Implementation Decisions

### Plan Source of Truth

- **D-01:** The real Supabase `profiles.plan` field is the source of truth for the user's plan. The repository migrations/schema/types should be aligned with this reality instead of treating the field as hypothetical.
- **D-02:** Valid persisted plan values are `essencial`, `pro`, and `premium`.
- **D-03:** New profile creation must produce a valid plan state automatically when possible, but users with missing, null, empty, or invalid plan values must not silently receive full dashboard access as `essencial`.
- **D-04:** Users without a valid plan should be redirected immediately to a plan-selection/subscription page.
- **D-05:** The plan-selection page must let users choose a plan or start a 7-day free trial without requiring a card.
- **D-06:** When the user selects a normal plan, the app must persist that choice to `profiles.plan` and then redirect to the dashboard.
- **D-07:** Stripe, billing validation, card collection, subscription lifecycle, and real payment checkout are out of scope for this phase. The flow should leave an obvious future integration point for Stripe.

### Trial Behavior

- **D-08:** The free 7-day trial always grants Premium access during the trial period by saving `profiles.plan = "premium"`.
- **D-09:** Trial state must be persisted so the app knows whether the user has already used the trial and when it expires.
- **D-10:** The planner should create or prepare explicit profile-level trial fields, such as `trial_started_at`, `trial_ends_at`, and `trial_used_at` or equivalent names.
- **D-11:** After the 7-day trial expires, the next login/dashboard entry should send the user back to the plan-selection page.
- **D-12:** A user whose trial has expired must not be able to select the free trial again.
- **D-13:** Initial validation may be simple and tied to login/dashboard entry. Full billing/subscription validation remains future work.

### Capability Vocabulary

- **D-14:** The central matrix should use product-facing capability names as the primary vocabulary, not route-specific or component-specific names.
- **D-15:** Capabilities may include route, screen, or component details as metadata where useful for later integration phases.
- **D-16:** Example capability names include `ai_assistant`, `reports`, `workers`, `environmental_conditions`, `advanced_insights`, `farm_management`, and `task_management`.
- **D-17:** Example metadata mappings include `ai_assistant` protecting `/dashboard/ai`, `reports` protecting `/dashboard/reports`, `workers` protecting `/dashboard/workers`, and `environmental_conditions` protecting the environmental section in `/dashboard/barns`.

### Permission Shape

- **D-18:** Most capabilities should be expressed by minimum plan, for example `minimumPlan: "pro"`.
- **D-19:** Capabilities that have internal modes may define mode-level permissions in addition to minimum plan. The primary known example is AI.
- **D-20:** Permission helpers should eventually be able to answer: can this plan access this capability, which plan unlocks this capability, and which modes are allowed for this plan.

### Commercial Limits

- **D-21:** The current landing page is the temporary commercial source of truth for launch-facing limits.
- **D-22:** Phase 8 should centralize the landing-page limits so the rest of the site/app can consume the same values.
- **D-23:** Published landing-page limits are: Essencial has up to 300 birds, 1 user, and 15 monthly AI credits; Pro has up to 1000 birds, 2 users, and 30 monthly AI credits; Premium has unlimited birds, 5 users, and 60 monthly AI credits.
- **D-24:** Limits not clearly defined on the landing page may be represented with conservative temporary values that are easy to revise before launch.
- **D-25:** Temporary limit direction: Essencial has 1 farm, limited tasks, and basic insights; Pro has 2 farms, expanded task capacity, and advanced insights; Premium has unlimited farms, unlimited tasks, and complete insights.
- **D-26:** The existing `UpgradePopup` copy diverges from the landing page and should not be treated as the source of truth. Aligning user-facing upgrade copy belongs mainly to Phase 9.

### AI Credit Model

- **D-27:** AI credits are consumed by analysis weight, not by a flat one-credit-per-message model.
- **D-28:** The user should be able to select the response level when sending the message, matching the intended UI pattern.
- **D-29:** Initial AI mode costs are: `simple` / "Resumo simples" costs 1 credit, `detailed` / "Análise detalhada" costs 3 credits, and `diagnostic` / "Diagnóstico com recomendações" costs 5 credits.
- **D-30:** All plans may use all AI modes as long as they have enough available credits.
- **D-31:** The matrix should centralize monthly credits by plan, allowed modes, per-mode credit cost, and UI labels/descriptions for the response-level selector.
- **D-32:** The UI should be able to show the user's available credits and each prompt/template or selected response level's credit cost before sending.

### the agent's Discretion

The planner may choose exact field names, module names, helper function names, and the implementation sequence as long as the resulting model is centralized, schema-aligned, defensive against invalid plan data, trial-aware, and prepared for future Stripe/payment integration without adding real billing in this phase.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning

- `.planning/REQUIREMENTS.md` - v1.2 requirements, especially PLAN-01 through PLAN-04, PERM-01, PERM-04, and AI-03.
- `.planning/ROADMAP.md` - Phase 8 goal and success criteria.
- `.planning/PROJECT.md` - product constraints, milestone direction, and the decision that plan gating must move behind a central matrix.
- `.planning/STATE.md` - active milestone context and known pitfalls around plan field drift and client-only gating.

### Prior Phase Context

- `.planning/phases/07-dark-theme-foundation/07-CONTEXT.md` - confirms that permission architecture begins in Phase 8 and that Phase 7 only prepared plan-gated UI visually.

### Existing Implementation

- `supabase/schema.sql` - complete schema snapshot currently missing repository-level `profiles.plan` alignment.
- `supabase/migrations/00001_initial_schema.sql` - initial schema migration and `handle_new_user` profile creation trigger.
- `lib/database.types.ts` - TypeScript database type currently includes `profiles.plan`.
- `components/auth/auth-provider.tsx` - loads `profile` and drives dashboard/auth state that plan redirection will likely depend on.
- `components/plan/plan-provider.tsx` - current plan context defaults to `essencial` and casts `profile.plan`.
- `components/plan/locked-overlay.tsx` - current UX-only locked content pattern.
- `components/plan/upgrade-popup.tsx` - current upgrade copy, not the commercial source of truth.
- `app/dashboard/layout.tsx` - dashboard shell, nav gating, `PlanProvider`, and likely plan-selection redirect integration point.
- `app/page.tsx` - current landing page pricing/limits and temporary commercial source of truth.
- `app/api/ai/route.ts` - current AI route trusts client-selected tier; enforcement belongs mainly to Phase 10, but the Phase 8 matrix should prepare the model.
- `app/dashboard/barns/page.tsx` - existing example of component-level plan checks for environmental conditions.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `components/plan/plan-provider.tsx`: existing plan context and `PlanType` union, but it needs defensive parsing and should stop blindly casting arbitrary profile values.
- `components/plan/locked-overlay.tsx`: existing locked-content UX that later phases can connect to the central matrix.
- `components/plan/upgrade-popup.tsx`: existing upgrade prompt surface, though its pricing/limits copy must be reconciled with the landing page later.
- `components/auth/auth-provider.tsx`: established source of authenticated `profile`, `farm`, and loading state.
- `lib/database.types.ts`: existing generated-style database type file already expects `profiles.plan`.
- `lib/utils.ts` `cn()`: existing utility pattern for shared UI code if the plan-selection page needs local UI composition.

### Established Patterns

- The app uses Next.js app router, React client components, Supabase Auth, and Supabase table reads through `createClient()`.
- Authenticated dashboard state flows through `AuthProvider` and then `PlanProvider` inside `app/dashboard/layout.tsx`.
- Current plan handling is scattered and client-side, with checks like `plan === "essencial"` and nav items marked `pro: true`.
- The database layer uses SQL migrations under `supabase/migrations` plus `supabase/schema.sql` as a complete schema snapshot.
- The current profile creation trigger inserts `id`, `email`, and `full_name`; Phase 8 should update it to create/maintain valid plan/trial state.

### Integration Points

- Supabase schema/migrations for `profiles.plan`, allowed values, defaults, and trial fields.
- Profile creation trigger `public.handle_new_user()` for valid defaults on signup.
- Runtime plan parser/helper module, likely under `lib/` or `components/plan/`, to centralize plan validation and permission checks.
- Dashboard/auth entry flow for redirecting users with invalid plan or expired trial to plan selection.
- New plan-selection page for choosing `essencial`, `pro`, `premium`, or the one-time 7-day Premium trial.
- Existing pricing data in `app/page.tsx`, which should be either imported from or reconciled with the new central plan matrix.
- AI UI/API foundations should consume the matrix later for credit weights and available balance display.

</code_context>

<specifics>
## Specific Ideas

- User provided a Supabase screenshot showing `public.profiles.plan` already exists in the live database with `essencial`, `pro`, and `premium` values.
- User wants invalid/missing-plan users routed to a plan-selection page instead of silently falling back into the dashboard.
- User wants the free trial to require no card and no Stripe integration in this phase.
- User wants the 7-day trial to always grant Premium and become unavailable after it has been used.
- User selected a mixed capability vocabulary: product capability names at the top, route/component metadata underneath.
- User selected minimum-plan permissions by default, with mode-level detail where needed.
- User wants landing-page commercial limits treated as the current source of truth until launch review.
- User provided UI references for AI response-level selection and credit display: simple costs 1, detailed costs 3, diagnostic costs 5.
- User chose to allow all plans to use all AI modes, limited by available monthly credits.

</specifics>

<deferred>
## Deferred Ideas

- Stripe checkout, subscription webhooks, card collection, billing portal, and real subscription validation are deferred to a future phase.
- Replacing all scattered UI checks with shared helpers belongs mainly to Phase 9.
- Route/API enforcement and server-side AI tier validation belong mainly to Phase 10.
- Final launch pricing and commercial limit review remains deferred until the user revises the launch model.
- Aligning `UpgradePopup` copy with the landing page belongs mainly to Phase 9.

</deferred>

---

*Phase: 8-Plan Persistence & Permission Matrix*
*Context gathered: 2026-05-13*
