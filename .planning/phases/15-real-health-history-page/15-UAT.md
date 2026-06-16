---
status: resolved
phase: 15-real-health-history-page
source: [15-01-SUMMARY.md]
started: 2026-06-16T15:59:00Z
updated: 2026-06-16T18:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: |
  Kill any running server/service. Clear ephemeral state (temp DBs, caches, lock files). Start the application from scratch. Server boots without errors, any seed/migration completes, and a primary query (health check, homepage load, or basic API call) returns live data.
result: pass

### 2. Flock Sanitary Inspections Log & View
expected: |
  Navigate to the flock health history page (e.g. `/dashboard/flocks/detalhes/[loteId]/historico-sanitario`). Verify that you can view daily inspections checklist data. Verify that the clinical values (water consumption, feed intake, bird behavior, feather condition, manure status) render correctly for logged entries.
result: issue
reported: "The inspection is being correctly saved on the health page, however it is not appearing within \"detalhes/[loteId]/historico-sanitario\" in the \"Histórico de inspeções\" component. Futhermore, the \"Evolução de Saúde\" graph needs to be the same as the \"Evolução do lote\" graph we have in dashboard/health"
severity: major

### 3. Traceability Fields on Treatment and Vaccination
result: issue
expected: |
  Navigate to the health dashboard (`/dashboard/health`) or flock health page (`/dashboard/flocks/detalhes/[loteId]/saude`). Create a new health record representing a vaccination or treatment. Verify that you can input batch numbers, expiration dates, veterinary prescriptions, and withdrawal periods, and save them.
reported: |
  Within /dashboard/flocks/detalhes/[loteId]/saude:
  1. The "Data da ultima inspeção" (Last Inspection Date) component is not integrated to fetch real data from the database.
  2. The "Último registro sanitário" (Last Health Record) component is not correctly linked to health records; it shows vaccines instead. Additionally, clicking the "ver todos" (view all) button in this component opens an empty details modal.
  3. The "Agenda de Vacinação" (Vaccination Schedule) component displays vaccines correctly, but only those that are not completed.

  Within /dashboard/health:
  1. The "Agenda de Vacinação" (Vaccination Schedule) still displays mock data when my vaccines are set to "Completed".
  2. The registration form does not allow recording the vaccine status (e.g., pending vs. completed).
  3. The new form fields do not match the application's visual style and appear under inappropriate options. Examples:
   - We do not need a symptom record type; this is handled in daily inspections.
   - Medication is registered under "Tratamento" (Treatment).
   - "Isolamento" (Isolation) in the form is a type of treatment (e.g., 5-day isolation to prevent contamination of other birds in the flock).
   - The main registerable types for the MVP should be "Vacinação" (Vaccination), "Tratamento" (Treatment), and "Inspeção" (Inspection). The auxiliary fields should dynamically change depending on the selected type to specify options (e.g., treatment type like medication).
   - Auxiliary fields must have their respective labels.
   - When registering a vaccination, we must be able to submit its current status.
  4. It must be possible to click on items in the "Agenda de Vacinação" to open an edit details modal, similar to the one in detalhes/[loteId]/saude, allowing updates to vaccine info.
  5. The "Registros de saúde" (Health Records) component should have a filter by type in addition to the existing text filter.
severity: blocker

### 4. Active Sanitary Withdrawal Warning Banner
expected: |
  When a flock has an active treatment with a withdrawal period (meaning the current date is within the withdrawal window calculated from the treatment date and withdrawal days), navigate to the flock details layout (e.g. details page `/dashboard/flocks/detalhes/[loteId]`). Verify that a prominent warning banner is displayed alerting the user to the active withdrawal period.
result: issue
reported: "No warning banner is displayed."
severity: major

### 5. Egg Production Disposal Enforcement
expected: |
  When there is an active withdrawal period for a flock, navigate to the egg production page (`/dashboard/production`). Log egg production for that flock. Verify that the system warns the user and automatically sets or forces the eggs to be discarded (non-commercializable) instead of logged as normal commercial eggs, preventing accidental sale of contaminated eggs.
