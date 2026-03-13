# Granja Pro – Development Rules

## General Principles

Granja Pro is a SaaS platform for poultry egg farmers.

The system must prioritize:

- simplicity
- usability
- mobile-first design
- real farm workflows
- fast daily data entry
- clean architecture
- maintainable code

The target user is a farmer using a smartphone in a farm environment.

The interface must be extremely intuitive.

Avoid unnecessary complexity.

---

# Response Rules for Claude

When generating code or solutions:

1. Return only the requested output.
2. Avoid long explanations unless explicitly requested.
3. Prefer minimal and clean implementations.
4. Reuse existing components whenever possible.
5. Modify only the requested files or modules.
6. Do not rewrite unrelated files.
7. Keep answers concise to reduce token usage.

If generating code:

- return only code
- no commentary
- no tutorials
- no repeated context

---

# UI/UX Rules

The UI must follow these principles:

Mobile-first design.

Large touch-friendly elements.

High readability.

Minimal friction for daily data entry.

Clear visual hierarchy.

Use:

- cards for KPIs
- simple forms
- short workflows
- clear navigation

Design style:

- modern SaaS
- agritech visual identity
- green and natural tones
- clean spacing
- simple typography

---

# Component Rules

Prefer reusable components.

Examples:

- KPI cards
- dashboard cards
- charts
- tables
- form inputs

Avoid duplicating UI logic.

Create reusable components whenever possible.

---

# Architecture Rules

Use modular architecture.

Modules must remain independent.

Each module should contain:

- model
- service
- controller
- routes

Avoid tight coupling between modules.

---

# Database Rules

Use a clean relational structure.

Important entities:

users
farms
barns
flocks
egg_production
feed_consumption
mortality
financial_transactions
customers
sales
tasks
alerts

Avoid unnecessary tables.

Keep schema clear and scalable.

---

# Coding Rules

Code must be:

- readable
- modular
- scalable
- production-ready

Avoid overengineering.

Prefer simple implementations.

Use consistent naming.

---

# Performance Rules

Prioritize:

- fast loading
- minimal API calls
- simple queries
- responsive UI

The product must feel fast even on mobile networks.

---

# Claude Behavior

Claude should:

- read the documentation inside /docs
- follow these rules when generating code
- avoid repeating large explanations
- focus on execution

Always prefer minimal token usage while maintaining code quality.

## Data Security

All database access must be protected using Supabase Row Level Security (RLS).

Each farm must only access its own data.

Example rule:

- users can only read/write data belonging to their farm_id