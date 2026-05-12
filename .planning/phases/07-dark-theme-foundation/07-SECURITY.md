---
phase: 07
slug: dark-theme-foundation
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-12
updated: 2026-05-12
---

# Phase 07 - Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Public/auth routes vs. authenticated dashboard shell | Dashboard theme classes are applied at the authenticated dashboard boundary and cleaned up on unmount. | Theme classes, color scheme, and dashboard-only global CSS selectors. |
| User profile theme preference vs. rendered dashboard | Dashboard theme can be explicitly set to light/dark through app state and local storage, without OS/system detection. | Non-sensitive UI preference in `localStorage`. |
| Shared UI primitives vs. page-specific dashboard surfaces | Shared Button/Card/Badge/Progress defaults influence many authenticated dashboard pages. | Presentation classes, focus rings, status colors. |
| Locked/upgrade/date overlays vs. underlying dashboard content | Modals and overlays must remain readable and not obscure controls unpredictably. | Presentation state and plan CTA content. |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-07-01 | Information Disclosure / UX Boundary | Root layout and dashboard shell | mitigate | `app/dashboard/layout.tsx` toggles `dark` and `dashboard-dark` only inside the dashboard shell and removes them during cleanup; `app/layout.tsx` remains neutral. | closed |
| T-07-02 | Tampering / Misconfiguration | Theme source of truth | mitigate | Source search found no `prefers-color-scheme`, `matchMedia`, or `next-themes`; dashboard theme is explicit app state backed by `DASHBOARD_THEME_KEY`. | closed |
| T-07-03 | Spoofing / UX Integrity | Profile settings theme selector | mitigate | `components/dashboard/profile-settings.tsx` exposes only `Claro` and `Escuro`; no visible system-theme option remains. | closed |
| T-07-04 | Denial of Service / Usability | Shared UI primitives | mitigate | Button, Card, Badge, and Progress components include dark-safe surfaces, readable text, and visible focus states without changing public APIs. | closed |
| T-07-05 | Denial of Service / Usability | Dashboard global CSS and scroll areas | mitigate | `app/globals.css` scopes dashboard dark overrides under `html.dashboard-dark`, including dark surfaces, text remapping, inputs, borders, scrollbars, and chart grid lines. | closed |
| T-07-06 | Denial of Service / Usability | Profile modal, calendar, locked overlay, upgrade popup | mitigate | Shared overlays use `dark:bg-*`, `dark:text-*`, `dark:border-*`, dark scrims, and hover/focus variants; UAT confirmed readability. | closed |
| T-07-07 | Information Disclosure / Visual Regression | Public/auth/legal pages | mitigate | Dashboard dark CSS is scoped to `html.dashboard-dark`; Phase 07 UAT confirmed `/`, `/login`, `/signup`, `/termos-de-uso`, and `/politica-de-privacidade` did not regress. | closed |
| T-07-08 | Denial of Service / Usability | High-traffic dashboard pages and charts | mitigate | UAT confirmed dashboard home, production, finances, AI, barns, flocks, and sales routes retain readable dark surfaces, charts, filters, tables, buttons, and empty states. | closed |
| T-07-09 | Tampering / Scope Creep | Broad page cleanup | mitigate | Changes preserve existing workflows/data behavior per UAT; no route/API/permission behavior was introduced in this visual foundation phase. | closed |

*Status: open / closed*
*Disposition: mitigate (implementation required) / accept (documented risk) / transfer (third-party)*

---

## Accepted Risks Log

No accepted risks.

---

## Evidence

- `app/dashboard/layout.tsx` applies and cleans up the dashboard-owned `dark` and `dashboard-dark` classes at the dashboard shell boundary.
- `components/dashboard/profile-settings.tsx` limits visible theme controls to explicit `Claro` and `Escuro` options.
- `app/globals.css` scopes dashboard dark remapping to `html.dashboard-dark`, reducing public/auth leakage risk.
- `components/ui/button.tsx`, `components/ui/card.tsx`, `components/ui/badge.tsx`, and `components/ui/progress.tsx` retain their APIs while adding dark-safe defaults.
- `components/date-filter/calendar-filter.tsx`, `components/plan/locked-overlay.tsx`, and `components/plan/upgrade-popup.tsx` include dark-safe surfaces and readable overlay states.
- `.planning/phases/07-dark-theme-foundation/07-UAT.md` records 7/7 user-facing checks passed with no issues.
- Source check: no `prefers-color-scheme`, `matchMedia`, or `next-themes` references in `app` or `components`.

---

## Artifact Notes

- No `07-SUMMARY.md` exists for this phase at audit time. This security review used the three phase plans, the completed UAT file, and direct source evidence.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-12 | 9 | 9 | 0 | Codex |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-12