result: issue
reported: "Able to register egg production for flocks under sanitary withdrawal as normal commercializable eggs without warning or enforcement."
severity: blocker

### 6. Mortality Classification (Natural vs. Culling)
expected: |
  Navigate to the mortality dashboard (`/dashboard/mortality`) or the flock mortality page (`/dashboard/flocks/detalhes/[loteId]/mortalidade`). Add a mortality log. Verify that you can select the mortality type (Natural vs. Descarte Técnico / Technical Culling) and choose from the updated cause options.
result: issue
reported: "Remove the 'Tipo de ocorrência' field from the mortality form, as it duplicates records that already exist within 'Causa'."
severity: minor

## Summary

total: 6
passed: 1
issues: 5
pending: 0
skipped: 0

## Gaps

- truth: |
    Navigate to the flock health history page (e.g. `/dashboard/flocks/detalhes/[loteId]/historico-sanitario`). Verify that you can view daily inspections checklist data. Verify that the clinical values (water consumption, feed intake, bird behavior, feather condition, manure status) render correctly for logged entries.
  status: resolved
  reason: "User reported: The inspection is being correctly saved on the health page, however it is not appearing within \"detalhes/[loteId]/historico-sanitario\" in the \"Histórico de inspeções\" component. Futhermore, the \"Evolução de Saúde\" graph needs to be the same as the \"Evolução do lote\" graph we have in dashboard/health"
  severity: major
  test: 2
  root_cause: "The health timeline graph uses calculated mock weights instead of the real health evolution logic, and daily inspections without flock_id are hidden."
  artifacts:
    - path: "app/dashboard/flocks/detalhes/[loteId]/historico-sanitario/page.tsx"
      issue: "Calculated mock weights used in chart; daily inspections fetch has strict flock filter."
  missing:
    - "Select bird_count in flocks query on `historico-sanitario/page.tsx` to calculate real rates."
    - "Re-implement healthTimeline to match healthEvolutionData calculation logic."
  debug_session: .planning/debug/inspection-not-showing.md

- truth: |
    Navigate to the health dashboard (`/dashboard/health`) or flock health page (`/dashboard/flocks/detalhes/[loteId]/saude`). Create a new health record representing a vaccination or treatment. Verify that you can input batch numbers, expiration dates, veterinary prescriptions, and withdrawal periods, and save them.
  status: resolved
  reason: |
    User reported issues with fields and visual flow on treatment and vaccination forms and components:
    Within /dashboard/flocks/detalhes/[loteId]/saude:
    1. The "Data da ultima inspeção" (Last Inspection Date) component is not integrated to fetch real data from the database.
    2. The "Último registro sanitário" (Last Health Record) component is not correctly linked to health records; it shows vaccines instead. Additionally, clicking the "ver todos" (view all) button in this component opens an empty details modal.
    3. The "Agenda de Vacinação" (Vaccination Schedule) component displays vaccines correctly, but only those that are not completed.

    Within /dashboard/health:
    1. The "Agenda de Vacinação" (Vaccination Schedule) still displays mock data when my vaccines are set to "Completed".
    2. The registration form does not allow recording the vaccine status (e.g., pending vs. completed).
    3. The new form fields do not match the application's visual style and appear under inappropriate options. Examples:
     - We do not need a symptom record type; this is handled in daily inspections.
     - Medication is registered under "Tratamento" (Treatment).
     - "Isolamento" (Isolation) in the form is a type of treatment (e.g., 5-day isolation to prevent contamination of other birds in the flock).
     - The main registerable types for the MVP should be "Vacinação" (Vaccination), "Tratamento" (Treatment), and "Inspeção" (Inspection). The auxiliary fields should dynamically change depending on the selected type to specify options (e.g., treatment type like medication).
     - Auxiliary fields must have their respective labels.
     - When registering a vaccination, we must be able to submit its current status.
    4. It must be possible to click on items in the "Agenda de Vacinação" to open an edit details modal, similar to the one in detalhes/[loteId]/saude, allowing updates to vaccine info.
    5. The "Registros de saúde" (Health Records) component should have a filter by type in addition to the existing text filter.
  severity: blocker
  test: 3
  root_cause: "Health components display data from loose filters, fall back to mocks even when real data exists, and form inputs lack proper labels, types, and status fields."
  artifacts:
    - path: "app/dashboard/flocks/detalhes/[loteId]/saude/page.tsx"
      issue: "ultimoRegistroSanitario maps to any completed type; ver todos and agenda are mock-dependent."
    - path: "app/dashboard/health/page.tsx"
      issue: "Mock fallback active even when database has real vaccines; no status dropdown for vaccines; missing input labels; no records type filter."
  missing:
    - "Only map type === 'treatment' for ultimoRegistroSanitario."
    - "Add status select field (completed/scheduled) to vaccine forms."
    - "Add labels and style wrappers to all form details."
    - "Support clicking agenda items to edit them."
    - "Add type filter to registros table."
  debug_session: .planning/debug/health-form-and-components.md

