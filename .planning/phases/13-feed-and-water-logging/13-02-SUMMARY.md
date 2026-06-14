---
phase: 13-feed-and-water-logging
plan: 02
subsystem: ui
tags: [react, recharts, gating]
requires:
  - phase: 13-feed-and-water-logging
    provides: water_consumption table, typed water service
provides:
  - Feed consumption target indicators (110g-130g)
  - Real water data integration in feed comparison chart for Pro+ users
  - Gated comparison overlay for Essencial users
affects:
  - app/dashboard/racao/page.tsx
tech-stack:
  added: []
  patterns: [recharts-reference-line, plan-gated-charts]
key-files:
  modified:
    - app/dashboard/racao/page.tsx
key-decisions:
  - Used Recharts ReferenceLine to draw visual targets of 110g and 130g on the feed efficiency chart.
  - Kept comparison chart on feed page, but integrated real data from water_consumption table for Pro users.
requirements-completed: [KG-03, WF-03, FEED-TARGET]
duration: 15 min
completed: 2026-06-14
---

# Phase 13 Plan 02: Feed Target Indicators Summary

Integrated real water consumption data into the feed comparison chart and added reference visual lines on `/dashboard/racao` for bird daily feed targets.

## Accomplishments
- Added reference lines for 110g and 130g target feed consumption per bird.
- Integrated real `water_consumption` data query via `getWaterByDateRange` on `/dashboard/racao`.
- Implemented `LockedOverlay` on the comparison chart for users on the Essencial plan to prevent access to Pro-only features.
- Removed the old unneeded water input field from the feed logging modal and updated the form payloads.
