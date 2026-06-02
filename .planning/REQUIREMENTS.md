# Requirements: v1.2 Dark Theme & Granular Permissions

## Milestone Goal

Make the dashboard use a deliberate dark theme and replace scattered plan checks with a central, enforceable permissions foundation for Essencial, Pro, and Premium users.

## Context

The app already has a visual plan-gating concept through `components/plan/plan-provider.tsx`, `LockedOverlay`, and local page checks. Today that system is granular by component but not centralized or secure:

- `profiles.plan` exists in TypeScript types but is missing from the SQL schema and migrations.
- Plan checks are repeated across pages with `plan === "essencial"` and `plan !== "premium"`.
- Locked content is blurred in the DOM and data may still be queried before the overlay renders.
- Pro/Premium menu links are blocked in UX only, not by route or server validation.
- AI credits and tiers are local/client-controlled and the API trusts the requested tier.
- Landing page pricing and in-app upgrade popup pricing are inconsistent.

## Requirements

### Theme

- [ ] **THEME-01**: The dashboard uses a deliberate dark theme controlled by the app, not by the user's operating-system preference.
- [ ] **THEME-02**: The app removes or disables any "system" theme option so users only experience explicitly supported theme modes.
- [ ] **THEME-03**: Dashboard shell, navigation, modals, locked overlays, and common UI primitives have dark-theme-safe colors, contrast, and focus states.
- [ ] **THEME-04**: Existing public/auth pages are not unintentionally restyled unless they are required to keep global theme behavior stable.

### Plan Persistence

- [ ] **PLAN-01**: Supabase migrations and schema define `profiles.plan` with allowed values `essencial`, `pro`, and `premium`, defaulting to `essencial`.
- [ ] **PLAN-02**: New profiles created by auth signup receive a valid default plan without relying on manual database edits.
- [ ] **PLAN-03**: TypeScript database types and runtime plan parsing stay aligned with the database schema.
- [ ] **PLAN-04**: The app handles missing, null, or invalid plan values defensively by falling back to `essencial`.
- [x] **PLAN-05**: Expired free trials clear the active plan to `null` and return the user to plan selection before showing dashboard navigation.

### Permission Matrix

- [ ] **PERM-01**: A central permission matrix defines which plan can access each gated capability.
- [x] **PERM-02**: Existing scattered checks for Pro/Premium UI features are replaced with shared permission helpers where practical for this milestone.
- [x] **PERM-03**: Menu items, locked components, and upgrade prompts read from the same plan/capability definitions.
- [ ] **PERM-04**: The permission matrix documents limits for users, birds, farms, tasks, insights, and AI credits even when some limits are only enforcement foundations in this milestone.
- [x] **PERM-05**: In-app upgrade messaging uses the same plan names and pricing as the public landing page.
- [ ] **PERM-06**: Authenticated users with valid plans can reach plan selection from the dashboard navigation and user preferences.

### Guards and Data Exposure

- [x] **SEC-01**: Pro/Premium dashboard routes have a shared guard that blocks direct navigation for insufficient plans.
- [x] **SEC-02**: Locked UI regions avoid querying or rendering protected data before the user's plan has been checked when practical.
- [x] **SEC-04**: Permission-denied states are explicit, user-friendly, and route the user to upgrade without breaking dashboard navigation.

### AI and Usage Limits (DEFERRED)

- [ ] **AI-01**: AI tier access is tied to the user's persisted plan instead of trusting the client-selected tier.
- [ ] **AI-02**: AI credit consumption has a database-backed persistence foundation instead of local-only state.
- [ ] **AI-03**: The app defines monthly AI credit allowances per plan in the central permission/limit matrix.
- [ ] **AI-04**: Premium-only AI behavior remains unavailable to Essencial and Pro users even when calling the API directly.

## Future Requirements

- Payment processor integration and subscription webhooks.
- Full billing portal and plan-change workflow.
- Complete enforcement for every promised commercial limit if it requires broader product/payment work.
- Full dashboard visual redesign beyond dark-theme compatibility.

## Out of Scope

- Native mobile app theming.
- Repricing or changing the public plan strategy.
- Reworking v1.0 accepted sale edit/delete revenue sync debt unless touched incidentally.
- Backfilling v1.1 Phase 5 validation/UAT debt.

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| THEME-01 | Phase 7 | Planned |
| THEME-02 | Phase 7 | Planned |
| THEME-03 | Phase 7 | Planned |
| THEME-04 | Phase 7 | Planned |
| PLAN-01 | Phase 8 | Planned |
| PLAN-02 | Phase 8 | Planned |
| PLAN-03 | Phase 8 | Planned |
| PLAN-04 | Phase 8 | Planned |
| PLAN-05 | Phase 8 | Planned |
| PERM-01 | Phase 8 | Planned |
| PERM-02 | Phase 9 | Complete |
| PERM-03 | Phase 9 | Complete |
| PERM-04 | Phase 8 | Planned |
| PERM-05 | Phase 9 | Complete |
| PERM-06 | Phase 8 | Planned |
| SEC-01 | Phase 10 | Planned |
| SEC-02 | Phase 9 | Complete |
| SEC-03 | - | Deferred |
| SEC-04 | Phase 10 | Planned |
| AI-01 | - | Deferred |
| AI-02 | - | Deferred |
| AI-03 | - | Deferred |
| AI-04 | - | Deferred |
