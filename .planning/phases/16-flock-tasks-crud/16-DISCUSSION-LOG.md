# Phase 16 Discussion Log

### Recurrence Implementation
- **Options presented:** Discrete future records vs Cron/interval rules
- **Selected:** Cron/interval rules. Store the recurrence pattern on the task, generate the UI dynamically.
- **Notes:** Cleaner database but harder to handle exceptions.

### Icon & Category Mapping
- **Options presented:** Auto-mapped vs Independent selection
- **Selected:** Auto-mapped. The category dictates the icon (e.g. Category 'Sanitary' -> 💉).
- **Notes:** Keeps UI consistent and reduces friction.

### UI Layout Strategy
- **Options presented:** List view vs Kanban board
- **Selected:** List view with filters and grouped by dates (Today, Upcoming, Overdue).
- **Notes:** Clean, responsive, fits mobile well.
