# Debug Session: Egg production withdrawal warning and block not triggering

## Symptoms
- Production of flocks under active withdrawal periods can be logged as commercializable eggs without warning or enforcement.

## Investigation
- In `app/dashboard/production/page.tsx`, the `activeWithdrawal` comparison compares the treatment dates against the current system date (`new Date()`).
- This means it ignores the actual date the user is logging production for (`form.data`).
- It also uses client-side timezone comparisons which suffer from UTC timezone shifts.

## Root Cause
- Checking against the current date/time instead of the user's selected production registry date (`form.data`), coupled with UTC-shift date parser mismatches.

## Suggested Fix
- Re-write the active withdrawal check in `production/page.tsx` to compare `form.data` (parsed as a local date) against the treatment's withdrawal start and end dates.
