---
phase: 09
slug: ui-permission-integration
status: complete
created: 2026-05-21
requirements:
  - PERM-02
  - PERM-03
  - PERM-05
  - SEC-02
---

# Phase 9 Research: UI Permission Integration

## Research Complete

Phase 9 should consolidate the UI permission layer created across Phase 8 and post-phase polish into a predictable shared behavior: same helper source, same badge rules, same lock overlay semantics, and same upgrade language. The main remaining functional gap called out by product is AI usage meters/visibility consistency.

## Current Implementation Findings

- `lib/plans.ts` already provides canonical plan metadata, capability checks, AI mode weights, and monthly credit limits.
- `components/plan/locked-overlay.tsx`, `components/plan/plan-badge.tsx`, and `components/plan/upgrade-popup.tsx` exist, but are not uniformly applied across all gated cards/pages.
- Several dashboard pages still contain local gating branches and per-page layout fallbacks, causing drift in hidden-state behavior and autolayout.
- Some locked cards keep rendering data containers before gating conditions resolve, which risks accidental exposure in the DOM.
- AI surfaces use mixed patterns: some rely on shared credit metadata, while others still compute or display usage with page-local assumptions.

## Recommended Approach

1. Normalize all touched page-level gating to shared helper predicates from `lib/plans.ts` and shared components from `components/plan/*`.
2. Standardize locked card composition:
   - visible header (icon, title, subtitle, required plan tag)
   - protected body rendered behind one consistent overlay strategy
   - no protected query/render path before plan check where practical
3. Align all upgrade/required-plan tags and popup copy with landing page plan names/prices from central plan constants.
4. Finish AI usage integration by reading monthly allowances and mode costs only from `lib/plans.ts`, then wiring one reusable usage display pattern.
5. Remove empty placeholder wrappers when advanced sections are hidden, so grid/autolayout remains coherent.

## Constraints

- Keep existing accepted visual language and card structure; this phase is integration, not redesign.
- Do not add Stripe/payment/webhook logic.
- Do not claim hard server/API enforcement in this phase (Phase 10 scope).
- Preserve current working plan-change flow and route entry points unless regression appears.

## Validation Architecture

Validation should combine source checks, build checks, and manual viewport verification focused on lock behavior and layout integrity.

- Automated: `npm run build`.
- Automated/source scan: verify reduction of repeated local checks (`plan === "essencial"`, `plan !== "premium"`) in touched files.
- Automated/source scan: verify premium/pro tags and upgrade messaging consume shared helpers/components.
- Automated/source scan: verify AI usage labels/credits reference `lib/plans.ts` values.
- Manual: toggle advanced-feature visibility on Essencial/Pro users and confirm no empty grid shells, no overlay bleed, and no protected content rendered above overlays.

## Planning Implications

The safest split is:

1. Shared permission helper and component normalization across dashboard shell and common gating primitives.
2. Page-by-page lock/autolayout cleanup for production, health, mortality, finances, clients, sales (plus dashboard hotspots).
3. AI usage meter unification using the central credit model and final upgrade-copy consistency pass.

