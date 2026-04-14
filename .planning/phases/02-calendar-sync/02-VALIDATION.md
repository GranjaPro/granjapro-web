---
phase: 2
slug: calendar-sync
status: verified
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-12
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

## Verification Checklist

- [ ] `useDateFilter()` is called in `app/dashboard/finances/page.tsx`
- [ ] `CalendarFilter` is rendered in `app/dashboard/finances/page.tsx`
- [ ] No local `periodo` state in `app/dashboard/finances/page.tsx`
- [ ] `npx tsc --noEmit` passes

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | CAL-01, CAL-02 | manual | Browser test date sync | ✅ | ✅ green |
| 02-01-02 | 01 | 1 | CAL-04 | type-check | `npx tsc --noEmit` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Date range syncs between dashboard and finances page | CAL-01 | Requires navigation between pages | 1. Open dashboard and change date to "Ontem" 2. Navigate to Finances page 3. Verify date is still "Ontem" |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** verified
