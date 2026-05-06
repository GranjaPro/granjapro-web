# Phase 7: Dark Theme Foundation - Context

**Gathered:** 2026-05-06
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers the dark-theme foundation for the authenticated dashboard experience. It makes the dashboard intentionally dark, removes any system-theme behavior from the product experience, and verifies that shell/navigation/modals/common primitives remain readable on mobile and desktop.

This phase does not implement the granular permissions system. It should only avoid visual regressions in the plan/locked UI that later permission phases will reuse.

</domain>

<decisions>
## Implementation Decisions

### Theme Behavior

- **D-01:** Dashboard theme should be app-controlled and deliberately dark, not tied to `prefers-color-scheme` or OS theme.
- **D-02:** Remove or disable any "system" theme mode if one exists. Users should not see or rely on a system-theme option.
- **D-03:** Treat dark theme as the default dashboard experience for this phase. A light-mode toggle is not required unless the existing code already has one that must be preserved without the system option.
- **D-04:** Public landing, auth, legal, and marketing pages should not be intentionally redesigned in this phase. Only touch them if global CSS changes would otherwise break them.

### Visual Scope

- **D-05:** Prioritize the dashboard shell first: `app/dashboard/layout.tsx`, sidebar, top bar, page background, scroll surfaces, onboarding overlay, profile modal, upgrade popup, and shared primitives.
- **D-06:** Use restrained operational dark styling: dark neutral surfaces, existing agritech green/brand accents, and clear amber/red/green status colors. Avoid a decorative one-color theme or marketing-style gradients.
- **D-07:** Keep density and layout structure stable. This is a theme foundation, not a dashboard redesign.
- **D-08:** Mobile and desktop should both be checked because the app is mobile-first but has a persistent desktop sidebar.

### Implementation Direction

- **D-09:** Prefer shared primitives, reusable class conventions, and global utility updates before editing every dashboard page manually.
- **D-10:** Existing pages contain many hardcoded `bg-white`, `text-gray-*`, and `border-gray-*` classes. Planning should identify a safe conversion strategy rather than broad blind replacement.
- **D-11:** Tailwind is already configured with `darkMode: ["class"]`. The planner may use class-based dark mode or direct dark dashboard classes, but must keep behavior deterministic and not system-driven.
- **D-12:** Keep `LockedOverlay` and `UpgradePopup` visually compatible with dark surfaces because they are part of the plan-gated experience.

### the agent's Discretion

The planner may choose the exact dark color tokens and implementation sequence as long as the result is readable, app-controlled, mobile-safe, and limited to the Phase 7 scope.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning

- `.planning/REQUIREMENTS.md` - v1.2 requirements, especially THEME-01 through THEME-04.
- `.planning/ROADMAP.md` - Phase 7 goal and success criteria.
- `.planning/PROJECT.md` - product constraints and active v1.2 direction.

### Existing Implementation

- `app/layout.tsx` - root layout and global body/auth provider boundary.
- `app/globals.css` - global Tailwind layers, body colors, shared utility classes, and scrollbar styling.
- `tailwind.config.ts` - Tailwind theme configuration and class-based dark mode setting.
- `app/dashboard/layout.tsx` - dashboard shell, sidebar, top bar, onboarding overlay, and upgrade popup integration.
- `components/ui/button.tsx` - shared button variants used across dashboard surfaces.
- `components/ui/card.tsx` - shared card primitive used by dashboard widgets.
- `components/ui/badge.tsx` - shared badge variants.
- `components/plan/locked-overlay.tsx` - locked content overlay that must remain usable on dark surfaces.
- `components/plan/upgrade-popup.tsx` - upgrade modal that must remain readable and match dark dashboard context.
- `components/date-filter/calendar-filter.tsx` - shared popover/control with many light-surface classes.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `cn()` from `lib/utils.ts`: established way to compose conditional Tailwind classes.
- `components/ui/*`: existing primitive layer for buttons, cards, badges, progress, and modal portal.
- `app/dashboard/layout.tsx`: central shell where page-level dark background, sidebar, top bar, and provider boundaries can be stabilized.

### Established Patterns

- Styling is Tailwind utility-first with direct `className` usage and `cn()` for variants.
- The codebase uses custom `brand-*` colors plus Tailwind gray/amber/red/green status colors.
- The dashboard currently relies heavily on hardcoded light classes like `bg-white`, `text-gray-900`, `text-gray-500`, `border-gray-100`, and `bg-[#f8faf9]`.
- Tailwind already uses class-based dark mode in `tailwind.config.ts`, but no current theme provider or `next-themes` dependency was found in the scanned files.

### Integration Points

- Root/global theme behavior connects through `app/layout.tsx` and `app/globals.css`.
- Authenticated dashboard theme connects through `app/dashboard/layout.tsx`.
- Shared dark-safe primitives connect through `components/ui/button.tsx`, `components/ui/card.tsx`, `components/ui/badge.tsx`, `components/plan/locked-overlay.tsx`, and `components/plan/upgrade-popup.tsx`.
- Date controls and popovers connect through `components/date-filter/calendar-filter.tsx`.

</code_context>

<specifics>
## Specific Ideas

- User explicitly wants the next milestone to include dark theme and to remove the "system" theme mode.
- User also wants granular permissions in this milestone, but Phase 7 should only prepare the dark UI foundation; permission architecture begins in Phase 8.

</specifics>

<deferred>
## Deferred Ideas

- Granular plan permissions, route/API guards, and AI usage enforcement are intentionally deferred to Phases 8-10.
- Full visual redesign, billing integration, and payment/subscription workflows remain outside Phase 7.

</deferred>

---

*Phase: 7-Dark Theme Foundation*
*Context gathered: 2026-05-06*
