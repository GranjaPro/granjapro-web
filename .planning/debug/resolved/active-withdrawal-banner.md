# Debug Session: Active withdrawal warning banner not displaying

## Symptoms
- No banner is displayed on the flock details layout when a flock has an active treatment with a withdrawal period.

## Investigation
- In `app/dashboard/flocks/detalhes/[loteId]/layout.tsx`, the `activeWithdrawal` comparison slices `.toISOString()` to get `today`.
- `.toISOString()` parses in UTC, which can shift the current date by 1 day relative to local time, breaking date comparisons.
- Similarly, `getWithdrawalEndDate` uses `.toISOString()`, which shifts the end date.

## Root Cause
- Timezone shifts introduced by using `.toISOString()` for date string slice operations in layout date comparisons.

## Suggested Fix
- Replace UTC-based `toIsoDate` with a local timezone-safe implementation that extracts local date components.
