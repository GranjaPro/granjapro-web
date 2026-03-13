# ⚡ Token-Efficient Workflow for Claude Code

This project is built using Claude Code.  
The purpose of this README is to ensure **minimal token usage, fast development cycles, and consistent AI behavior**.

The workflow below allows developers to build large SaaS systems while keeping prompts small and efficient.

---

# 🧠 Core Principle — Context Anchoring

Instead of sending large prompts repeatedly, the project stores context in the `/docs` directory.

Claude should load information from these files instead of receiving long instructions in every prompt.

docs/
  product.md
  mvp.md
  modules.md
  database.md
  flows.md
  stack.md
  rules.md

These files contain the **complete project definition**.

---

# 🚀 Starting a New Claude Session

Whenever starting a new session or after clearing context, run the bootstrap instruction:

"Load project context from /docs and follow rules.md strictly".

This restores full context **without sending large prompts**.

---

# 📷 First Prompt

Read the project documentation inside the /docs folder to understand the product.

Based on that context, generate the first visual MVP page.

Tech stack:
- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui

Goals:
- create the first visual page of the product
- use mock data only
- focus on high-quality UI/UX
- mobile-first design

Constraints:
- do not build backend logic yet
- do not build authentication yet
- do not implement database integration yet

The page should represent the main operational dashboard for the farm.

Output:
- create the page component
- organize reusable UI components
- keep the structure modular for future expansion

---

# 🧹 Clear Context Frequently

Claude sessions accumulate tokens.

To prevent this:

/clear

Then reload context:

Load project context from /docs and follow rules.md.

---

# 🎯 Request Small, Focused Tasks

Always ask Claude to perform **small, precise actions**.

Good example:

Create the feed consumption API.

Bad example:

Build the entire farm management backend.

Large tasks dramatically increase token consumption.

---

# 🧩 Modify Only What Is Necessary

When updating code, reference specific files or functions.

Good example:

Update production.service.ts to calculate laying rate.

Bad example:

Rewrite the production module.

This prevents Claude from analyzing unnecessary parts of the project.

---

# 📦 Return Only Code

Avoid explanations when they are not needed.

Always include:

Return only code.

This significantly reduces output tokens.

---

# 🔁 Avoid Repeating Project Context

Do not resend product descriptions, architecture explanations, or feature lists.

Instead reference documentation.

Bad example:

Build a SaaS for egg farmers that manages production, feed, mortality, finance, customers, sales, and tasks.

Good example:

Read project context from /docs and implement the production module.

---

# 🪜 Break Work Into Small Steps

Large tasks generate large responses.

Instead of:

Create the entire dashboard.

Use:

Create KPI cards for the dashboard.

Then:

Create the dashboard layout.

Then:

Create dashboard charts.

This dramatically reduces token usage.

---

# ♻️ Reuse Existing Components

Encourage reuse of UI and logic components.

Example:

Use existing KPI card components for the dashboard.

Avoid generating duplicate UI structures.

---

# ⚙️ Avoid Overengineering

Prefer simple implementations.

Complex architectures increase token usage and development time.

---

# 📌 Efficient Prompt Pattern

Use this structure for most requests:

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

# 🎯 Development Goal

Maintain efficient Claude sessions with minimal token usage while producing clean, modular, production-ready code.