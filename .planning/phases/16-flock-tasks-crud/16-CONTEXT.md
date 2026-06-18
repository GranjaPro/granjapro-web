# Phase 16: flock-tasks-crud

## Domain
This phase delivers the CRUD interface for managing flock tasks, and augments the database table `tasks` with priority, category, icon, and recurrence.

## Canonical Refs
- No external docs referenced.

## Code Context
- None mapped.

## Decisions

### Recurrence Implementation
- Cron/interval rules. Store the recurrence pattern on the task, generate the UI dynamically. Cleaner database but harder to handle exceptions.

### Icon & Category Mapping
- Auto-mapped. The category dictates the icon (e.g. Category 'Sanitary' -> 💉). This keeps the UI consistent and reduces user friction.

### UI Layout Strategy
- List view with filters and grouped by dates (Today, Upcoming, Overdue). Clean, responsive, and fits mobile usage well.
