---
phase: 20
slug: kpi-goals-persistence
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-30
---

# Phase 20 - Validation Strategy

## Test Infrastructure

| Property | Value |
|----------|-------|
| Framework | TypeScript compiler, Next.js build, focused source/diff assertions |
| Quick command | `npx tsc --noEmit` |
| Full command | `npm run build` |
| Estimated runtime | ~60 seconds |

## Sampling Rate

- After each UI task: focused source/diff checks and `npx tsc --noEmit`.
- After each UI plan: `npm run build`.
- After the migration task: local SQL content checks only.
- No remote Supabase command is part of phase validation.

## Per-Task Verification Map

| Task ID | Plan | Requirement | Threat | Verification |
|---------|------|-------------|--------|--------------|
| 20-01-01 | 01 | D-07, D-10 | T-20-04 | Editing identifiers absent; fixed goal/calculation fields remain; TypeScript passes |
| 20-01-02 | 01 | D-08, D-10, D-11 | T-20-03, T-20-04 | Main KPI has no click or pointer; all hover/group classes remain; build passes |
| 20-02-01 | 02 | D-08, D-09, D-10, D-11 | T-20-03, T-20-04 | Only static KPI `cursor-pointer` tokens removed in four operational files |
| 20-02-02 | 02 | D-08, D-09, D-10, D-11 | T-20-03, T-20-04 | Only static KPI `cursor-pointer` tokens removed in three commercial files; build passes |
| 20-03-01 | 03 | D-01 through D-06 | T-20-01, T-20-02 | `00031` contains only approved idempotent drops; `00030` remains unchanged |

## Manual Checks

| Behavior | Requirement | Instructions |
|----------|-------------|--------------|
| Static KPI cursor | D-08, D-09 | Hover the audited KPI cards; cursor is default while all existing hover visuals still occur |
| Real actions | D-11 | Exercise representative buttons, links, nested collection actions, filters, and sliders; their cursor and behavior remain |
| Dashboard goals | D-07, D-10 | Confirm KPIs cannot open the editor and their content/layout/calculations are unchanged |
| Database deployment | D-06 | After phase delivery, the user uploads/applies `00031`; execution does not mutate Supabase |

## Validation Sign-Off

- [x] Every task has automated or focused local verification.
- [x] No Wave 0 test files are required.
- [x] No remote database access is required.
- [x] `nyquist_compliant: true` is set.

**Approval:** pending
