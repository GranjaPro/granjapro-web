---
phase: 09
slug: ui-permission-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-21
---

# Phase 09 - Validation Strategy

> Per-phase validation contract for UI permission integration and locked-content consistency.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Next.js build + source-level verification + manual UI verification |
| **Config file** | `package.json`, `tsconfig.json` |
| **Quick run command** | `npm run build` |
| **Full suite command** | `npm run build` + targeted `rg` scans below |
| **Estimated runtime** | ~60-180 seconds |

---

## Sampling Rate

- **After every task commit:** Run targeted `rg` checks for touched files.
- **After each plan wave:** Run `npm run build`.
- **Before `$gsd-verify-work`:** Full suite green and manual toggle checks validated.
- **Max feedback latency:** 180 seconds.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | PERM-02 | T-09-01 | Shared helpers replace local scattered checks in touched shell/primitives | source scan | `rg -n "hasMinimumPlan|canAccessCapability|getRequiredPlan" app/dashboard components/plan` | yes | pending |
| 09-01-02 | 01 | 1 | PERM-03 | T-09-01 | Menu, badges, and lock behavior read same plan definitions | source scan | `rg -n "RequiredPlanBadge|PlanBadge|LockedOverlay|usePlan|lib/plans" app/dashboard components` | yes | pending |
| 09-01-03 | 01 | 1 | PERM-05 | T-09-02 | Upgrade naming/pricing aligned to landing source | source scan | `rg -n "R\\$ 44,90|R\\$ 66,90|R\\$ 99,90|PLAN_MATRIX" components/plan app` | yes | pending |
| 09-02-01 | 02 | 2 | SEC-02 | T-09-03 | Locked cards do not expose protected data before gating | build/source scan | `rg -n "LockedOverlay|requiredPlan|minimumPlan|showAdvancedFeatures" app/dashboard` | yes | pending |
| 09-02-02 | 02 | 2 | PERM-03 | T-09-03 | Hidden advanced components collapse cleanly (no empty wrappers) | build/manual | `npm run build` | yes | pending |
| 09-02-03 | 02 | 2 | PERM-02 | T-09-04 | Dashboard/production/health/mortality/finances/clients/sales align lock pattern | source scan | `rg -n "locked-overlay|LockedOverlay|RequiredPlanBadge" app/dashboard` | yes | pending |
| 09-03-01 | 03 | 3 | PERM-03 | T-09-05 | AI usage meters consume centralized credit model | source scan | `rg -n "AI_MODE_META|getAICreditCost|aiCreditsMonthly|PLAN_MATRIX" app/dashboard lib` | yes | pending |
| 09-03-02 | 03 | 3 | PERM-05 | T-09-02 | Final plan-tag and upgrade-copy consistency across touched pages | build/source scan | `npm run build` | yes | pending |
| 09-03-03 | 03 | 3 | SEC-02 | T-09-03 | Locked assistant cards preserve visible header and block protected body | manual/source scan | `rg -n "Assistant|LockedOverlay|requiredPlan" app/dashboard` | yes | pending |

---

## Wave 0 Requirements

Current infrastructure is sufficient. No new test framework setup is required for this planning phase.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Toggle-driven hiding realigns layout | PERM-02, PERM-03 | Visual grid behavior depends on responsive rendering | As Essencial and Pro users, toggle advanced features and verify no orphan spacing or empty card shells on dashboard, production, health, mortality, finances, clients, and sales pages. |
| Locked content does not reveal protected details | SEC-02 | Requires visual inspection of overlays and card bodies | Validate title/subtitle/tag remain visible while protected body remains blocked/blurred and does not leak data text. |
| Upgrade copy consistency | PERM-05 | UX copy/price consistency is visual + content based | Compare locked prompts and upgrade popups against landing prices and plan names. |
| AI usage meter coherence | PERM-03 | Requires profile-level behavior validation | Validate mode costs and monthly allowance display matches plan matrix for Essencial/Pro/Premium profiles. |

---

## Validation Sign-Off

- [ ] All tasks include automated or manual verification.
- [ ] Sampling continuity maintained.
- [ ] No watch-mode commands.
- [ ] Feedback latency < 180s.
- [ ] `nyquist_compliant: true` set after execution evidence.

**Approval:** pending

