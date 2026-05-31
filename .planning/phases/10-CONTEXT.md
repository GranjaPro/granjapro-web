# Phase 10 Context: Route Guards & Permission States

## Implementation Strategy

### 1. Server-Side Route Guards (SEC-01)
- **Mechanism**: Use `lib/supabase/middleware.ts` (the central proxy for session/auth) to enforce plan requirements at the request level.
- **Logic**: 
    - Identify a list of protected routes (e.g., `/dashboard/workers`, `/dashboard/reports`).
    - Fetch the user's `plan` from the `profiles` table during the middleware execution (or use a cached session if available).
    - If the user attempts to access a Pro/Premium route with an `essencial` plan, redirect them.
- **Goal**: Prevent the page content and client-side scripts from loading entirely for unauthorized users.

### 2. Access Denied Experience (SEC-04)
- **Behavior**: Direct redirection to `/dashboard/select-plan`.
- **User Flow**: If a user clicks a locked sidebar link or tries a direct URL, they land on the plan selection page to encourage upgrading.

### 3. Database-Level Security (SEC-02)
- **Mechanism**: Update Supabase Row Level Security (RLS) policies.
- **Target**: The `workers` table (and potentially `reports` related tables if they exist).
- **Policy**: Add a check that verifies the authenticated user's profile plan is at least `pro` before allowing `SELECT`, `INSERT`, `UPDATE`, or `DELETE` operations.
- **Rationale**: Provides defense-in-depth, ensuring data remains private even if frontend/middleware guards are bypassed.

## Scope of Protected Routes
- `/dashboard/workers` (Requires `pro`)
- `/dashboard/reports` (Requires `pro`)

## Locked Decisions
- No AI-related guards or usage limits will be implemented in this phase (deferred).
- Redirection is the preferred "Access Denied" state.
- Middleware is the primary enforcement point for routes.
