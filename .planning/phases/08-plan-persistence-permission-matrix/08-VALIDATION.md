---
phase: 08
slug: plan-persistence-permission-matrix
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-13
---

# Phase 08 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Next.js build and source-level verification; no dedicated test framework configured |
| **Config file** | `package.json`, `tsconfig.json`, `supabase/config.toml` if Supabase CLI is used |
| **Quick run command** | `npm run build` |
| **Full suite command** | `npm run build` plus schema/source scans listed below |
| **Estimated runtime** | ~60-180 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build` when TypeScript or route files changed; run targeted `rg` scans for schema/matrix-only edits.
- **After every plan wave:** Run `npm run build`.
- **Before `$gsd-verify-work`:** Full suite must be green.
- **Max feedback latency:** 180 seconds.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | PLAN-01 | T-08-01 | Invalid plan values rejected by schema | source scan | `rg -n "plan.*essencial.*pro.*premium|trial_started_at|trial_ends_at|trial_used_at" supabase` | yes | pending |
| 08-01-02 | 01 | 1 | PLAN-02 | T-08-02 | New profiles have valid plan defaults | source scan | `rg -n "insert into public.profiles.*plan|trial_" supabase/migrations supabase/schema.sql` | yes | pending |
| 08-01-03 | 01 | 1 | PLAN-03 | - | Types reflect plan and trial fields | build | `npm run build` | yes | pending |
| 08-01-04 | 01 | 1 | PLAN-01 | T-08-01 | Live schema receives migration | manual/cli | `npx supabase db push` | yes | pending |
| 08-02-01 | 02 | 2 | PERM-01 | - | Capabilities centralized | source scan | `rg -n "PLAN_MATRIX|CAPABILITIES|minimumPlan|canAccessCapability" lib components` | yes | pending |
| 08-02-02 | 02 | 2 | PERM-04 | - | Limits centralized | source scan | `rg -n "birds|users|farms|tasks|insights|aiCreditsMonthly" lib` | yes | pending |
| 08-02-03 | 02 | 2 | AI-03 | - | AI weights centralized | source scan | `rg -n "simple.*1|detailed.*3|diagnostic.*5|aiCreditsMonthly" lib app components` | yes | pending |
| 08-02-04 | 02 | 2 | PLAN-04 | T-08-03 | Runtime parser rejects invalid plan values | build/source scan | `rg -n "parsePlan|isValidPlan|requiresPlanSelection" lib components` | yes | pending |
| 08-03-01 | 03 | 3 | PLAN-04 | T-08-03 | Invalid plan users redirected away from dashboard | build/source scan | `rg -n "plan-selection|requiresPlanSelection|trial_ends_at" app components lib` | yes | pending |
| 08-03-02 | 03 | 3 | PLAN-04 | T-08-04 | Plan/trial choice persists profile update | build/source scan | `rg -n "update\\(\\{ plan|trial_started_at|trial_ends_at|trial_used_at" app components lib` | yes | pending |

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No test framework installation is required for this planning pass.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Supabase schema push | PLAN-01 | Requires local/linked Supabase environment | Run `npx supabase db push` after schema edits; if Supabase is not running/linked, record blocker and exact error. |
| Redirect for invalid/null profile plan | PLAN-04 | Requires authenticated profile state | Seed or edit a test profile to invalid/null plan, log in, and verify dashboard sends user to plan selection. |
| Expired trial cannot be reused | PLAN-04 | Requires time-based profile fields | Set `trial_ends_at` in the past and `trial_used_at` non-null, log in, and verify free trial option is unavailable. |

---

## Validation Sign-Off

- [ ] All tasks have automated or manual verify steps.
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify.
- [ ] Schema push is explicitly represented as blocking when possible.
- [ ] No watch-mode flags.
- [ ] Feedback latency < 180s.
- [ ] `nyquist_compliant: true` set in frontmatter after execution proves coverage.

**Approval:** pending