- truth: |
    When a flock has an active treatment with a withdrawal period (meaning the current date is within the withdrawal window calculated from the treatment date and withdrawal days), navigate to the flock details layout (e.g. details page `/dashboard/flocks/detalhes/[loteId]`). Verify that a prominent warning banner is displayed alerting the user to the active withdrawal period.
  status: resolved
  reason: "User reported: No warning banner is displayed."
  severity: major
  test: 4
  root_cause: "Date comparison logic uses UTC-based conversion which offsets the current day by timezone differences."
  artifacts:
    - path: "app/dashboard/flocks/detalhes/[loteId]/layout.tsx"
      issue: "toIsoDate shifts local times to UTC."
  missing:
    - "Update toIsoDate in layout.tsx to format dates in local timezone."
  debug_session: .planning/debug/active-withdrawal-banner.md

- truth: |
    When there is an active withdrawal period for a flock, navigate to the egg production page (`/dashboard/production`). Log egg production for that flock. Verify that the system warns the user and automatically sets or forces the eggs to be discarded (non-commercializable) instead of logged as normal commercial eggs, preventing accidental sale of contaminated eggs.
  status: resolved
  reason: "User reported: Able to register egg production for flocks under sanitary withdrawal as normal commercializable eggs without warning or enforcement."
  severity: blocker
  test: 5
  root_cause: "activeWithdrawal check is performed against the current time instead of form.data, and uses shift-prone UTC parsing."
  artifacts:
    - path: "app/dashboard/production/page.tsx"
      issue: "activeWithdrawal references new Date() instead of form.data."
  missing:
    - "Update activeWithdrawal logic to compare form.data against treatment window."
  debug_session: .planning/debug/egg-production-withdrawal.md

- truth: |
    Navigate to the mortality dashboard (`/dashboard/mortality`) or the flock mortality page (`/dashboard/flocks/detalhes/[loteId]/mortalidade`). Add a mortality log. Verify that you can select the mortality type (Natural vs. Descarte Técnico / Technical Culling) and choose from the updated cause options.
  status: resolved
  reason: "User reported: Remove the 'Tipo de ocorrência' field from the mortality form, as it duplicates records that already exist within 'Causa'."
  severity: minor
  test: 6
  root_cause: "Redundant input select for Tipo de Ocorrência when culling can be derived from Causa."
  artifacts:
    - path: "app/dashboard/mortality/page.tsx"
      issue: "Tipo de ocorrência select dropdown is present in form."
  missing:
    - "Remove Tipo de ocorrência select element from mortality form."
    - "Derive mortality_type: causa === 'Descarte Técnico' ? 'culling' : 'natural'."
  debug_session: .planning/debug/mortality-type-field.md
