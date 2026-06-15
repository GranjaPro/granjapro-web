---
status: complete
phase: 15-real-health-history-page
source: [15-01-SUMMARY.md]
started: 2026-06-14T23:34:45Z
updated: 2026-06-15T00:32:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Empty State & Redirection
expected: |
  Access the flock health page (/dashboard/flocks/detalhes/[loteId]/saude) or flock sanitary history page (/dashboard/flocks/detalhes/[loteId]/historico-sanitario) for a flock with no health_records and no mortality records.
  The page should show a clean empty state card with a "Registrar nova ocorrencia" CTA.
  Clicking the CTA should redirect the user to "/dashboard/health?register=true&flockId=[loteId]" with the flock ID pre-selected in the registration modal.
result: pass

### 2. Partial/Mortality-Only Page Rendering
expected: |
  Access the flock health page or flock sanitary history page for a flock that has mortality records but no health records.
  The page should render the full layout (KPIs, charts, timeline, checklists) rather than the empty state.
  The "Padroes identificados" card should be hidden in empty or low-data states (less than 3 timeline events).
result: pass

### 3. Mortality Score Weighting & KPIs
expected: |
  On the flock health page, inspect the computed health score.
  The health score should calculate mortality weight at 40%, applying the formula where a 7-day mortality rate <= 2% is a perfect score (100) and >= 10% is 0.
  Weekly mortality count and rate KPIs should be computed dynamically from the db.
result: pass

### 4. Write Action Integration (Edit & Resolve)
expected: |
  On the flock health page, trigger the edit modal or the resolve symptom action.
  The edit modal should update the record in Supabase ("health_records").
  The resolve symptom action should set the status of all active matching records to "completed" in Supabase.
result: pass

### 5. Sanitary Timeline & Mortality Merging
expected: |
  On the flock sanitary history page, view the merged timeline.
  The timeline should merge health records and mortality records sorted in descending date order, formatting mortality events as "Mortalidade registrada: X aves" with the cause and notes in the description.
result: pass

### 6. Dynamic Inspection Checklists
expected: |
  On the flock sanitary history page, expand an inspection record.
  It should generate a 12-item checklist defaulting to 'Ok' (true) but set items to false if anomaly keywords are present in the title/notes.
  If the db status is not "completed", all items in the checklist should show as unchecked/pending, and the compliance rate should show "Pendente".
result: pass

### 7. Treatment Duration Parsing & Status Mapping
expected: |
  On the flock sanitary history page, view treatment records.
  Treatment durations should be parsed dynamically from notes (e.g. "5 dias" or "1 semana") to calculate the end date.
  Database status fields should map correctly (e.g., 'completed' -> 'resolvido', 'in_progress' -> 'em_tratamento', others -> 'parcial').
result: pass

## Summary

total: 7
passed: 7
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
