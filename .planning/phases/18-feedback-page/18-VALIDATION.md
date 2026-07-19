---
phase: 18
slug: feedback-page
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-19
---

# Phase 18 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None detected in project source |
| **Config file** | none |
| **Quick run command** | `npm run build` |
| **Full suite command** | `npm run build` plus manual Supabase/UI validation |
| **Estimated runtime** | ~60-180 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build` when TypeScript, route, service, or database type files change.
- **After every plan wave:** Run `npm run build` plus focused manual checks for the wave.
- **Before `$gsd-verify-work`:** Build must pass and manual feedback submission checks must be recorded.
- **Max feedback latency:** Manual validation should happen in the same execution wave as the UI or database change it validates.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 18-01-01 | 01 | 1 | FB-05 | T-18-01 | `feedbacks` RLS rejects forged `user_id`/`farm_id` | source/manual DB | `npm run build` | missing until plan execution | pending |
| 18-01-02 | 01 | 1 | FB-03 | T-18-02 | Rating/category constraints reject invalid values | source/manual DB | `npm run build` | missing until plan execution | pending |
| 18-02-01 | 02 | 2 | FB-01 to FB-07 | T-18-03 | Client validates required fields and exposes generic inline errors | build/manual UI | `npm run build` | missing until plan execution | pending |
| 18-03-01 | 03 | 3 | FB-08 to FB-10 | - | Desktop/sidebar and profile access work; mobile nav remains unchanged | build/code review/manual UI | `npm run build` | missing until plan execution | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] Confirm whether the executor will use manual validation only or add minimal automated test infrastructure before implementation.
- [ ] Record that no component/unit test framework exists in `package.json`.
- [ ] Confirm `npm run build` is the required automated validation command for this phase.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Authenticated user can submit feedback with rating/category and blank description | FB-01 to FB-06 | No test framework exists and Supabase auth/RLS needs a real session | Open `/dashboard/feedback`, select a rating and category, submit with empty description, confirm the page stays on the route, success appears, and the form clears. |
| Missing rating/category blocks submission with inline message | FB-02, FB-03, FB-07 | Form behavior is interactive client state | Attempt submit without rating and without category; confirm inline error and no navigation. |
| Forged row context is blocked by RLS | FB-05 | Requires Supabase policy verification | Attempt insert for a farm/user outside the current context or review policy SQL to confirm `user_id = auth.uid()` and allowed `farm_id` checks. |
| Desktop access points exist and mobile nav is unchanged | FB-08 to FB-10 | Navigation layout is visual/client behavior | Confirm sidebar feedback link is at the end, Profile Settings has a feedback button, and `git diff -- components/layout/mobile-nav.tsx` is empty. |

---

## Validation Sign-Off

- [ ] All tasks have automated build verification or documented manual verification.
- [ ] Sampling continuity: no implementation wave completes without `npm run build`.
- [ ] Wave 0 explicitly records the no-test-framework constraint.
- [ ] No watch-mode flags are used for verification.
- [ ] Manual feedback submission and navigation checks are recorded before phase close.
- [ ] `nyquist_compliant: true` set in frontmatter only if Wave 0/manual verification coverage is accepted during validation.

**Approval:** pending
