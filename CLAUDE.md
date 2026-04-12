<!-- GSD:project-start source:PROJECT.md -->
## Project

**Granja Pro**

Granja Pro is a SaaS farm management platform for poultry egg producers. It serves as the daily control center of the farm — helping small and medium egg farmers monitor production, track feed and mortality, manage finances, and make better operational decisions. Mobile-first, designed for smartphone use in farm environments.

**Core Value:** Help egg farmers simplify daily farm management and improve financial control — the platform must be fast, intuitive, and useful every single day.

### Constraints

- **Tech stack**: Next.js + Supabase only, no custom backend server
- **UI rule**: Do not change existing UI designs — only add missing functionality and fix data integration
- **Security**: All data access must be protected by Supabase RLS, each farm sees only its own data
- **Charts**: All charts must use Recharts
- **Simplicity**: Avoid overengineering, prefer minimal implementations
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 5.x - All source code and configuration
- JavaScript (ES2017+) - Runtime and build scripts
## Runtime
- Node.js (version not specified in package.json)
- npm - Lockfile: present (package-lock.json implied)
## Frameworks
- Next.js 15.5.14 - Full-stack React framework with API routes and SSR
- React 19.0.0 - UI library
- React DOM 19.0.0 - DOM rendering
- Not detected - No test framework configured
- TypeScript 5.x - Type checking
- ESLint 8.x - Linting via `eslint-config-next`
- PostCSS 8.x - CSS processing
- Autoprefixer 10.4.27 - Vendor prefixes for CSS
## Key Dependencies
- `@supabase/supabase-js` 2.99.3 - Database and authentication client
- `@supabase/ssr` 0.9.0 - Supabase server-side rendering support
- `@anthropic-ai/sdk` 0.80.0 - Claude AI integration for diagnostic features
- `@radix-ui/react-checkbox` 1.1.2 - Accessible checkbox component
- `@radix-ui/react-progress` 1.1.0 - Progress bar component
- `@radix-ui/react-slot` 1.1.0 - Slot composition primitive
- `lucide-react` 0.460.0 - Icon library
- `class-variance-authority` 0.7.1 - CSS class composition utility
- `clsx` 2.1.1 - Conditional CSS class utility
- `tailwind-merge` 2.5.4 - Tailwind CSS class merging
- `tailwindcss` 3.4.1 - Utility-first CSS framework
- `tailwindcss-animate` 1.0.7 - Tailwind animation utilities
- `recharts` 3.8.0 - React charting library for production/mortality/feed analytics
- `jspdf` 4.2.1 - PDF generation for reports
- `jspdf-autotable` 5.0.7 - PDF table formatting for reports
- `exceljs` 4.4.0 - Excel spreadsheet generation
- `xlsx` 0.18.5 - Spreadsheet read/write utilities
- `file-saver` 2.0.5 - Client-side file download handling
- `@types/file-saver` 2.0.7 - TypeScript definitions for file-saver
## Configuration
- `.env.local` file present - Contains environment configuration
- Required vars (based on code inspection):
- `tsconfig.json` - TypeScript compilation settings with `@/*` path alias
- `next.config.ts` - Next.js configuration (minimal, React strict mode enabled)
- `middleware.ts` - Request middleware for authentication and session management
- No `.eslintrc` or `.prettierrc` detected - Using Next.js default linting configuration
## Platform Requirements
- Node.js (version unspecified)
- npm or equivalent package manager
- TypeScript 5.x for compilation
- Node.js runtime compatible with Next.js 15.5.14
- Supabase project URL and API keys
- Anthropic API key for AI features
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- Components: kebab-case (e.g., `alerts-panel.tsx`, `barns-overview.tsx`, `kpi-card.tsx`)
- Utilities: kebab-case (e.g., `date-filter-context.tsx`, `mobile-nav.tsx`)
- API routes: kebab-case within route directories (e.g., `app/api/ai/route.ts`)
- Configuration files: kebab-case with dots (e.g., `.eslintrc`, `tsconfig.json`)
- Regular functions: camelCase (e.g., `formatNumber`, `formatCurrency`, `formatPercent`)
- React components: PascalCase (e.g., `Button`, `Card`, `KpiCard`, `AuthProvider`)
- Custom hooks: camelCase with "use" prefix (e.g., `useAuth`, `useDateFilter`)
- Event handlers: camelCase with descriptive action (e.g., `setFilterMode`, `setCollapsed`)
- State variables: camelCase (e.g., `farmData`, `productionData`, `dataLoaded`)
- Constants: camelCase (e.g., `quickActions`, `setupAlerts`, `sidebarNav`)
- Type discriminators: camelCase (e.g., `filterMode`, `activeTab`, `roleName`)
- Interfaces: PascalCase (e.g., `AuthContextType`, `KpiCardProps`, `BadgeProps`, `ProfileSettingsProps`)
- Type unions: PascalCase (e.g., `TrendDirection`, `FilterMode`, `Tab`)
- Generic types: PascalCase (e.g., `WeeklyDataPoint`)
## Code Style
- Enforced by ESLint (Next.js default config)
- No explicit Prettier config found - uses Next.js conventions
- Consistent spacing: 2-space indentation (observed in all files)
- Line length: No hard limit observed, pragmatic wrapping for readability
- Tool: ESLint 8.x with Next.js config
- Config: `eslint-config-next` 15.0.3
- Run command: `npm run lint` (Next.js default lint)
- TypeScript strict mode enabled in `tsconfig.json`
- Always present at statement ends (consistent throughout codebase)
- Double quotes for strings (`"use client"`, `"string"`)
- Single quotes not used in codebase
## Import Organization
- `@/*` maps to project root (configured in `tsconfig.json`)
- Used consistently: `@/lib/utils`, `@/components/ui/card`, `@/lib/supabase/client`
- Use `import type` for TypeScript-only imports (observed: `import type { VariantProps }`, `import type { Tables }`)
## Error Handling
- Try-catch blocks in async contexts: Used in auth-provider and API routes
- Error logging: `console.error()` with descriptive messages (e.g., `console.error("Error loading user data:", err)`)
- Graceful degradation: Set default state on error, continue execution
- User feedback: Modal portals and alerts for user-facing errors
## Logging
- Error logging: `console.error()` with context
- No info/debug logging observed - errors only
- Errors include descriptive messages and caught exception objects
- Location: Primarily in async/await handlers and API routes
## Comments
- Section dividers: `/* ── Section Name ── */` pattern (observed in dashboard pages)
- Inline explanations: Minimal, only when logic is non-obvious
- Example: `// Real data state — start empty, filled by Supabase fetch`
- Not used in this codebase
- Types are expressed through TypeScript interfaces and type annotations
## Function Design
- Small utility functions: 1-3 lines (e.g., `formatNumber`, `formatCurrency`)
- Components: Varies 20-200+ lines depending on complexity
- Page components: Large due to inline state and logic
- Destructuring preferred for objects: `{ title, value, icon }` from props
- Type annotations always present for non-trivial parameters
- Optional parameters use TypeScript `?:` syntax
- Components return JSX
- Utilities return typed values (strings, numbers, objects)
- Async functions return Promises with typed resolution
- Context hooks return object with `{ value, error, loading }` pattern
## Module Design
- Named exports preferred for utilities and components
- Default exports used for Next.js pages
- Component composition with subcomponents (Card, CardHeader, CardTitle, CardContent, CardFooter)
- Not used in this codebase
- Each component imported directly from its file
- Grouped exports from single file: `export { Card, CardHeader, CardTitle, CardContent, CardFooter }`
- All use `React.forwardRef` with `displayName` set for debugging
## React Patterns
- Marked with `"use client"` directive at top of file for client-side interactivity
- Used for state management, event handlers, context providers
- Default for layout files and pages without interactivity
- `app/layout.tsx` is server component
- Standard React hooks: `useState`, `useRef`, `useEffect`, `useMemo`, `useCallback`
- Custom hooks: `useAuth()`, `useDateFilter()`
- Context pattern: Create context, Provider component, use hook to access
- Not used; composition via props preferred
## Styling
- Utility-first classes directly in JSX
- Color tokens: `brand-*` custom colors, standard Tailwind colors (gray, amber, red, green, blue)
- Spacing: Tailwind defaults (4, 8, 12, 16, 20, 24, etc.)
- Responsive classes not heavily used (mobile-first approach implicit)
- `cn()` utility function (from `clsx` + `tailwind-merge`) for combining classes
- Ternary operators for variant selection
- Example: `className={cn("...", isWarning ? "bg-amber-50" : "bg-blue-50")}`
- Used for component variant definitions (`buttonVariants`, `badgeVariants`)
- Enables prop-based styling consistency
## Type Safety
- Strict mode enabled: `"strict": true` in `tsconfig.json`
- Target: ES2017
- Module: ESNext
- JSX handling: `"jsx": "preserve"` (Next.js transforms)
- Always present on function parameters and returns
- Props interfaces defined for all components
- Generic types used for context and hooks
- `as const` assertions used for discriminated unions (e.g., `type: "warning" as const`)
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Server-side authentication and session management via Supabase SSR middleware
- Client-side React components with server-side data fetching through service layer
- Multi-domain data model (farms, barns, flocks, production, finances, etc.)
- Real-time context providers for auth state and date filtering
- AI integration via Claude API for diagnostic analysis
- Domain-driven feature routes in the app directory
## Layers
- Purpose: Render UI and handle user interactions
- Location: `app/dashboard/*`, `app/(auth)/*`, `components/`
- Contains: Page components, layout files, reusable UI components
- Depends on: Context providers (auth, date filter), services layer, UI library (Radix, Tailwind)
- Used by: Browser clients directly
- Purpose: Orchestrate data and business logic for features
- Location: `app/dashboard/[feature]/page.tsx` files (production, racao, health, mortality, finances, etc.)
- Contains: Feature-specific state management, form handling, modal orchestration
- Depends on: Services layer, context providers, utility functions
- Used by: Presentation layer
- Purpose: Encapsulate Supabase queries and database operations
- Location: `lib/services/`
- Contains: Data access functions (CRUD operations on 14+ resource types)
- Depends on: Supabase client, database types
- Used by: Feature pages and components
- Purpose: Initialize Supabase client for browser context
- Location: `lib/supabase/client.ts`
- Contains: Singleton Supabase client instance
- Depends on: Supabase JS SDK
- Used by: Service layer
- Purpose: Server-side API endpoints for special operations
- Location: `app/api/`
- Contains: Claude AI chat endpoint with tiered response modes
- Depends on: Anthropic SDK, environment variables
- Used by: Frontend for AI features
- Purpose: Session management and request-level authentication
- Location: `middleware.ts`
- Contains: Supabase session update, route protection
- Depends on: Supabase SSR client
- Used by: Next.js runtime for all requests
- Purpose: Shell structure and navigation state
- Location: `app/layout.tsx`, `app/dashboard/layout.tsx`
- Contains: Root providers, sidebar navigation, authentication wrapper
- Depends on: Auth provider, child route components
- Used by: All pages in respective route groups
## Data Flow
- **Global context:** `AuthProvider` (user, profile, farm, auth status)
- **Feature context:** `DateFilterProvider` (active filter: "dia"|"intervalo"|"mes", computed dateRange)
- **Local state:** Each page component manages own forms, modals, lists
- **No Redux/Zustand:** Uses React context + useState for simplicity
## Key Abstractions
- Purpose: Encapsulate database operations behind simple function interfaces
- Examples: `lib/services/production.ts`, `lib/services/flocks.ts`, `lib/services/finances.ts`
- Pattern: Each service exports CRUD functions (get, create, update, delete) with consistent naming
- Benefit: Pages don't need to know Supabase query syntax; easy to mock for testing
- Purpose: Share expensive data (user, farm, date range) without prop drilling
- Examples: `AuthProvider` (root), `DateFilterProvider` (dashboard)
- Pattern: Custom context hook + Provider component wrapping sections of tree
- Benefit: Clean authentication flow; date filters shared across multiple pages
- Purpose: Manage inline forms and deletion confirmations without full page navigation
- Examples: Production registration modal, equipment edit modal
- Pattern: Local component state for `modal` (null|"add"|"edit"), form object state, ref for controlled inputs
- Benefit: User stays on page; no flash of navigation
- Purpose: Normalize date filtering across features (day/range/month)
- Location: `components/date-filter/date-filter-context.tsx`
- Pattern: Three filter modes map to computed `dateRange: { startDate, endDate }`
- Benefit: All feature pages query using same `{ startDate, endDate }` ISO format
## Entry Points
- Location: `app/page.tsx`
- Triggers: User lands on `/`
- Responsibilities: Marketing landing page with feature overview, call-to-action, FAQ
- Location: `app/(auth)/login/page.tsx`, `signup`, `forgot-password`
- Triggers: Unauthenticated user tries to access protected route
- Responsibilities: Credential collection, error handling, redirect to dashboard on success
- Location: `app/dashboard/layout.tsx`
- Triggers: Authenticated user navigates to `/dashboard` or child route
- Responsibilities: Auth check, sidebar rendering, layout, onboarding detection
- Location: `app/api/ai/route.ts`
- Triggers: Frontend sends POST with `{ messages, tier }`
- Responsibilities: Route to Claude model based on tier, stream response
## Error Handling
- Services throw on error from Supabase (no silent failures)
- Page components catch errors → set `error` state → render error alert
- Deletion operations confirm before executing; errors show in toast
- API routes return JSON with `{ error: "message" }` on 400/500
```typescript
```
## Cross-Cutting Concerns
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
