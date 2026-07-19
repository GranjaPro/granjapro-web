# Phase 18: feedback-page - Context

**Gathered:** 2026-07-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the in-app feedback collection flow for Granja Pro: create the Supabase persistence for `feedbacks`, implement `/dashboard/feedback`, and expose access from the dashboard sidebar and Profile Settings modal. This phase is for collecting feedback only; it does not include an admin review dashboard, alert automation, or mobile bottom-nav redesign.

</domain>

<decisions>
## Implementation Decisions

### Feedback Form
- **D-01:** Use simple product feedback categories: `Satisfacao`, `Bug`, `Sugestao`, `Dificuldade`, and `Outro`.
- **D-02:** Star rating, category, and authenticated farm/user context are required.
- **D-03:** Description is optional to reduce friction, but the UI should still encourage a short explanation when useful.

### Submit Flow
- **D-04:** After a successful submission, show an in-page confirmation and clear the form while keeping the user on `/dashboard/feedback`.
- **D-05:** Surface submission errors inline using the existing app style instead of redirecting or silently failing.

### Access Points
- **D-06:** Add the feedback link at the end of the desktop dashboard sidebar, as required by the milestone.
- **D-07:** Add a feedback button inside the existing Profile Settings modal, as required by the milestone.
- **D-08:** Do not add feedback to the mobile bottom navigation in this phase. The mobile nav is intentionally compact and should not be crowded unless a later product decision expands it.

### Data And Permissions
- **D-09:** Persist feedback in a `feedbacks` table with `user_id` and `farm_id` foreign keys, matching the milestone requirement.
- **D-10:** Use RLS so authenticated users can insert feedback only for their own farm context.
- **D-11:** Feedback is one-way in this phase. Users do not need a submitted-feedback history or edit/delete flow.

### the agent's Discretion
- Choose the exact visual layout, field labels, icon, and placement inside the Profile Settings modal by reusing existing dashboard patterns.
- Choose the next migration filename based on the current latest migration at implementation time.
- Add compact client/service helpers only if they reduce duplication and match existing Supabase service patterns.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Scope
- `.planning/PROJECT.md` - Defines Granja Pro as a practical, mobile-first farm management SaaS with minimal, fast workflows.
- `.planning/STATE.md` - Records v1.3 execution context and accumulated decision that feedback collects satisfaction ratings and can later feed evaluation alerts.
- `.planning/milestones/v1.3-ROADMAP.md` - Phase 18 goal: migration for `feedbacks`, `/dashboard/feedback`, and access routes.
- `.planning/milestones/v1.3-REQUIREMENTS.md` - Feedback Collection System requirements: star rating, category selector, description, sidebar/profile access, and persistence with `user_id`/`farm_id`.

### Codebase Guidance
- `.planning/codebase/CONVENTIONS.md` - Local conventions, strict TypeScript expectations, no configured test framework, and build verification expectations.
- `.planning/codebase/STRUCTURE.md` - Route, service, component, and migration placement patterns.
- `.planning/codebase/STACK.md` - Next.js, React, Supabase, Tailwind, Lucide, and environment constraints.

### Integration Points
- `app/dashboard/layout.tsx` - Dashboard sidebar navigation and Profile Settings modal mounting point.
- `components/dashboard/profile-settings.tsx` - Existing profile modal where the feedback access button should be added.
- `components/layout/mobile-nav.tsx` - Existing mobile navigation, reviewed and intentionally left unchanged for this phase.
- `lib/database.types.ts` - Generated/maintained Supabase table typings that must include `feedbacks` after the migration/types update.
- `supabase/migrations/` - Migration directory. The current latest migration observed during discussion was `00027_fix_medicine_inventory_location_trigger.sql`; implementation must use the next available migration number.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/dashboard/layout.tsx`: Reuse the existing `sidebarNav` data structure, active-route handling, and icon/link styling for the feedback menu item.
- `components/dashboard/profile-settings.tsx`: Reuse existing modal section/button patterns and `router.push(...)` behavior used for plan selection.
- Supabase service pattern in `lib/services`: Prefer a focused feedback service if persistence logic would otherwise live directly in the page component.
- Existing Lucide icon usage: Use an existing icon import rather than custom SVG for the feedback entry.

### Established Patterns
- Dashboard pages live under `app/dashboard/[feature]/page.tsx`.
- User-facing write flows should use the current authenticated Supabase client and farm context patterns rather than a custom backend.
- UI should remain quiet and operational; no marketing-style feedback landing page.
- TypeScript changes must avoid `any`; define table, form, and category types explicitly.

### Integration Points
- New route: `app/dashboard/feedback/page.tsx`.
- New database migration: `supabase/migrations/[next]_feedbacks.sql`.
- Dashboard nav: append feedback to the end of the desktop sidebar list.
- Profile modal: add a button that closes the modal and routes to `/dashboard/feedback`.
- Database types: update `lib/database.types.ts` consistently with the new `feedbacks` table.

</code_context>

<specifics>
## Specific Ideas

Use the recommended product shape approved by the user: simple categories, optional description, confirmation on the same page, and no mobile bottom-nav item in this phase.

</specifics>

<deferred>
## Deferred Ideas

- Admin feedback review dashboard - future phase if product needs internal triage.
- User-facing feedback history/edit/delete - future phase if users need to track submissions.
- Mobile bottom-nav feedback item - future navigation decision if feedback becomes a primary mobile workflow.
- Evaluation-trigger alerts based on feedback - belongs to the later evaluation triggers/alerts phase.

</deferred>

---

*Phase: 18-feedback-page*
*Context gathered: 2026-07-19*
