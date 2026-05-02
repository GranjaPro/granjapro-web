# Phase 5: Google Entry Points & Signup Terms Gate - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-02
**Phase:** 5-Google Entry Points & Signup Terms Gate
**Areas discussed:** Terms gate UX, Google CTA text, Redirect feedback, CTA placement, Signup field relation, Visual consistency

---

## Terms gate UX

| Option | Description | Selected |
|--------|-------------|----------|
| Disable until checked | Keep the Google button disabled until terms are accepted, matching the existing email signup submit button behavior. | ✓ |
| Allow tap, show warning | Keep the button clickable, but block OAuth start and show an explanation. | |
| Allow tap, open modal | Intercept the click and show a modal before refusing to continue. | |

**User's choice:** Disable until checked
**Notes:** Terms acceptance alone unlocks Google signup. Helper text should explain the gate and live near the Google CTA.

---

## Google CTA text

| Option | Description | Selected |
|--------|-------------|----------|
| Different text | Use login-specific and signup-specific button wording. | ✓ |
| Same text everywhere | Use one shared phrase like `Continuar com Google` on both pages. | |
| Mostly same, slight hint | Keep shared base wording and add a small hint nearby. | |

**User's choice:** Different text
**Notes:** Preferred tone is direct action. Login copy should feel login-specific; signup should use concise direct wording plus small nearby subtext for the terms gate.

---

## Redirect feedback

| Option | Description | Selected |
|--------|-------------|----------|
| Loading + disable | Show loading feedback immediately and prevent repeat clicks. | ✓ |
| Disable only | Prevent repeat clicks without changing label or showing spinner. | |
| No feedback | Keep the current instant-handoff behavior with no visible state change. | |

**User's choice:** Loading + disable
**Notes:** Loading copy should be Google-specific. If the handoff fails before navigation, show inline error near the CTA. Other auth actions should also be locked during Google redirect.

---

## CTA placement

| Option | Description | Selected |
|--------|-------------|----------|
| Keep below form | Preserve the current pattern: form first, divider, Google button below. | ✓ |
| Move above form | Put Google before the manual fields. | |
| Place side-by-side | Give manual and Google actions more equal prominence. | |

**User's choice:** Keep below form
**Notes:** Keep the same placement on login and signup, keep the simple `ou` divider, and keep the Google CTA full-width.

---

## Signup field relation

| Option | Description | Selected |
|--------|-------------|----------|
| Separate paths | Treat manual signup and Google signup as parallel paths. | ✓ |
| Google should reuse name | Let Google conceptually reuse the typed name. | |
| Clear manual fields | Reset manual inputs when switching to Google. | |

**User's choice:** Separate paths
**Notes:** Typed fields remain untouched and are not consumed by Google signup. Keep separation subtle, preserve typed values if the user returns from a canceled Google attempt, and avoid stronger sectioning.

---

## Visual consistency

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, same weight | Keep Google as the current secondary white-button action. | ✓ |
| Slightly stronger | Give Google a bit more visual emphasis. | |
| Primary-level emphasis | Promote Google closer to the main submit action. | |

**User's choice:** Yes, same weight
**Notes:** Reuse existing disabled patterns, spinner style, and auth helper/error styling instead of inventing a new Google-specific visual language.

---

## Claude's Discretion

None.

## Deferred Ideas

None.
