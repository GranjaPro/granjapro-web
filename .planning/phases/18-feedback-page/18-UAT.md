---
status: testing
phase: 18-feedback-page
source: [18-VERIFICATION.md]
started: 2026-07-19T21:42:17Z
updated: 2026-07-19T21:42:17Z
---

## Current Test

number: 1
name: Live RLS forged-context check
expected: |
  Supabase rejects a forged user_id or farm_id feedback insert and accepts a valid authenticated user's own farm feedback insert.
awaiting: user response

## Tests

### 1. Live RLS forged-context check
expected: Supabase rejects a forged user_id or farm_id feedback insert and accepts a valid authenticated user's own farm feedback insert.
result: [pending]

### 2. Authenticated blank-description submit
expected: Open /dashboard/feedback as an authenticated farm user, select rating/category, leave description blank, submit, and confirm success appears, the form clears, and the route remains /dashboard/feedback.
result: [pending]

### 3. Successful submit state reset
expected: Submit valid feedback in an authenticated browser session and confirm the page stays on /dashboard/feedback, shows Feedback enviado, and clears rating, category, and description.
result: [pending]

### 4. Long-text visual backstop
expected: Paste long text into the description and force a long status/error message at mobile and desktop widths; textarea content, helper text, errors, and status banners wrap with no horizontal overflow or overlap.
result: [pending]

### 5. Desktop sidebar active state
expected: Open the authenticated dashboard at desktop width and navigate to /dashboard/feedback; Feedback appears as the final sidebar navigation item and the active state is visible.
result: [pending]

### 6. Profile Settings modal route flow
expected: Open Profile Settings, click Enviar feedback, and confirm the modal closes and the route changes to /dashboard/feedback.
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
