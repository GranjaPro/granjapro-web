# Debug Session: Health page forms, filters, and component mappings

## Symptoms
- "Data da última inspeção" is not integrated with actual database daily inspections.
- "Último registro sanitário" displays vaccinations instead of only treatments, and clicking "Ver todos" opens an empty details modal.
- "Agenda de Vacinação" filters out completed vaccines and falls back to mock scheduled items, hiding user data.
- The registration form lacks status inputs for vaccinations, and auxiliary fields lack styling and labels.
- The logs table lacks a type filter.

## Investigation
- `ultimoRegistroSanitario` selects the latest record without checking if `record.type === "treatment"`.
- `displayedAgenda` falls back to `mockAgendaVacina` when `agenda.length === 0`, ignoring if the user has completed vaccines.
- Form inputs for vaccination and treatment details are raw text fields with placeholders, but have no labels or visual grid packaging.
- The `tipo` select list in the form includes non-MVP types like "Sintoma".

## Root Cause
- The form styling was left as minimal placeholders, and component selectors/filters were too permissive (e.g. including vaccinations in sanitary logs) or too restrictive (mock fallbacks when scheduled lists are empty).

## Suggested Fix
- Restructure `ultimoRegistroSanitario` to only target treatments (`type === "treatment"`).
- Disable mock agenda fallback when the user has any real vaccine record in the database.
- Add labels and styled wrappers to all auxiliary form fields.
- Make vaccine schedule items clickable, opening their edit modal.
- Add a type filter select next to the search query on the records table.
