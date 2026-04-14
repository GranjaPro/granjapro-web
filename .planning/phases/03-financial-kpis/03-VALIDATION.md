---
phase: 3
slug: financial-kpis
status: verified
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-12
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

## Verification Checklist

- [ ] `lib/services/finances.ts` has `getFinancialSummaryInRange`
- [ ] `lib/services/farms.ts` has `getFarmBirdCount`
- [ ] `FinancialSummary` component displays real data
- [ ] Finances page displays real database transactions
- [ ] `npx tsc --noEmit` passes

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | FIN-01, FIN-02 | type-check | `npx tsc --noEmit` | ✅ | ✅ green |
| 03-02-01 | 02 | 1 | FIN-05, DASH-01 | manual | Browser test dashboard widget | ✅ | ✅ green |
| 03-03-01 | 03 | 1 | FIN-01..04 | manual | Browser test finances page | ✅ | ✅ green |
| 03-04-01 | 04 | 1 | FIN-06 | manual | Browser test main dashboard | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real data appears in Finances page | FIN-01 | Requires data in DB | 1. Add a transaction in Supabase 2. Open Finances page 3. Verify it appears |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** verified
