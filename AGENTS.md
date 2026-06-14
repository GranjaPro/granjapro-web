## Guidelines for AI Agents and Code Assistants

This file defines the fundamental rules of engagement for any Artificial Intelligence (AI) interacting with this repository. The goal is to keep the code clean, functional, and aligned with the "Get Shit Done" philosophy.

When working on this project, you MUST strictly follow the rules below:

#### 1. Reuse First (Don't Reinvent the Wheel)

- Before creating any new function, component, class, or file, analyze the existing codebase.

- Check if a solution, utility, or pattern is already implemented for the problem.

- The number one priority is always code reuse.

 #### 2. Ask, Don't Guess! (Zero Hallucination)

- If you identify gray areas, poorly explained requirements, lack of context, or ambiguities in my request:
STOP AND ASK!

- Ask clear and direct questions to clarify the doubt.

- Under no circumstances try to guess business rules or fill gaps with assumptions.

#### 3. Less Code is More Result (KISS / YAGNI)

- Focus on solving the current problem in the simplest and most direct way possible.

- Deliver the expected result by writing the smallest viable amount of code.

- Avoid over-engineering and premature abstractions. You aren't gonna need it (YAGNI).

#### 4. Sustainable Modularization

- Write modular and focused code.
- Functions and components must have a single responsibility (Single Responsibility Principle).

- If a file or function is growing too large, split it logically to facilitate maintenance and readability.

#### 5. Atomic Steps (Atomic Changes)

- Make one structural or logical change at a time.

- Do not rewrite entire files if the change is only in a specific function or snippet.

- Small, fast, and iterative changes allow for quick testing (GSD) and avoid breaking what is already working.
#### 6. Tests as a Contract

-The application's f unctionality is non-negotiable.

- If you change the logic of a file, update or create the corresponding test in the same iteration to ensure functionality is maintained.

- Do not deliver code that breaks existing tests.

#### 7. Zero Tolerance for any in TypeScript

- Never use the any type in TypeScript files.

- Always use static typing best practices.

- If types don't exist, create the necessary interfaces or types.

- Typing must be strict, predictable, and help document the code.

#### 8. Clean up unused code

- When finding declared but unused variables, remove them from the code.

### Clean Code

#### 1. Meaningful Names

- The name of a variable, function, or class should answer three big questions: why it exists, what it does, and how it is used.

- Avoid generic names ( data, info, manager, utils) or confusing abbreviations.

- If you need a comment to explain what a variable does, the name is wrong.

#### 2. Tiny and Single-Purpose Functions (Do One Thing)

- A function should do only ONE thing, do it well, and do only it (Single Responsibility Principle for functions).

- Keep the number of parameters as small as possible (ideally 0 to 2). If you need more, encapsulate them in an object.

- Separate commands from queries (Command Query Separation): a function should either change state or return information, never both.

#### 3. Code is the Primary Documentation

- Well-written code is self-explanatory. Avoid redundant comments or comments that explain "what" the code is doing.

- Use comments ONLY to explain the "why" (design decisions, complex business rules, or reasons for not following a pattern).

- Never leave commented-out (dead) code in the repository. Git serves as the history.

#### 4. Clean Error Handling

- Prefer throwing Exceptions rather than returning error codes or null.

- Do not pass null as an argument to functions and avoid returning null (use patterns like Null Object or Optional if applicable).

- Isolate error handling blocks from the main logic. Error handling is "one thing" that a function does.

### Clean Architecture

#### 1. The Dependency Rule

- Source code dependencies must ALWAYS point inward, toward higher-level business rules.

- Inner layers (Entities, Use Cases) cannot know absolutely anything about outer layers (UI, Database, Web Frameworks, external APIs).

#### 2. Strict Responsibility Layers

- Entities: Pure business rules (application agnostic).

- Use Cases: Orchestrate the flow of data to and from the application, using the Entities.

- Interface Adapters: Controllers, Presenters, and Gateways (Repositories) that convert data from the Core format to the Web/Database format and vice versa.

- Details (Frameworks & Drivers): Libraries, web routes, ORMs. Keep this layer as thin as possible.

#### 3. Frameworks and Databases are Details

- Your architecture should not depend on the existence of React, Express, NestJS, Postgres, or MongoDB.

- The application's "Core" (Use Cases and Entities) must be written in pure code and be completely isolated from external libraries.

- Treat the database and user interface as plug-ins that can be replaced at any time without affecting business rules.

#### 4. Dependency Inversion (DIP) and Absolute Testability

- The application Core must define Interfaces (Ports), and outer layers (like Database Repositories) must implement these interfaces (Adapters).

- Business rules must be 100% testable in isolation, without needing to boot up a web server, connect to a real database, or render a UI. Use mocks and stubs to inject dependencies in tests.