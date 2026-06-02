# Phase 7: Dark Theme Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-05-06
**Phase:** 7-Dark Theme Foundation
**Areas discussed:** Theme behavior, visual scope, implementation direction

---

## Theme Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| App-controlled dark dashboard | Dashboard uses an explicit dark theme controlled by the app. | Yes |
| System theme mode | Dashboard follows the user's operating-system preference. | No |
| Full theme switcher redesign | Build broader theme customization in this phase. | No |

**User's choice:** The user explicitly requested dark theme and removal of the "system" theme mode.
**Notes:** Light-mode toggle is not required for Phase 7 unless existing code already exposes one that must be preserved without system mode.

---

## Visual Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Dashboard-first foundation | Theme authenticated app shell, shared primitives, modals, overlays, and common controls. | Yes |
| Full app redesign | Restyle landing/auth/legal pages as part of the same phase. | No |
| Page-by-page visual overhaul | Redesign every dashboard page individually. | No |

**User's choice:** Inferred from milestone scope and roadmap: dark dashboard foundation first.
**Notes:** Public/auth pages should only be touched if global CSS changes would otherwise regress them.

---

## Implementation Direction

| Option | Description | Selected |
|--------|-------------|----------|
| Shared primitives and tokens first | Stabilize global utilities, layout, and UI primitives before targeted page fixes. | Yes |
| Blind class replacement | Replace every light class mechanically across pages. | No |
| New theming dependency first | Add a theme library before checking existing class-based Tailwind support. | No |

**User's choice:** Agent discretion based on codebase scan.
**Notes:** Tailwind already has class-based dark mode. The planner should use this or direct deterministic classes without reintroducing system behavior.

---

## the agent's Discretion

- Exact dark color tokens.
- Whether to use Tailwind `dark` class or direct dark dashboard classes.
- Which dashboard pages require targeted fixes beyond shared primitives.

## Deferred Ideas

- Plan persistence and permission matrix: Phase 8.
- UI permission integration: Phase 9.
- Route/API/AI guards: Phase 10.
