---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: Dark Theme & Granular Permissions
status: planning
last_updated: "2026-05-06T22:13:05.191Z"
last_activity: 2026-05-06 - Phase 7 context gathered
progress:
  total_phases: 4
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# Project State: Granja Pro

**Last updated:** 2026-05-06
**Latest shipped milestone:** v1.1 - Google Sign-In

---

## Project Reference

**Core Value:** Help egg farmers simplify daily farm management and improve financial control - the platform must be fast, intuitive, and useful every single day.

**Current Focus:** v1.2 Dark Theme & Granular Permissions.

---

## Current Position

Phase: 7 - Dark Theme Foundation
Plan: Not planned yet
Status: Context gathered; ready for planning
Last activity: 2026-05-06 - Phase 7 context gathered

## Phase Summary

| Phase | Goal | Status |
|-------|------|--------|
| 1 - Foundation | Shared infrastructure: date handling, type safety, service layer | Completed |
| 2 - Calendar Sync | All dashboard pages share one date range source of truth | Completed |
| 3 - Financial KPIs | Real Supabase data on finances page and dashboard widget | Completed |
| 4 - Charts, CRUD & Revenue Sync | Live charts, transaction management, sales auto-sync | Completed |
| 5 - Google Entry Points & Signup Terms Gate | Add Google entry points on login/signup and enforce the signup terms gate before Google sign-up | Completed |
| 6 - Existing Account Matching & Post-Login Continuity | Reuse same-email accounts and preserve the current post-login routing/onboarding behavior | Completed |
| 7 - Dark Theme Foundation | Make the dashboard use an app-controlled dark theme and remove system-theme behavior | Planned |
| 8 - Plan Persistence & Permission Matrix | Add the real subscription tier field and central plan/capability/limit model | Planned |
| 9 - UI Permission Integration | Replace scattered component-level plan checks with shared permission helpers | Planned |
| 10 - Route, API & AI Usage Guards | Add guard foundations for Pro/Premium routes and AI tiers | Planned |

---

## Performance Metrics

- **Phases completed:** 6 / 10 overall
- **Active milestone phases defined:** 4 / 4
- **Active milestone requirements mapped:** 21 / 21
- **Active milestone plans completed:** 0 / 4
- **Latest shipped milestone audit:** `tech_debt` accepted at close
- **Nyquist coverage:** v1.1 partial (Phase 6 compliant; Phase 5 validation missing and accepted as debt)

---

## Accumulated Context

### Key Decisions

| Decision | Rationale | Status |
|----------|-----------|--------|
| Keep v1.1 limited to Google login/signup entry points plus account reuse | Preserves a small, focused auth milestone | Completed |
| Require the signup terms checkbox before Google sign-up starts | Keeps the existing signup policy intact | Completed |
| Reuse the existing post-login routing/onboarding flow after Google auth | Avoids forked auth experiences and broad rewrites | Active |
| Do not block phase closure on phase-level `npm run ...` checks | Keeps phase tracking focused on scoped deliverables and explicit user approval | Active |
| v1.2 starts with dark theme before permissions integration | Reduces visual churn before replacing plan-gated UI surfaces | Active |
| Plan enforcement must become centralized and server-aware | Current plan checks are UX-only and repeated across pages | Active |

### Critical Pitfalls

1. **Redirect/callback misconfiguration** - Google auth can fail between local and production environments even if the UI entry points are correct.
2. **Duplicate-account creation** - same-email Google sign-in must resolve into the existing account path instead of creating parallel user records.
3. **Broken onboarding continuity** - social-login users may bypass password-specific assumptions and still need to follow existing app gating.
4. **Plan field drift** - TypeScript already expects `profiles.plan`, but migrations/schema do not define it.
5. **Client-only gating** - blurred overlays and menu interception do not protect routes, APIs, or data queries.
6. **AI tier spoofing** - the API currently trusts the tier submitted by the client.

### Architecture Notes

- Reuse the current Supabase + Next.js auth stack and callback behavior already present in the app.
- Do not introduce a custom backend or new auth libraries for this milestone.
- Google sign-in should plug into the current post-login routing/onboarding flow rather than creating a parallel path.
- `components/plan/plan-provider.tsx` currently defaults to `essencial` and reads `profile.plan`.
- `components/plan/locked-overlay.tsx` currently blocks by UX only and may leave blurred protected content in the DOM.
- `app/api/ai/route.ts` currently changes behavior based on a client-submitted tier.

### Todos

- [x] Create the detailed implementation plan for Phase 5.
- [x] Execute Phase 5 plan 05-01 and close the phase.
- [x] Create the detailed implementation plan for Phase 6.
- [x] Execute Phase 6 plan 06-01.
- [x] Resolve the unrelated dashboard TypeScript build blocker before full automated verification.
- [x] Run live Supabase/Google OAuth verification for AUTH-03 and AUTH-04.
- [x] Define v1.2 requirements for dark theme and granular permissions.
- [x] Create v1.2 roadmap with phases 7-10.
- [x] Discuss Phase 7 dark theme foundation.
- [ ] Plan Phase 7 dark theme foundation.
- [ ] Decide whether the accepted v1.0 closeout gaps become a separate follow-up milestone.

### Blockers

None currently recorded for milestone flow.

## Deferred Items

Items acknowledged and deferred at milestone close on 2026-05-06:

| Category | Item | Status |
|----------|------|--------|
| uat_gap | Phase 05 `05-HUMAN-UAT.md` has approved skipped scenarios and 0 pending scenarios | accepted |
| validation | Phase 05 missing `05-VALIDATION.md` | accepted |

---

## Session Continuity

**To resume work:**

1. Read `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, and `.planning/STATE.md`.
2. Start Phase 7 planning with `$gsd-plan-phase 7`.
3. Keep v1.2 scope focused on dark theme, plan persistence, central permissions, and route/API guard foundations.

---
*State updated: 2026-05-06 after gathering Phase 7 context*
