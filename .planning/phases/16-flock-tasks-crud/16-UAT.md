---
status: complete
phase: 16-flock-tasks-crud
source:
  - 16-01-SUMMARY.md
started: 2026-06-18T23:58:00Z
updated: 2026-06-18T23:59:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Open Flock Operational Tasks
expected: Open a flock's Operational page. The page loads without mock task rows and shows the real task list for the selected date, grouped into pending, completed, or missed sections when matching task records exist.
result: pass

### 2. Create Flock Task
expected: Clicking "Nova tarefa" opens a task dialog with title, category, priority, scheduled time, recurrence, and notes. Saving a valid task closes the dialog and shows the new task on the selected date.
result: pass

### 3. Edit Flock Task
expected: Clicking the edit action on a task opens the task dialog with the task's current values. Saving changes updates the task row in the list without creating a duplicate.
result: pass

### 4. Complete One Task Occurrence
expected: Clicking the task completion control marks that selected-date occurrence as completed, moves or styles it under completed tasks, and shows a completion time.
result: pass

### 5. Recurring Future Occurrence Stays Pending
expected: After completing one occurrence of a recurring task, navigating to a future matching date still shows that recurring task as pending unless that future date was also completed.
result: pass

### 6. Delete Flock Task
expected: Clicking delete removes the base task from the selected flock's task list, and it no longer appears when navigating dates where it would otherwise recur.
result: pass

## Summary

total: 6
passed: 6
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
