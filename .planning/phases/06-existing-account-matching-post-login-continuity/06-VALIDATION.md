---
phase: 06
slug: existing-account-matching-post-login-continuity
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-03
---

# Phase 06 - Validation Strategy

Per-phase validation contract for feedback sampling during execution.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Next.js build/type validation; optional route-helper tests if introduced during execution |
| **Config file** | `package.json`, `tsconfig.json` |
| **Quick run command** | `npm run build` |
| **Full suite command** | `npm run build` |
| **Estimated runtime** | ~60-120 seconds |

## Sampling Rate

- **After every task commit:** Run `npm run build` when code changed.
- **After every plan wave:** Run `npm run build`.
- **Before `$gsd-verify-work`:** Full build must be green or any failure must be explicitly scoped and documented.
- **Max feedback latency:** 120 seconds for local build feedback.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 06-01 | 1 | AUTH-03 | T-06-02 | OAuth entry points do not create app profiles before Supabase resolves identity | code review | `npm run build` | yes | pending |
| 06-01-02 | 06-01 | 1 | AUTH-04 | T-06-01 | Callback accepts only safe internal destinations | route/helper test or code review | `npm run build` | yes | pending |
| 06-01-03 | 06-01 | 1 | AUTH-03, AUTH-04 | T-06-02 / T-06-04 | Existing profile/farm context remains tied to authenticated `user.id` | route/helper test or code review | `npm run build` | yes | pending |
| 06-01-04 | 06-01 | 1 | AUTH-04 | T-06-03 | Users without a farm continue through existing onboarding | route/helper test or code review | `npm run build` | yes | pending |
| 06-01-05 | 06-01 | 1 | AUTH-03, AUTH-04 | T-06-02 | Provider-level same-email linking receives live verification instructions | manual | manual Supabase/Google check | yes | pending |

## Wave 0 Requirements

Existing infrastructure covers this phase. If execution adds a route-helper test harness, keep it narrow and local to callback routing decisions.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Same-email Google account signs into existing account | AUTH-03 | Supabase/Google provider-level linking requires a live configured project and verified Google email | Create or identify an existing email/password user with a farm, sign in with a Google account using the same verified email, and confirm the app session uses the existing profile/farm context |
| First-time Google user reaches onboarding | AUTH-04 | Requires live OAuth callback and auth trigger behavior | Sign in with a Google account that has no existing farm context and confirm the app reaches the existing onboarding flow |
| Fully set-up Google user reaches dashboard | AUTH-04 | Requires live OAuth callback and persisted farm/profile state | Sign in with a Google-linked user that has a farm and confirm the app reaches `/dashboard` |

## Validation Sign-Off

- [x] All tasks have automated verification or explicit manual-only rationale.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 covers all missing references.
- [x] No watch-mode flags.
- [x] Feedback latency target documented.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** pending execution
