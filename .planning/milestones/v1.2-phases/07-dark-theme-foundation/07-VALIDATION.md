---
phase: 07
slug: dark-theme-foundation
status: draft
nyquist_compliant: false
wave_0_complete: true
created: 2026-05-07
---

# Phase 07 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Next.js build / TypeScript |
| **Config file** | `package.json`, `tsconfig.json`, `next.config.*` if present |
| **Quick run command** | `npm run build` |
| **Full suite command** | `npm run build` |
| **Estimated runtime** | ~60-180 seconds |

---

## Sampling Rate

- **After every task commit:** Run targeted source checks when practical.
- **After every plan wave:** Run `npm run build`.
- **Before `$gsd-verify-work`:** Full build and manual viewport checks must be complete.
- **Max feedback latency:** One plan wave.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | THEME-01 | T-07-01 | Dashboard theme is app-controlled | source/build | `npm run build` | yes | pending |
| 07-01-02 | 01 | 1 | THEME-03 | T-07-02 | Shared primitives render dark-safe | build/manual | `npm run build` | yes | pending |
| 07-02-01 | 02 | 2 | THEME-02 | T-07-03 | No visible system theme option | source/build | `rg -n "Sistema|system|Monitor" components/dashboard/profile-settings.tsx app/dashboard components` | yes | pending |
| 07-02-02 | 02 | 2 | THEME-03 | T-07-02 | Modals/popovers/locked overlays are readable | build/manual | `npm run build` | yes | pending |
| 07-03-01 | 03 | 3 | THEME-03 | T-07-02 | Dashboard pages keep contrast and focus states | build/manual | `npm run build` | yes | pending |
| 07-03-02 | 03 | 3 | THEME-04 | T-07-04 | Public/auth pages are not unintentionally restyled | manual | `npm run build` | yes | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test framework is needed for this visual foundation phase.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dashboard dark visual quality | THEME-01, THEME-03 | Contrast and layout stability need viewport inspection | Inspect dashboard shell, sidebar, top bar, dashboard home, production, finances, AI, profile settings, date filter, locked overlay, and upgrade popup on mobile and desktop. |
| Public/auth page non-regression | THEME-04 | Requires visual comparison of pages outside dashboard scope | Inspect `/`, `/login`, `/signup`, `/termos-de-uso`, and `/politica-de-privacidade` after global CSS changes. |

---

## Validation Sign-Off

- [ ] All plan tasks have source/build/manual verification.
- [ ] No visible `Sistema` theme option remains.
- [ ] No dashboard theme behavior depends on `prefers-color-scheme`.
- [ ] Dashboard shell and common primitives are dark-safe.
- [ ] Public/auth pages are checked for unintended restyling.
- [ ] `nyquist_compliant: true` set in frontmatter after verification.

**Approval:** pending
