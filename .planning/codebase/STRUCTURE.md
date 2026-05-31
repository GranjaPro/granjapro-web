# Codebase Structure

**Analysis Date:** 2026-04-07

## Directory Layout

```
GranjaPro/
├── app/                          # Next.js app directory (routes)
│   ├── (auth)/                   # Route group for auth pages
│   │   ├── login/
│   │   ├── signup/
│   │   ├── forgot-password/
│   │   └── layout.tsx
│   ├── api/                      # API routes
│   │   └── ai/
│   │       └── route.ts          # Claude AI endpoint
│   ├── auth/                     # Auth callback routes
│   │   ├── callback/
│   │   └── confirm/
│   ├── dashboard/                # Main application
│   │   ├── ai/                   # AI assistant feature
│   │   ├── barns/                # Barn management
│   │   ├── customers/            # Customer management
│   │   ├── equipment/            # Equipment tracking
│   │   ├── finances/             # Financial tracking
│   │   ├── flocks/               # Flock management (with detailed sub-routes)
│   │   ├── health/               # Health monitoring
│   │   ├── inventory/            # Inventory management
│   │   ├── mortality/            # Mortality tracking
│   │   ├── onboarding/           # First-time setup
│   │   ├── production/           # Egg production tracking (with history)
│   │   ├── racao/                # Feed tracking
│   │   ├── reports/              # Report generation
│   │   ├── sales/                # Sales management
│   │   ├── workers/              # Employee management
│   │   ├── layout.tsx            # Dashboard shell (sidebar, nav)
│   │   └── page.tsx              # Main dashboard home
│   ├── politica-de-privacidade/  # Legal page
│   ├── termos-de-uso/            # Legal page
│   ├── layout.tsx                # Root layout (auth provider)
│   ├── page.tsx                  # Landing page
│   └── globals.css               # Global styles
│
├── components/                   # Reusable React components
│   ├── auth/
│   │   └── auth-provider.tsx     # Global auth context
│   ├── dashboard/                # Dashboard-specific components
│   │   ├── alerts-panel.tsx
│   │   ├── barns-overview.tsx
│   │   ├── financial-summary.tsx
│   │   ├── kpi-card.tsx
│   │   ├── production-trend.tsx
│   │   ├── profile-settings.tsx
│   │   ├── quick-actions.tsx
│   │   └── tasks-checklist.tsx
│   ├── date-filter/              # Date range filtering
│   │   ├── calendar-filter.tsx
│   │   └── date-filter-context.tsx
│   ├── layout/
│   │   └── mobile-nav.tsx
│   └── ui/                       # Radix-based primitive components
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── modal-portal.tsx
│       ├── progress.tsx
│       └── [other primitives]
│
├── lib/                          # Shared logic and utilities
│   ├── services/                 # Data access layer
│   │   ├── index.ts              # Barrel export of all services
│   │   ├── alerts.ts             # Alert CRUD
│   │   ├── barns.ts              # Barn CRUD
│   │   ├── customers.ts          # Customer CRUD
│   │   ├── equipment.ts          # Equipment CRUD
│   │   ├── farms.ts              # Farm CRUD
│   │   ├── feed.ts               # Feed/Ração CRUD
│   │   ├── finances.ts           # Financial transaction CRUD
│   │   ├── flocks.ts             # Flock CRUD
│   │   ├── health.ts             # Health record CRUD
│   │   ├── inventory.ts          # Inventory CRUD
│   │   ├── mortality.ts          # Mortality record CRUD
│   │   ├── production.ts         # Egg production CRUD
│   │   ├── sales.ts              # Sales CRUD
│   │   ├── tasks.ts              # Task CRUD
│   │   └── workers.ts            # Worker CRUD
│   ├── supabase/
│   │   ├── client.ts             # Browser Supabase client (singleton)
│   │   └── middleware.ts         # Session middleware (server-side)
│   ├── database.types.ts         # Supabase-generated database types
│   ├── mock-data.ts              # Sample/fixture data for development
│   └── utils.ts                  # Formatting utilities (cn, formatNumber, formatCurrency)
│
├── public/                       # Static assets
│   ├── assets/
│   │   └── images/
│   ├── images/
│   └── manifest.json             # PWA manifest
│
├── supabase/                     # Supabase configuration
│   └── migrations/               # Database migration files
│
├── docs/                         # Documentation
├── proxy.ts                      # Next.js proxy entry point (middleware)
├── tsconfig.json                 # TypeScript config
├── tailwind.config.ts            # Tailwind CSS config
├── next.config.ts                # Next.js config
├── postcss.config.mjs            # PostCSS config
├── package.json                  # Dependencies and scripts
└── .env.local                    # Environment variables (secrets)
```

