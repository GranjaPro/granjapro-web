# Debug Session: Daily inspections not appearing in sanitary history list and graph mismatch

## Symptoms
- Strucutured daily inspections saved from the health page do not show up in the specific flock's `historico-sanitario` log.
- "Evolução de Saúde" graph does not match the comprehensive health evolution logic from the main health dashboard.

## Investigation
- In `app/dashboard/health/page.tsx`, the form has a flock (Lote) select option. If "Todos os lotes" is selected (value `""`), `flock_id` is written as `null`.
- In `app/dashboard/flocks/detalhes/[loteId]/historico-sanitario/page.tsx`, the daily inspections query uses `.eq("flock_id", loteId)`. If `flock_id` is null, they won't show.
- The `healthTimeline` graph in `historico-sanitario/page.tsx` is computed using mathematical mock weights on timeline event counts, rather than fetching real health log metrics and daily inspections.

## Root Cause
- The flock-specific health history graph is not integrated with the real health logs (`records`, `dailyInspections`, and `mortalityRecords`) mapped to the specific flock.

## Suggested Fix
- Fetch `bird_count` on `historico-sanitario/page.tsx` so we can compute the real mortality rates.
- Re-implement `healthTimeline` in `historico-sanitario/page.tsx` using the same `healthEvolutionData` code from `health/page.tsx`, but scoped to the active flock's records.
