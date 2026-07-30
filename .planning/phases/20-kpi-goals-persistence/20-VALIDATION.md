---
phase: 20
slug: kpi-goals-persistence
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-30
---

# Phase 20 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | TypeScript compiler + Next.js production build + focused source assertions |
| **Config file** | `tsconfig.json`, `next.config.ts` |
| **Quick run command** | `npx tsc --noEmit` |
| **Full suite command** | `npm run build` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit` plus task-specific `rg` assertions.
- **After every plan wave:** Run `npm run build`.
- **Before `$gsd-verify-work`:** Build, source assertions, browser checks, and linked-schema checks must pass.
- **Max feedback latency:** 60 seconds.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 20-01-01 | 01 | 1 | D-06, D-09 | T-20-04 | Fixed KPI defaults and calculations remain while editing-only state is removed | source + type | `rg -n "editingGoalKey|editingGoalValue|setKpiGoals|Goal Editor Modal" app/dashboard/page.tsx` returns no matches; `npx tsc --noEmit` exits 0 | Yes | pending |
| 20-01-02 | 01 | 1 | D-07, D-10 | T-20-03 | Main dashboard KPI container has no click handler or false affordance | source + build | focused `rg` review; `npm run build` exits 0 | Yes | pending |
| 20-02-01 | 02 | 1 | D-07, D-08 | T-20-03 | Static KPI containers lose pointer and hover cues without global replacement | source + type | focused `rg` review across listed KPI sections; `npx tsc --noEmit` exits 0 | Yes | pending |
| 20-02-02 | 02 | 1 | D-09, D-10 | T-20-03, T-20-04 | KPI content remains and real controls retain interactions | build + manual | `npm run build` exits 0 | Yes | pending |
| 20-03-01 | 03 | 1 | D-01 through D-05 | T-20-01, T-20-02 | Only named KPI schema objects are removed from the confirmed linked project | CLI + SQL | dry run reviewed; table/column absence queries pass | Yes | pending |
| 20-03-02 | 03 | 1 | D-04 | T-20-02 | Local and remote migration histories align through `00029` after schema verification | CLI | `npx supabase migration list --linked` shows no `00030` or temporary teardown version | Yes | pending |

*Status: pending - green - red - flaky*

---

## Wave 0 Requirements

Existing TypeScript/build infrastructure covers automated validation. No test framework installation is justified for a deletion and styling-cleanup phase.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Static KPI visual behavior | D-07, D-09 | Cursor and hover animation require rendered interaction | Check dashboard, production, finances, customers, sales, and mobile widths; compare content/layout and hover behavior |
| Legitimate action affordances | D-10 | Requires distinguishing real controls from static cards | Exercise flock links, customer collection buttons, filters, sliders, CRUD buttons, and water info tooltip |
| Linked schema absence | D-01 through D-05 | Requires authenticated remote database access | Query `to_regclass`, `information_schema.columns`, and migration history after teardown |

---

## Validation Sign-Off

- [x] All planned tasks have automated verification or explicit manual checks.
- [x] Sampling continuity has no three consecutive tasks without automated verification.
- [x] No Wave 0 test files are required.
- [x] No watch-mode flags are used.
- [x] Expected feedback latency is under 60 seconds.
- [x] `nyquist_compliant: true` is set in frontmatter.

**Approval:** pending
