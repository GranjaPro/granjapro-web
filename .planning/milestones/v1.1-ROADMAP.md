# Roadmap: Granja Pro

## Milestones

- Completed **v1.0 Finances Module + Calendar Sync** - Phases 1-4 (shipped 2026-05-01). Archive: `.planning/milestones/v1.0-ROADMAP.md`
- Active **v1.1 Google Sign-In** - Phases 5-6 (started 2026-05-01)

## Phases

<details>
<summary>Completed v1.0 Finances Module + Calendar Sync (Phases 1-4) - SHIPPED 2026-05-01</summary>

- [x] **Phase 1: Foundation** - 3/3 plans complete
- [x] **Phase 2: Calendar Sync** - 1/1 plans complete
- [x] **Phase 3: Financial KPIs** - 4/4 plans complete
- [x] **Phase 4: Charts, CRUD & Revenue Sync** - 3/3 plans complete

</details>

### v1.1 Google Sign-In (Phases 5-6) - IN PROGRESS

- [x] **Phase 5: Google Entry Points & Signup Terms Gate** - Requirements: AUTH-01, AUTH-02, SIGN-01
  - Success criteria:
    - From the login page, a user can start Google sign-in in one action.
    - From the signup page, a user can start Google sign-up in one action after accepting the required terms checkbox.
    - From the signup page, a user who has not accepted the required terms checkbox is prevented from starting Google sign-up.

- [x] **Phase 6: Existing Account Matching & Post-Login Continuity** - Requirements: AUTH-03, AUTH-04
  - Success criteria:
    - A user whose Google account email matches an existing account is signed into that existing account instead of seeing a duplicate account created.
    - After Google sign-in succeeds, a fully set-up user reaches the same post-login destination already used by the app.
    - After Google sign-in succeeds, a user who still needs setup is sent through the same onboarding or gating flow already used by the app.

### Phase 5: Google Entry Points & Signup Terms Gate
**Goal:** Add Google sign-in entry points on login and signup, while enforcing the existing required terms acceptance before Google signup starts.
**Depends on:** Nothing (first phase of v1.1)
**Plans:** 1 plan

Plans:
- [x] `05-01-PLAN.md` - Google auth CTAs, terms gate, and inline OAuth feedback

Verification:
- [x] `05-VERIFICATION.md` - Phase passed
- [x] `05-HUMAN-UAT.md` - Approved to continue without blocking closure

### Phase 6: Existing Account Matching & Post-Login Continuity
**Goal:** Reuse same-email accounts during Google auth and preserve the app's existing post-login routing and onboarding behavior.
**Depends on:** Phase 5
**Plans:** 1 plan

Plans:
- [x] `06-01-PLAN.md` - OAuth account reuse and login continuity

Verification:
- [x] `06-VERIFICATION.md` - Phase passed
- [x] `06-UAT.md` - UAT complete

**Coverage check:** 5/5 milestone requirements mapped to phases, 0 unmapped.

## Backlog

- [ ] Decide whether to promote the accepted v1.0 closeout gaps into a later follow-up milestone.

## Progress

| Milestone | Phase Range | Plans Complete | Status | Shipped |
|-----------|-------------|----------------|--------|---------|
| v1.0 Finances Module + Calendar Sync | 1-4 | 11/11 | Shipped | 2026-05-01 |
| v1.1 Google Sign-In | 5-6 | 2/2 | Complete, ready for milestone closeout | -- |

---
*Roadmap updated: 2026-05-06 after verifying Phase 6*
