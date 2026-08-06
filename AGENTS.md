# AGENTS.md

## Core Rules

* Read only the files required for the current task.
* Reuse existing code, patterns, utilities, and dependencies before creating new ones.
* Ask one concise question only when missing information blocks a safe implementation.
* Make the smallest change that fully solves the requested problem.
* Do not add features, abstractions, dependencies, or refactors outside the requested scope.
* Keep changes atomic, focused, and easy to review.
* Preserve existing behavior unless the request explicitly requires changing it.
* Follow the repository's existing architecture, naming, formatting, and conventions.
* Prefer simple, readable solutions over clever or overly generic ones.
* Keep functions and modules small and focused on one responsibility.
* Keep business rules independent from frameworks, databases, and external services.
* Depend on interfaces defined by the application core, not concrete infrastructure.
* Never use `any` in TypeScript; use explicit types or `unknown` with validation.
* Remove code made unused by your changes, but do not perform unrelated cleanup.
* Use meaningful names and avoid comments that only describe what the code does.
* Comment only non-obvious business rules, constraints, or design decisions.
* Never leave commented-out code in the repository.
* Prefer explicit exceptions or typed results over silent failures and ambiguous `null` values.
* Update or add focused tests whenever behavior changes.
* Run only the tests, type checks, and linters relevant to the changed files.
* Do not claim a command passed unless you actually executed it.
* Do not rewrite entire files when a localized change is sufficient.
* Do not output unchanged code, full files, or long explanations unless requested.
* In the final response, report only the cause, changed files, validation, and remaining risks.
* Search incrementally: inspect the requested file first, follow only direct dependencies, and stop once enough context exists to complete the task.
* Do not reread files already inspected unless they changed or new evidence requires it.
* Use targeted searches for symbols and references instead of browsing directories broadly.
* Read only the relevant sections of large files whenever the tooling allows it.
* Do not restate the request, repository rules, or previously established context.
* Prefer repository tools, tests, type checkers, and linters over manually reasoning about generated output.
* Do not generate plans for small, localized, and unambiguous changes.
* Limit investigation to one likely path at a time; expand only when evidence disproves it.
* Summarize large outputs, logs, and test results instead of reproducing them verbatim.
* Avoid multiple implementation alternatives unless the requested approach is unsafe or infeasible.
* Once validation passes and the acceptance criteria are met, stop.

## Mandatory Approval Gate
* Never modify code, files, dependencies, configurations, schemas, or tests before explicit approval.
* Before implementation, inspect only the context required to produce a reliable plan.
* Present the implementation plan with the problem, proposed solution, rationale, affected files, step-by-step changes, risks, tests, and exact code or diff to be applied.
* Planning, analysis, code examples, and proposed diffs are read-only and do not authorize file changes.
* Wait for the exact authorization: `planejamento aprovado, pode implementar`.
* Do not treat messages such as `ok`, `certo`, `continue`, `parece bom`, or similar responses as implementation approval.
* If the plan changes after approval, stop and request approval for the revised plan before continuing.
* Implement only the approved files, code, and steps; do not include additional refactors, cleanup, or improvements.
* After approval, do not repeat the full plan; implement it and report only changes, validation results, and deviations.
* If implementation reveals an unexpected requirement, stop before modifying anything outside the approved plan.