## Directory Purposes

**app/**
- Purpose: Next.js App Router source directory; defines routes and layouts
- Contains: Page components (.tsx), layout.tsx files, route groups in parentheses
- Key files: `layout.tsx`, `page.tsx` at each level define structure

**app/dashboard/[feature]/**
- Purpose: Individual feature pages for farm management
- Contains: Feature-specific page.tsx, modal logic, data fetching hooks
- Key files: Each has `page.tsx` with CRUD UI (e.g., production/page.tsx)

**components/auth/**
- Purpose: Authentication-related components
- Contains: AuthProvider context, login/signup form components
- Key files: `auth-provider.tsx` - root context for user/profile/farm state

**components/dashboard/**
- Purpose: Reusable dashboard widgets and panels
- Contains: KPI cards, charts, quick actions, alerts
- Key files: Components imported by dashboard/page.tsx and feature pages

**components/date-filter/**
- Purpose: Date range filtering UI and state management
- Contains: Calendar picker, filter mode selector, context provider
- Key files: `date-filter-context.tsx` - provides `{ dateRange, filterMode, setFilterMode }`

**components/ui/**
- Purpose: Primitive UI components (buttons, cards, badges)
- Contains: Radix-based wrappers with Tailwind styling
- Key files: Used throughout; follow shadcn/ui pattern

**lib/services/**
- Purpose: Data access abstraction layer for Supabase
- Contains: 14 resource type service modules
- Key files: Each exports CRUD functions with consistent naming pattern
- Pattern: `get*()`, `create*()`, `update*()`, `delete*()`

**lib/supabase/**
- Purpose: Supabase client initialization and session management
- Contains: Browser client singleton, SSR middleware
- Key files: `client.ts` used by all services; `middleware.ts` used by Next.js runtime

**public/**
- Purpose: Static files served at root
- Contains: Images, manifest.json, favicon (implicitly)
- Key files: `manifest.json` for PWA; images in `/assets` and `/images`

## Key File Locations

**Entry Points:**

| Purpose | File Path |
|---------|-----------|
| Landing page | `app/page.tsx` |
| Auth layout | `app/(auth)/layout.tsx` |
| Login page | `app/(auth)/login/page.tsx` |
| Dashboard shell | `app/dashboard/layout.tsx` |
| Dashboard home | `app/dashboard/page.tsx` |
| AI chat API | `app/api/ai/route.ts` |

**Configuration:**

| File | Purpose |
|------|---------|
| `tsconfig.json` | TypeScript compiler options; path alias `@/*` → root |
| `tailwind.config.ts` | Tailwind CSS themes, colors, plugins |
| `next.config.ts` | Next.js build config |
| `postcss.config.mjs` | CSS processing (Tailwind, autoprefixer) |
| `middleware.ts` | Request middleware for auth and sessions |
| `package.json` | Dependencies and build scripts |

**Core Logic:**

| File | Purpose |
|------|---------|
| `lib/services/index.ts` | Barrel export of all 14 services |
| `lib/supabase/client.ts` | Singleton Supabase browser client |
| `lib/supabase/middleware.ts` | Session refresh and route protection |
| `lib/database.types.ts` | Supabase-generated TypeScript types |
| `lib/utils.ts` | Formatting and utility functions |

**Styling:**

| File | Purpose |
|------|---------|
| `app/globals.css` | Root CSS with Tailwind directives |
| `tailwind.config.ts` | Color palette, fonts, custom utilities |
| `components/ui/` | Reusable styled components |

## Naming Conventions

**Files:**
- Pages: `page.tsx` (Next.js route convention)
- Layouts: `layout.tsx` (Next.js convention)
- API routes: `route.ts` in `app/api/` folders
- Components: PascalCase (e.g., `AuthProvider.tsx`, `ProductionTrend.tsx`)
- Services: lowercase with hyphens or camelCase matching resource (e.g., `production.ts`, `flocks.ts`)
- Utilities: lowercase with hyphens (e.g., `date-filter-context.tsx`)

**Directories:**
- Route folders: lowercase, kebab-case (e.g., `/dashboard/production`, `/auth/callback`)
- Feature folders: lowercase (e.g., `components/dashboard/`, `lib/services/`)
- Component groups: lowercase (e.g., `components/ui/`, `components/auth/`)
- Root abbreviations: `app/`, `lib/`, `components/`, `public/`, `supabase/`

**Exports:**
- Services: Named exports for each function (e.g., `export { getTodayProduction }`)
- Contexts: Default export of Provider component, named export of hook (e.g., `export function useAuth()`)
- Components: Default export of component
- Types: Defined inline or in separate `.types.ts` file if complex

## Where to Add New Code

**New Feature (e.g., expense tracking):**
1. Create service module: `lib/services/expenses.ts`
   - Export CRUD functions following pattern in `production.ts`
   - Add export to `lib/services/index.ts`
2. Create feature page: `app/dashboard/expenses/page.tsx`
   - Use `"use client"` directive
   - Import service functions and hook into `useAuth()`, `useDateFilter()`
   - Implement fetchData, modal orchestration, list/form rendering
3. Create feature component (if reusable): `components/dashboard/expenses-summary.tsx`
4. Add navigation link to sidebar in `app/dashboard/layout.tsx`

**New Component/Module:**
- Shared UI primitive → `components/ui/[component].tsx`
- Dashboard widget → `components/dashboard/[widget].tsx`
- Feature-specific logic → inline in `app/dashboard/[feature]/page.tsx` (prefer)
- Authentication UI → `components/auth/[component].tsx`
- Layout/navigation → `components/layout/[component].tsx`

**Utilities/Helpers:**
- Formatting (dates, numbers) → `lib/utils.ts`
- Service-level helpers → `lib/services/[resource].ts` (co-locate with related services)
- Type definitions → `lib/database.types.ts` (already generated from Supabase)
- Mocking/fixtures → `lib/mock-data.ts`

**Styling:**
- Global styles → `app/globals.css` (Tailwind directives only)
- Component styles → inline via `className` with Tailwind utilities
- CSS modules → not used (Tailwind + cn() utility preferred)
- Custom Tailwind → `tailwind.config.ts` (colors, fonts, animations)

## Special Directories

**app/dashboard/flocks/detalhes/[loteId]/**
- Purpose: Detail pages for individual flocks with nested sub-features
- Generated: No (routes defined at build time)
- Committed: Yes
- Structure: Dynamic route `[loteId]` with sub-routes for `mortalidade`, `producao`, `racao`, `saude`

**app/dashboard/production/historico/[loteId]/**
- Purpose: Production history for a specific flock
- Generated: No
- Committed: Yes
- Structure: Dynamic nested route under `/historico/`

**supabase/migrations/**
- Purpose: Database schema versions
- Generated: Yes (by Supabase CLI)
- Committed: Yes
- Notes: Run with `supabase migration up` during deployment

**supabase/.temp/**
- Purpose: Temporary Supabase local dev files
- Generated: Yes (by Supabase CLI)
- Committed: No (.gitignore'd)

**lib/database.types.ts**
- Purpose: TypeScript interfaces matching Supabase schema
- Generated: Yes (by `supabase gen types --local > lib/database.types.ts`)
- Committed: Yes
- Notes: Regenerate after migrations; import as `import type { Tables } from "@/lib/database.types"`

**public/**
- Purpose: Static assets (images, manifest)
- Generated: No (manually added)
- Committed: Yes
- Notes: Referenced as `/images/...` in code (Next.js serves from `/public`)

---

*Structure analysis: 2026-04-07*
