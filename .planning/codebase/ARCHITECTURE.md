# Architecture

**Analysis Date:** 2026-04-07

## Pattern Overview

**Overall:** Full-stack Next.js application with client-server separation and Supabase backend.

**Key Characteristics:**
- Server-side authentication and session management via Supabase SSR middleware
- Client-side React components with server-side data fetching through service layer
- Multi-domain data model (farms, barns, flocks, production, finances, etc.)
- Real-time context providers for auth state and date filtering
- AI integration via Claude API for diagnostic analysis
- Domain-driven feature routes in the app directory

## Layers

**Presentation Layer:**
- Purpose: Render UI and handle user interactions
- Location: `app/dashboard/*`, `app/(auth)/*`, `components/`
- Contains: Page components, layout files, reusable UI components
- Depends on: Context providers (auth, date filter), services layer, UI library (Radix, Tailwind)
- Used by: Browser clients directly

**Application/Feature Layer:**
- Purpose: Orchestrate data and business logic for features
- Location: `app/dashboard/[feature]/page.tsx` files (production, racao, health, mortality, finances, etc.)
- Contains: Feature-specific state management, form handling, modal orchestration
- Depends on: Services layer, context providers, utility functions
- Used by: Presentation layer

**Services Layer:**
- Purpose: Encapsulate Supabase queries and database operations
- Location: `lib/services/`
- Contains: Data access functions (CRUD operations on 14+ resource types)
- Depends on: Supabase client, database types
- Used by: Feature pages and components

**Client/Browser Layer:**
- Purpose: Initialize Supabase client for browser context
- Location: `lib/supabase/client.ts`
- Contains: Singleton Supabase client instance
- Depends on: Supabase JS SDK
- Used by: Service layer

**API Routes Layer:**
- Purpose: Server-side API endpoints for special operations
- Location: `app/api/`
- Contains: Claude AI chat endpoint with tiered response modes
- Depends on: Anthropic SDK, environment variables
- Used by: Frontend for AI features

**Middleware Layer:**
- Purpose: Session management and request-level authentication
- Location: `proxy.ts`
- Contains: Supabase session update, route protection
- Depends on: Supabase SSR client
- Used by: Next.js runtime for all requests

**Layout/Navigation Layer:**
- Purpose: Shell structure and navigation state
- Location: `app/layout.tsx`, `app/dashboard/layout.tsx`
- Contains: Root providers, sidebar navigation, authentication wrapper
- Depends on: Auth provider, child route components
- Used by: All pages in respective route groups

## Data Flow

**Authentication Flow:**

1. Unauthenticated user → redirected to `/login` by middleware
2. User enters credentials and submits
3. Supabase auth endpoint processes login
4. Session stored in httpOnly cookies via SSR
5. Middleware updates session on subsequent requests
6. AuthProvider (in root layout) loads user + profile + farm data
7. Dashboard layout uses auth context to protect routes

**Feature Data Flow (e.g., Production page):**

1. User navigates to `/dashboard/production`
2. Page component loads and calls `fetchData()` via `createClient()`
3. Service functions (`getTodayProduction`, `getProductionByDateRange`) query Supabase
4. Data state updated → component re-renders
5. DateFilterProvider provides active date range
6. Charts render with production trends
7. User submits form → `createProduction()` calls service → database updated

**State Management:**

- **Global context:** `AuthProvider` (user, profile, farm, auth status)
- **Feature context:** `DateFilterProvider` (active filter: "dia"|"intervalo"|"mes", computed dateRange)
- **Local state:** Each page component manages own forms, modals, lists
- **No Redux/Zustand:** Uses React context + useState for simplicity

## Key Abstractions

**Service Abstraction:**
- Purpose: Encapsulate database operations behind simple function interfaces
- Examples: `lib/services/production.ts`, `lib/services/flocks.ts`, `lib/services/finances.ts`
- Pattern: Each service exports CRUD functions (get, create, update, delete) with consistent naming
- Benefit: Pages don't need to know Supabase query syntax; easy to mock for testing

**Context Providers:**
- Purpose: Share expensive data (user, farm, date range) without prop drilling
- Examples: `AuthProvider` (root), `DateFilterProvider` (dashboard)
- Pattern: Custom context hook + Provider component wrapping sections of tree
- Benefit: Clean authentication flow; date filters shared across multiple pages

**Modal/Form Pattern:**
- Purpose: Manage inline forms and deletion confirmations without full page navigation
- Examples: Production registration modal, equipment edit modal
- Pattern: Local component state for `modal` (null|"add"|"edit"), form object state, ref for controlled inputs
- Benefit: User stays on page; no flash of navigation

**Date Range Abstraction:**
- Purpose: Normalize date filtering across features (day/range/month)
- Location: `components/date-filter/date-filter-context.tsx`
- Pattern: Three filter modes map to computed `dateRange: { startDate, endDate }`
- Benefit: All feature pages query using same `{ startDate, endDate }` ISO format

## Entry Points

**Web (Browser):**
- Location: `app/page.tsx`
- Triggers: User lands on `/`
- Responsibilities: Marketing landing page with feature overview, call-to-action, FAQ

**Authentication:**
- Location: `app/(auth)/login/page.tsx`, `signup`, `forgot-password`
- Triggers: Unauthenticated user tries to access protected route
- Responsibilities: Credential collection, error handling, redirect to dashboard on success

**Dashboard Shell:**
- Location: `app/dashboard/layout.tsx`
- Triggers: Authenticated user navigates to `/dashboard` or child route
- Responsibilities: Auth check, sidebar rendering, layout, onboarding detection

**API (Server):**
- Location: `app/api/ai/route.ts`
- Triggers: Frontend sends POST with `{ messages, tier }`
- Responsibilities: Route to Claude model based on tier, stream response

## Error Handling

**Strategy:** Try-catch in service layer; error state in components; user-facing toast/alert messages.

**Patterns:**
- Services throw on error from Supabase (no silent failures)
- Page components catch errors → set `error` state → render error alert
- Deletion operations confirm before executing; errors show in toast
- API routes return JSON with `{ error: "message" }` on 400/500

**Example:**
```typescript
const fetchData = useCallback(async () => {
  try {
    setLoading(true);
    const data = await getTodayProduction(farm.id);
    setRegistros(data);
    setError("");
  } catch (err) {
    setError("Erro ao carregar produção");
  } finally {
    setLoading(false);
  }
}, [farm?.id]);
```

## Cross-Cutting Concerns

**Logging:** `console.log/error` for debugging; no structured logging library.

**Validation:** Client-side HTML5 validation on forms; backend validation in Supabase RLS policies (assumed).

**Authentication:** Supabase auth handles passwords, session, OAuth. AuthProvider syncs user state in React.

**Date Formatting:** `toISOString().split("T")[0]` for YYYY-MM-DD strings. Displayed via locale-specific formatting in UI.

**Number Formatting:** `formatNumber()` for integers (pt-BR locale), `formatCurrency()` for BRL, `formatPercent()` for percentages.

**AI Integration:** Tiered responses (simple/detailed/diagnostic) via prompt injection in `TIER_PROMPTS` object.

---

*Architecture analysis: 2026-04-07*
