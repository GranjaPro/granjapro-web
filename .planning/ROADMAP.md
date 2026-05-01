# Roadmap: Granja Pro

## Milestones

- ✅ **v1.0 Finances Module + Calendar Sync** — Phases 1-4 (shipped 2026-05-01). Archive: `.planning/milestones/v1.0-ROADMAP.md`
- 🟡 **v1.1 Google Sign-In** — Phases 5-6 (planned 2026-05-01)

## Phases

<details>
<summary>✅ v1.0 Finances Module + Calendar Sync (Phases 1-4) — SHIPPED 2026-05-01</summary>

- [x] **Phase 1: Foundation** — 3/3 plans complete
- [x] **Phase 2: Calendar Sync** — 1/1 plans complete
- [x] **Phase 3: Financial KPIs** — 4/4 plans complete
- [x] **Phase 4: Charts, CRUD & Revenue Sync** — 3/3 plans complete

</details>

### v1.1 Google Sign-In (Phases 5-6) — PLANNED

- [ ] **Phase 5: Google Entry Points & Signup Terms Gate** — Requirements: AUTH-01, AUTH-02, SIGN-01
  - Success criteria:
    - From the login page, a user can start Google sign-in in one action.
    - From the signup page, a user can start Google sign-up in one action after accepting the required terms checkbox.
    - From the signup page, a user who has not accepted the required terms checkbox is prevented from starting Google sign-up.

- [ ] **Phase 6: Existing Account Matching & Post-Login Continuity** — Requirements: AUTH-03, AUTH-04
  - Success criteria:
    - A user whose Google account email matches an existing account is signed into that existing account instead of seeing a duplicate account created.
    - After Google sign-in succeeds, a fully set-up user reaches the same post-login destination already used by the app.
    - After Google sign-in succeeds, a user who still needs setup is sent through the same onboarding or gating flow already used by the app.

**Coverage check:** 5/5 milestone requirements mapped to phases, 0 unmapped.

## Backlog

- [ ] Create detailed implementation plans for Phase 5 and Phase 6.
- [ ] Decide whether to promote the accepted v1.0 closeout gaps into a later follow-up milestone.

## Progress

| Milestone | Phase Range | Plans Complete | Status | Shipped |
|-----------|-------------|----------------|--------|---------|
| v1.0 Finances Module + Calendar Sync | 1-4 | 11/11 | Shipped | 2026-05-01 |
| v1.1 Google Sign-In | 5-6 | 0/0 | Planned | — |

---
*Roadmap updated: 2026-05-01 for v1.1 Google Sign-In planning*
