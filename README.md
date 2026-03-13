# Token Efficient Workflow for Claude Code

This project is developed using Claude Code.

To minimize token usage and keep conversations efficient, we follow a documentation-driven workflow and strict prompting rules.

The goal is to reduce unnecessary context, avoid repeated prompts, and ensure Claude generates only the required output.

---

# Core Principle: Context Anchoring

Instead of sending large prompts repeatedly, project context is stored in the `/docs` directory.

Claude should load context from these files rather than receiving long instructions in every prompt.

Project documentation includes:

- product.md
- mvp.md
- modules.md
- database.md
- flows.md
- stack.md
- rules.md

These files contain the complete project definition.

---

# Starting a New Claude Session

When starting a new session or after clearing context, use the following bootstrap instruction:

Load project context from /docs and follow rules.md strictly.

This allows Claude to rebuild context without sending large prompts.

---

# Clear Context Frequently

To prevent token accumulation:

/clear

After clearing:

Load project context from /docs and follow rules.md.

---

# Always Request Focused Tasks

Prefer small and precise instructions.

Good example:

Create the feed consumption API.

Bad example:

Build the entire farm management system.

Large instructions dramatically increase token usage.

---

# Modify Only What Is Necessary

When updating code, reference specific files or functions.

Good example:

Update production.service.ts to calculate laying rate.

Bad example:

Rewrite the production module.

This prevents Claude from analyzing unnecessary parts of the project.

---

# Return Only Code

Always instruct Claude to avoid explanations when they are not needed.

Use:

Return only code.

This reduces output tokens significantly.

---

# Avoid Repeating Project Context

Do not resend the product description, architecture, or feature list.

Instead reference the documentation.

Example:

Read project context from /docs and implement the production module.

---

# Break Work Into Small Steps

Large tasks generate large responses.

Instead of:

Create the entire dashboard.

Use:

Create the KPI cards for the dashboard.

Then:

Create the dashboard layout.

Then:

Create the charts.

This dramatically reduces token usage.

---

# Reuse Existing Components

Ask Claude to reuse existing UI components rather than generating new ones.

Example:

Use existing KPI card components for the dashboard.

This avoids unnecessary code generation.

---

# Avoid Over-Engineering

Always prefer simple implementations.

Complex architectures increase token usage and development time.

---

# Efficient Prompt Pattern

Use the following structure for most requests:

Load project context from /docs.

Task:
[small focused task]

Return only code.

Example:

Load project context from /docs.

Task:
Create the egg production service.

Return only code.

---

# Development Goal

Maintain efficient Claude sessions with minimal token usage while producing clean, modular, production-ready code.