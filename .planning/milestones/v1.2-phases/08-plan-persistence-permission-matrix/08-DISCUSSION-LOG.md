# Phase 8: Plan Persistence & Permission Matrix - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-05-13
**Phase:** 8-Plan Persistence & Permission Matrix
**Areas discussed:** Plan Source of Truth, Capability Vocabulary, Commercial Limits, AI Credit Model

---

## Plan Source of Truth

| Option | Description | Selected |
|--------|-------------|----------|
| Silent Essencial fallback | Treat missing or invalid plan data as `essencial` and let the dashboard continue. | |
| Plan-selection redirect | Send users with missing, null, empty, or invalid plans to a plan-selection page. | x |
| Hard error/block | Stop access until the profile is manually repaired. | |

**User's choice:** Plan-selection redirect.
**Notes:** User showed that the live Supabase `profiles` table already has a `plan` text column with `essencial`, `pro`, and `premium` values. Missing or invalid plans should be handled immediately by sending the user to a page where they can select a plan or enter a 7-day free trial without card registration. There is no Stripe integration in this phase, but the flow should be prepared for future Stripe connection. Selecting a normal plan must persist the choice to `profiles.plan`.

### Trial Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Trial chooses a plan and only saves that plan | Simpler, but does not track trial usage or expiry. | |
| Explicit trial state | Persist trial start/end/used state and save Premium during trial. | x |
| Trial always enters as Essencial | Conservative, but not aligned with the desired commercial experience. | |

**User's choice:** Explicit trial state.
**Notes:** The 7-day trial always grants Premium. After 7 days, on login/dashboard entry, the user must return to plan selection and cannot select the free trial again.

---

## Capability Vocabulary

| Option | Description | Selected |
|--------|-------------|----------|
| Product names | Use business-facing capability keys like `ai_assistant`, `reports`, and `workers`. | |
| Route names | Use route/screen-specific keys like `dashboard_ai` or `dashboard_reports`. | |
| Mixed model | Use product-facing capability names with route/component metadata where useful. | x |

**User's choice:** Mixed model.
**Notes:** The matrix should stay understandable as product policy while still giving later phases route/component hooks for implementation.

### Permission Shape

| Option | Description | Selected |
|--------|-------------|----------|
| Binary access | Store only `true` or `false` per capability. | |
| Minimum plan | Store the minimum required plan for most capabilities. | x |
| Mode-level permissions | Use modes/levels where needed, especially for AI. | x |

**User's choice:** Minimum plan by default, mode-level detail where needed.
**Notes:** Helpers should eventually answer whether a plan can access a capability, which plan unlocks it, and which modes are available.

---

## Commercial Limits

| Option | Description | Selected |
|--------|-------------|----------|
| Landing page as source | Use current landing-page limits as the temporary commercial source of truth. | x |
| Upgrade popup as source | Use existing `UpgradePopup` copy, including its divergent farm limits. | |
| Define a new final table now | Create a final launch table during discussion. | |

**User's choice:** Landing page as source for now.
**Notes:** User will revise launch behavior later. For now, the rest of the site may expose the limits already present on the landing page.

### Unspecified Limits

| Option | Description | Selected |
|--------|-------------|----------|
| Leave unspecified/unlimited | Document undefined limits without numbers. | |
| Conservative temporary limits | Add temporary conservative values for missing limit dimensions. | x |
| Structure only | Support fields without exposing values yet. | |

**User's choice:** Conservative temporary limits.
**Notes:** Landing-page limits should be centralized: Essencial has 300 birds, 1 user, and 15 monthly AI credits; Pro has 1000 birds, 2 users, and 30 monthly AI credits; Premium has unlimited birds, 5 users, and 60 monthly AI credits. Temporary values may cover farms, tasks, and insights until launch review.

---

## AI Credit Model

| Option | Description | Selected |
|--------|-------------|----------|
| One credit per use | Any AI analysis consumes one credit. | |
| Weighted credits by analysis level | Simple, detailed, and diagnostic responses consume different credits. | x |
| Separate access and consumption | Define allowed modes and credits separately, with simple consumption for now. | |

**User's choice:** Weighted credits by analysis level.
**Notes:** User provided UI references where the user chooses response level when sending the message. Initial weights are simple/resumo = 1 credit, detailed/analise = 3 credits, diagnostic/recommendations = 5 credits.

### AI Mode Availability

| Option | Description | Selected |
|--------|-------------|----------|
| Tiered modes by plan | Essencial gets simple, Pro gets simple + detailed, Premium gets all. | |
| All plans can use all modes if credits allow | Plan controls monthly credits, not response-level access. | x |
| Premium-only diagnostic | Essencial/Pro get simple + detailed; Premium unlocks diagnostic. | |

**User's choice:** All plans can use all modes if credits allow.
**Notes:** The matrix should still centralize available modes and costs so UI and future API enforcement can read the same source.

---

## the agent's Discretion

- The planner may choose exact field names for trial state.
- The planner may choose exact module/helper names for the permission matrix.
- The planner may choose the simplest safe redirect/checkpoint in login/dashboard flow for this phase.

## Deferred Ideas

- Stripe checkout and subscription validation.
- Full UI helper replacement.
- Route/API guard enforcement.
- Final launch pricing and limit review.
