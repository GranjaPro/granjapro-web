---
phase: 4
slug: charts-crud-revenue-sync
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-13
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | TypeScript compiler (no test framework installed) |
| **Config file** | `tsconfig.json` |
| **Quick run command** | `npx tsc --noEmit` |
| **Full suite command** | `npx next build --no-lint` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit`
- **After every plan wave:** Run `npx next build --no-lint`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | CHART-01 | type-check | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 04-01-02 | 01 | 1 | CHART-02 | type-check | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 04-01-03 | 01 | 1 | CHART-03 | type-check | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 04-02-01 | 02 | 1 | CRUD-01 | type-check | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 04-02-02 | 02 | 1 | CRUD-02 | type-check | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 04-02-03 | 02 | 1 | CRUD-03 | type-check | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 04-02-04 | 02 | 1 | CRUD-04 | type-check | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 04-03-01 | 03 | 2 | SYNC-01 | type-check | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 04-03-02 | 03 | 2 | SYNC-02 | type-check | `npx tsc --noEmit` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing TypeScript infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Revenue vs expenses chart renders with real data | CHART-01 | Visual rendering verification | 1. Open finances page 2. Add transactions via CRUD 3. Verify chart shows correct data points |
| Transaction CRUD modal works end-to-end | CRUD-01..04 | Interactive UI flow | 1. Add transaction 2. Verify it appears in list 3. Edit it 4. Delete it 5. Verify KPIs update |
| Sale auto-creates revenue entry | SYNC-01 | Cross-page data flow | 1. Record sale in sales module 2. Navigate to finances 3. Verify revenue entry exists with correct amount |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
