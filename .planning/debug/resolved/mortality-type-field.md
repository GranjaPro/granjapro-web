# Debug Session: Redundant Tipo de Ocorrência field in mortality form

## Symptoms
- The "Tipo de ocorrência" select field in the mortality registration form is redundant because it duplicates information already specified by the cause.

## Investigation
- In `app/dashboard/mortality/page.tsx`, the form has a select field for "Causa" (which includes "Descarte Técnico") and a separate select field for "Tipo de ocorrência" (which has "Mortalidade Natural" and "Descarte Técnico").
- When the user selects "Descarte Técnico" as the cause, they are forced to also select "Descarte Técnico" as the type. This is redundant.

## Root Cause
- Redundant form inputs for data that can be derived logically from the selected cause.

## Suggested Fix
- Remove the "Tipo de ocorrência" select dropdown from the form in `app/dashboard/mortality/page.tsx`.
- Derive `mortality_type` automatically: if `form.causa` is `"Descarte Técnico"`, set type to `"culling"`, otherwise `"natural"`.
