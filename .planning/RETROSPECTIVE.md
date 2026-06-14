# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.2 — Dark Theme & Granular Permissions

**Shipped:** 2026-06-02
**Phases:** 4 | **Plans:** 11 | **Sessions:** 1

### What Was Built
- Unified client-controlled dark mode theme for dashboard pages and charts.
- Plan-based central permission matrix (`lib/plans.ts`) protecting Pro/Premium actions.
- Next.js middleware routing guards and Supabase RLS backend guards.
- Secure trial period checks preventing client-side expiration bypass.

### What Worked
- Centralizing permission logic into `lib/plans.ts` made auditing route guards and buttons straightforward.
- Hardening auth security on the server side resolved the trial expiration vulnerability.

### What Was Inefficient
- Implementing dark theme adjustments in legacy charts required refactoring theme prop overrides across multiple pages.

### Key Lessons
1. A central permission matrix makes role changes and plan level updates trivial compared to per-page logic checks.
2. Server-side validation is required for time-based trials; client-side timestamp checks cannot be trusted.

---

## Milestone: v1.1 — Google Sign-In

**Shipped:** 2026-05-06
**Phases:** 2 | **Plans:** 2 | **Sessions:** 1

### What Was Built
- Google sign-in buttons integration in login and signup flows.
- Terms of service acceptance gate preventing signup before checking terms.
- Account continuity linking same-email social logins with password credentials.

### What Worked
- Reusing the existing Supabase OAuth provider setup avoided writing a custom authentication wrapper.
- Preserving the onboarding flows as-is for oauth users minimized registration path issues.

---

## Milestone: v1.0 — Finances Module + Calendar Sync

**Shipped:** 2026-05-01
**Phases:** 4 | **Plans:** 11 | **Sessions:** 1

### What Was Built
- Timezone-safe shared date filtering for dashboard workflows.
- Supabase-backed financial KPIs, charts, and transaction CRUD on the finances surface.
- Sale-to-revenue create sync with duplicate prevention via a sale reference field.

### What Worked
- Breaking the milestone into infrastructure, sync, KPI, and CRUD/chart phases kept the work easy to sequence.
- Reusing shared services and a shared date filter reduced drift between dashboard surfaces.

### What Was Inefficient
- Phase 1-3 verification artifacts were not produced during execution, so milestone close required accepting audit gaps.
- Sales-to-revenue sync stopped at create-time behavior, leaving lifecycle decisions for later.

### Patterns Established
- Shared service-layer aggregation feeding multiple dashboard surfaces.
- `useMemo` chart derivation from fetched transaction state.
- Reference-based idempotent cross-module sync.

### Key Lessons
1. Create `VERIFICATION.md` artifacts during each phase instead of reconstructing evidence at milestone close.
2. When syncing data across modules, define create, update, and delete behavior together.

### Cost Observations
- Model mix: not tracked in retrospective artifacts.
- Sessions: 1 milestone close session.
- Notable: planning artifacts gave strong traceability, but audit evidence lagged implementation.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.2      | 1        | 4      | Hardened security and client-side UI themes with plan matrix integration |
| v1.1      | 1        | 2      | Focused entrypoint addition without modifying core onboarding flows |
| v1.0      | 1        | 4      | Established milestone-scoped planning, validation, and audit structure for financial work |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.2      | Route guards and middleware validations | N/A | 0 |
| v1.1      | Supabase auth flow and continuity checks | N/A | 0 |
| v1.0      | TypeScript and build checks | N/A | 0 |

### Top Lessons (Verified Across Milestones)

1. Keep verification artifacts in sync with implementation work.
2. Define lifecycle behavior for cross-module sync before closing scope.
3. Centralize permission policies and gates to guarantee backend enforcement security.
