---
phase: 15
slug: real-health-history-page
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-14
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Next.js Build and Lint Compiler + Supabase DB checks |
| **Config file** | none |
| **Quick run command** | `npm run lint` |
| **Full suite command** | `npm run build` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run lint`
- **After every plan wave:** Run `npm run build`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 15-01-01 | 01 | 1 | D-01, D-03, D-04 | — | N/A | static | `grep -q "Nenhum registro de saúde" app/dashboard/flocks/detalhes/[loteId]/saude/page.tsx` | ✅ | ⬜ pending |
| 15-01-02 | 01 | 1 | D-02 | — | N/A | static | `grep -q "register=true" app/dashboard/flocks/detalhes/[loteId]/saude/page.tsx` | ✅ | ⬜ pending |
| 15-01-03 | 01 | 1 | D-08, D-09 | — | N/A | static | `grep -q "healthScore" app/dashboard/flocks/detalhes/[loteId]/saude/page.tsx` | ✅ | ⬜ pending |
| 15-01-04 | 01 | 2 | D-16 | — | N/A | static | `grep -q "updateHealthRecord" app/dashboard/flocks/detalhes/[loteId]/saude/page.tsx` | ✅ | ⬜ pending |
| 15-01-05 | 01 | 2 | D-17 | — | N/A | static | `grep -q "status: \"completed\"" app/dashboard/flocks/detalhes/[loteId]/saude/page.tsx` | ✅ | ⬜ pending |
| 15-01-06 | 01 | 2 | D-02 (Specifics) | — | N/A | static | `grep -q "searchParams.get(\"flockId\")" app/dashboard/health/page.tsx` | ✅ | ⬜ pending |
| 15-01-07 | 01 | 3 | D-06, D-07 | — | N/A | static | `grep -q "mortality" app/dashboard/flocks/detalhes/[loteId]/historico-sanitario/page.tsx` | ✅ | ⬜ pending |
| 15-01-08 | 01 | 3 | D-10, D-11, D-12 | — | N/A | static | `grep -q "generateChecklistFromText" app/dashboard/flocks/detalhes/[loteId]/historico-sanitario/page.tsx` | ✅ | ⬜ pending |
| 15-01-09 | 01 | 3 | D-13, D-14, D-15 | — | N/A | static | `grep -q "duracao" app/dashboard/flocks/detalhes/[loteId]/historico-sanitario/page.tsx` | ✅ | ⬜ pending |
| 15-01-10 | 01 | 3 | D-01, D-04, D-05 | — | N/A | static | `grep -q "Padrões identificados" app/dashboard/flocks/detalhes/[loteId]/historico-sanitario/page.tsx` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Empty state redirection | D-02 | Requires interactive browser redirect check | Load flock page with empty health & mortality. Verify it displays empty state. Click redirect button and confirm it opens health registration modal with the correct flock preselected. |
| Resolving symptoms on click | D-17 | Requires interactive API trigger | Create a flock health record in_progress. On flock details page, click "X" to resolve. Confirm record updates to 'completed' in Supabase. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-06-14
