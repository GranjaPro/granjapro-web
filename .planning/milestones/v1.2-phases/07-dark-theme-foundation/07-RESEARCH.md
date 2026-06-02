---
phase: 07
slug: dark-theme-foundation
status: complete
created: 2026-05-07
requirements:
  - THEME-01
  - THEME-02
  - THEME-03
  - THEME-04
---

# Phase 7 Research: Dark Theme Foundation

## Research Complete

Phase 7 should be implemented as a bounded visual foundation, not a broad redesign. The app already uses Tailwind utility classes, `cn()`, and a small primitive layer in `components/ui/*`. Tailwind is configured for class-based dark mode, but no theme provider or `next-themes` dependency is present. The dashboard can therefore become deterministic by applying a dashboard-owned `dark` class and dark surface classes in the authenticated shell instead of introducing system preference behavior.

## Current Implementation Findings

- `tailwind.config.ts` already has `darkMode: ["class"]`.
- `app/layout.tsx` sets the global body and auth provider boundary but does not apply a theme class.
- `app/globals.css` makes the global body white, and several utility scrollbar classes are tuned for light backgrounds.
- `app/dashboard/layout.tsx` owns the dashboard shell, sidebar, top bar, loading state, onboarding blur layer, profile modal, and upgrade popup.
- `components/dashboard/profile-settings.tsx` has the visible `Sistema` option and stores `theme` as `"light" | "dark" | "system"`, but it appears local-only.
- `components/ui/button.tsx`, `components/ui/card.tsx`, `components/ui/badge.tsx`, and `components/ui/progress.tsx` are good leverage points for common dark-safe defaults.
- `components/date-filter/calendar-filter.tsx`, `components/plan/locked-overlay.tsx`, and `components/plan/upgrade-popup.tsx` contain high-impact hardcoded light surfaces.
- A targeted scan found many `bg-white`, `text-gray-*`, `border-gray-*`, and `bg-gray-50` usages across dashboard pages. Broad blind replacement would be risky.

## Recommended Approach

1. Establish deterministic dashboard dark mode at the shell boundary.
2. Add reusable dashboard color conventions through global utilities and shared primitives.
3. Remove the visible system theme option from profile preferences and default preferences to dark.
4. Convert shared overlays, modals, popovers, and primitives before editing individual pages.
5. Perform a selective dashboard-page pass on high-traffic pages and common repeated surfaces, keeping layout and data behavior unchanged.
6. Verify mobile and desktop visually, including public/auth pages to catch accidental global restyling.

## Constraints

- Do not add `next-themes` or new theme infrastructure unless implementation proves it is already partially present.
- Do not introduce a user-facing theme switch beyond removing `Sistema`; dark can be the only active dashboard experience in this phase.
- Do not refactor permissions, plan persistence, or API guards.
- Do not redesign layouts, page density, navigation IA, or data fetching.
- Avoid one-hue dark styling; retain agritech green accents plus clear amber/red/green status colors.

## Validation Architecture

The phase is visual and integration-heavy, so validation should combine build/type checks with deterministic source scans and manual viewport checks.

- Automated: `npm run build`.
- Automated/source scan: verify no visible `Sistema` theme option remains in dashboard/profile preferences.
- Automated/source scan: verify dashboard shell applies deterministic dark mode without `prefers-color-scheme`.
- Manual: inspect `/dashboard`, `/dashboard/production`, `/dashboard/finances`, `/dashboard/ai`, profile settings, upgrade popup, locked overlay, and date filter on mobile and desktop.
- Manual: inspect `/`, `/login`, `/signup`, `/termos-de-uso`, and `/politica-de-privacidade` for unintended global restyling.

## Planning Implications

The safest plan split is:

1. Foundation and shared primitives: dashboard shell, global utilities, button/card/badge/progress.
2. Settings and shared overlays: remove `Sistema`, darken profile settings, date filter, locked overlay, upgrade popup.
3. Dashboard page cleanup and verification: selective conversion of page-level light surfaces and chart tooltip colors, then visual verification.
