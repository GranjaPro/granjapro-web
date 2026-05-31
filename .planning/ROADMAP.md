# Roadmap: Granja Pro

## Milestones

- Completed **v1.0 Finances Module + Calendar Sync** - Phases 1-4 (shipped 2026-05-01). Archive: `.planning/milestones/v1.0-ROADMAP.md`
- Completed **v1.1 Google Sign-In** - Phases 5-6 (shipped 2026-05-06). Archive: `.planning/milestones/v1.1-ROADMAP.md`
- Active **v1.2 Dark Theme & Granular Permissions** - Phases 7-10

## Phases

<details>
<summary>Completed v1.0 Finances Module + Calendar Sync (Phases 1-4) - SHIPPED 2026-05-01</summary>

- [x] **Phase 1: Foundation** - 3/3 plans complete
- [x] **Phase 2: Calendar Sync** - 1/1 plans complete
- [x] **Phase 3: Financial KPIs** - 4/4 plans complete
- [x] **Phase 4: Charts, CRUD & Revenue Sync** - 3/3 plans complete

</details>

<details>
<summary>Completed v1.1 Google Sign-In (Phases 5-6) - SHIPPED 2026-05-06</summary>

- [x] **Phase 5: Google Entry Points & Signup Terms Gate** - 1/1 plan complete
- [x] **Phase 6: Existing Account Matching & Post-Login Continuity** - 1/1 plan complete

</details>

### Phase 7: Dark Theme Foundation

**Goal:** Make the dashboard use an app-controlled dark theme and remove system-theme behavior from the product experience.

**Requirements:** THEME-01, THEME-02, THEME-03, THEME-04

**Success criteria:**
1. Dashboard shell, sidebar, top bar, scroll areas, modals, and common primitives render with dark-theme-safe colors.
2. No visible "system" theme mode remains in the app experience.
3. Dashboard pages keep readable contrast and focus states on mobile and desktop.
4. Public/auth pages do not regress from global theme changes.

**Plans:**

**Wave 1**
- [x] **07-01: Dashboard Dark Foundation and Shared Primitives** - Make the authenticated dashboard deterministically dark and update shared primitive defaults.

**Wave 2** *(blocked on Wave 1 completion)*
- [x] **07-02: Remove System Theme Option and Darken Shared Overlays** - Remove visible system-theme behavior and darken profile settings, date controls, locked overlays, and upgrade popup.

**Wave 3** *(blocked on Wave 2 completion)*
- [x] **07-03: Dashboard Page Cleanup and Theme Verification** - Selectively convert key dashboard pages and verify public/auth pages do not regress.

### Phase 8: Plan Persistence & Permission Matrix

**Goal:** Add the real subscription tier field to Supabase and define the central plan/capability/limit model.

**Requirements:** PLAN-01, PLAN-02, PLAN-03, PLAN-04, PLAN-05, PERM-01, PERM-04, PERM-06, AI-03

**Success criteria:**
1. Supabase migrations/schema include `profiles.plan` with valid allowed values and `essencial` default.
2. New user profile creation produces a valid plan automatically.
3. TypeScript plan handling is schema-aligned and defensive against invalid data.
4. A central permission/limit matrix defines capabilities for Essencial, Pro, and Premium.
5. Limits for users, birds, farms, tasks, insights, and AI credits are represented in one reusable model.
6. Users without an active plan cannot see dashboard navigation or app routes before selecting a plan.
7. Active trials show in-app notices and expired trials clear `profiles.plan` to `null`.
8. Workers and Reports have an authenticated Pro/Premium route guard foundation.
9. Sidebar and header plan labels reflect the user's active persisted plan.

### Phase 9: UI Permission Integration

**Goal:** Replace scattered component-level plan checks with shared permission helpers and consistent upgrade messaging.
**Requirements:** PERM-02, PERM-03, PERM-05, SEC-02

**Success criteria:**
1. Sidebar Pro/Premium navigation uses the central permission model.
2. Existing locked dashboard regions use shared helpers where practical in this milestone.
3. Locked components avoid rendering protected data before plan checks when practical.
4. Upgrade popup plan names and pricing match the landing page.
5. Repeated `plan === "essencial"` and `plan !== "premium"` checks are reduced in touched areas.

**Plans:**

**Wave 1**
- [x] **09-01: Shared Permission Primitives Normalization** - Standardize plan badges, lock overlay semantics, and shared shell helper usage.

**Wave 2** *(blocked on Wave 1 completion)*
- [x] **09-02: Page-Level Locking and Autolayout Coherence** - Normalize locked regions and toggle-driven layout behavior across touched dashboard pages.

**Wave 3** *(blocked on Wave 2 completion)*
- [x] **09-03: AI Usage Meter Integration and Upgrade Copy Finalization** - Move AI usage displays to central metadata and remove pricing/copy drift.

### Phase 10: Route, API & AI Usage Guards

**Goal:** Add guard foundations so Pro/Premium routes and AI tiers are not only protected by client-side UX.

**Requirements:** SEC-01, SEC-03, SEC-04, AI-01, AI-02, AI-04

**Success criteria:**
1. Direct navigation to Pro/Premium dashboard routes is blocked for insufficient plans.
2. Permission-denied states are clear and route users toward upgrade without breaking the dashboard shell.
3. AI API validates the user's persisted plan before accepting detailed or diagnostic tiers.
4. AI credit consumption has a database-backed persistence foundation.
5. Premium AI behavior is unavailable to Essencial and Pro users through direct API calls.

## Backlog

- [ ] Decide whether to promote the accepted v1.0 closeout gaps into a later follow-up milestone.
- [ ] Decide whether to backfill v1.1 Phase 5 validation/UAT debt.
- [ ] Implement payment processor integration and subscription webhooks after plan enforcement foundations exist.

## Progress

| Milestone | Phase Range | Plans Complete | Status | Shipped |
|-----------|-------------|----------------|--------|---------|
| v1.0 Finances Module + Calendar Sync | 1-4 | 11/11 | Shipped | 2026-05-01 |
| v1.1 Google Sign-In | 5-6 | 2/2 | Shipped | 2026-05-06 |
| v1.2 Dark Theme & Granular Permissions | 7-10 | 9/9 | Active | - |

---
*Roadmap updated: 2026-05-06 after starting v1.2*
