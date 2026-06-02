# Phase 9: UI Permission Integration - Context

**Gathered:** 2026-05-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 9 consolidates UI-level permission behavior across the app by replacing scattered checks with shared plan helpers and consistent locked/upgrade presentation, while preserving the current user flow and visual language already accepted in Phase 8.

This phase focuses on frontend permission integration. It does not introduce new billing logic, route/API hard enforcement (Phase 10), or redesign unrelated business workflows.
</domain>

<decisions>
## Implementation Decisions

### Locked Content Strategy

- **D-01:** Keep locked experiences from exposing real protected data. Titles, subtitles, and plan tags stay visible; protected content body stays blocked/blurred by shared overlay behavior.
- **D-02:** Preserve current behavior where this strategy is already correctly implemented and unify remaining outliers to the same pattern.

### Upgrade/Plan Change Flow

- **D-03:** Existing plan change flow is accepted as complete for this phase (upgrade entry points and plan switching behavior are already working).
- **D-04:** Do not re-open solved plan-switch mechanics unless a regression appears while integrating shared UI permission helpers.

### AI Usage Visibility

- **D-05:** AI usage meters are the only area still not 100% and must be treated as the primary open item in Phase 9 UI integration.
- **D-06:** Use the centralized plan/credit model from Phase 8 as the source for AI usage labels, limits, and visibility behavior.

### Integration Depth

- **D-07:** Apply shared permission behavior to touched high-impact dashboard pages first, but complete Phase 9 only after visible inconsistencies in plan-gated components are removed.
- **D-08:** Maintain existing accepted card structures/layouts; changes should be integration-focused rather than visual redesign.
</decisions>

<canonical_refs>
## Canonical References

- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/phases/08-plan-persistence-permission-matrix/08-CONTEXT.md`
- `.planning/phases/08-plan-persistence-permission-matrix/08-UAT.md`
- `lib/plans.ts`
- `components/plan/plan-provider.tsx`
- `components/plan/locked-overlay.tsx`
- `components/plan/plan-badge.tsx`
- `app/dashboard/layout.tsx`
</canonical_refs>

<code_context>
## Existing Code Insights

- The shared plan matrix already exists in `lib/plans.ts` and should remain the single source of truth for plan capabilities and AI credits.
- The current app already has many locked overlays and plan badges; remaining work is to normalize behavior where inconsistencies still appear.
- `app/dashboard/layout.tsx` already carries important global UI permission behavior (badges, toggle states, visibility decisions).
- AI usage presentation is currently the main incomplete UX area and should be standardized with existing plan metadata.
</code_context>

<specifics>
## Specific Ideas

- User confirmed the locked-content strategy should stay as implemented and be treated as standard.
- User confirmed plan changing behavior is already working and can be considered complete.
- User highlighted AI usage meters as the only item still not fully complete.
</specifics>

<deferred>
## Deferred Ideas

- Billing/subscription backend enforcement and payment integration remain outside this phase.
- Route/API hard security guards remain in Phase 10 scope.
</deferred>

---

*Phase: 09-UI Permission Integration*
*Context gathered: 2026-05-21*
