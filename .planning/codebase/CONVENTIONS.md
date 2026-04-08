# Coding Conventions

**Analysis Date:** 2026-04-07

## Naming Patterns

**Files:**
- Components: kebab-case (e.g., `alerts-panel.tsx`, `barns-overview.tsx`, `kpi-card.tsx`)
- Utilities: kebab-case (e.g., `date-filter-context.tsx`, `mobile-nav.tsx`)
- API routes: kebab-case within route directories (e.g., `app/api/ai/route.ts`)
- Configuration files: kebab-case with dots (e.g., `.eslintrc`, `tsconfig.json`)

**Functions:**
- Regular functions: camelCase (e.g., `formatNumber`, `formatCurrency`, `formatPercent`)
- React components: PascalCase (e.g., `Button`, `Card`, `KpiCard`, `AuthProvider`)
- Custom hooks: camelCase with "use" prefix (e.g., `useAuth`, `useDateFilter`)
- Event handlers: camelCase with descriptive action (e.g., `setFilterMode`, `setCollapsed`)

**Variables:**
- State variables: camelCase (e.g., `farmData`, `productionData`, `dataLoaded`)
- Constants: camelCase (e.g., `quickActions`, `setupAlerts`, `sidebarNav`)
- Type discriminators: camelCase (e.g., `filterMode`, `activeTab`, `roleName`)

**Types:**
- Interfaces: PascalCase (e.g., `AuthContextType`, `KpiCardProps`, `BadgeProps`, `ProfileSettingsProps`)
- Type unions: PascalCase (e.g., `TrendDirection`, `FilterMode`, `Tab`)
- Generic types: PascalCase (e.g., `WeeklyDataPoint`)

## Code Style

**Formatting:**
- Enforced by ESLint (Next.js default config)
- No explicit Prettier config found - uses Next.js conventions
- Consistent spacing: 2-space indentation (observed in all files)
- Line length: No hard limit observed, pragmatic wrapping for readability

**Linting:**
- Tool: ESLint 8.x with Next.js config
- Config: `eslint-config-next` 15.0.3
- Run command: `npm run lint` (Next.js default lint)
- TypeScript strict mode enabled in `tsconfig.json`

**Semicolons:**
- Always present at statement ends (consistent throughout codebase)

**Quotes:**
- Double quotes for strings (`"use client"`, `"string"`)
- Single quotes not used in codebase

## Import Organization

**Order:**
1. React and Next.js built-ins (`import * as React from "react"`)
2. Next.js specific imports (`import { useAuth } from "@/components/auth/auth-provider"`, `import Link from "next/link"`)
3. Third-party libraries (`import { cva, type VariantProps } from "class-variance-authority"`)
4. Component/utility imports from `@/` alias
5. Lucide icon imports grouped separately (`import { Egg, Bird, Wheat... } from "lucide-react"`)

**Example from `components/ui/button.tsx`:**
```typescript
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
```

**Path Aliases:**
- `@/*` maps to project root (configured in `tsconfig.json`)
- Used consistently: `@/lib/utils`, `@/components/ui/card`, `@/lib/supabase/client`

**Type Imports:**
- Use `import type` for TypeScript-only imports (observed: `import type { VariantProps }`, `import type { Tables }`)

## Error Handling

**Patterns:**
- Try-catch blocks in async contexts: Used in auth-provider and API routes
- Error logging: `console.error()` with descriptive messages (e.g., `console.error("Error loading user data:", err)`)
- Graceful degradation: Set default state on error, continue execution
- User feedback: Modal portals and alerts for user-facing errors

**Example from `components/auth/auth-provider.tsx`:**
```typescript
try {
  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .single();
  setProfile(profileData);
} catch (err) {
  console.error("Error loading user data:", err);
}
```

**API Route Pattern (from `app/api/ai/route.ts`):**
```typescript
if (!messages || !Array.isArray(messages)) {
  return Response.json(
    { error: "Messages array is required" },
    { status: 400 }
  );
}
```

## Logging

**Framework:** `console` (native browser/Node.js)

**Patterns:**
- Error logging: `console.error()` with context
- No info/debug logging observed - errors only
- Errors include descriptive messages and caught exception objects
- Location: Primarily in async/await handlers and API routes

## Comments

**When to Comment:**
- Section dividers: `/* ── Section Name ── */` pattern (observed in dashboard pages)
- Inline explanations: Minimal, only when logic is non-obvious
- Example: `// Real data state — start empty, filled by Supabase fetch`

**JSDoc/TSDoc:**
- Not used in this codebase
- Types are expressed through TypeScript interfaces and type annotations

## Function Design

**Size:** 
- Small utility functions: 1-3 lines (e.g., `formatNumber`, `formatCurrency`)
- Components: Varies 20-200+ lines depending on complexity
- Page components: Large due to inline state and logic

**Parameters:**
- Destructuring preferred for objects: `{ title, value, icon }` from props
- Type annotations always present for non-trivial parameters
- Optional parameters use TypeScript `?:` syntax

**Return Values:**
- Components return JSX
- Utilities return typed values (strings, numbers, objects)
- Async functions return Promises with typed resolution
- Context hooks return object with `{ value, error, loading }` pattern

**Example from `lib/utils.ts`:**
```typescript
export function formatNumber(n: number): string {
  return n.toLocaleString("pt-BR");
}
```

## Module Design

**Exports:**
- Named exports preferred for utilities and components
- Default exports used for Next.js pages
- Component composition with subcomponents (Card, CardHeader, CardTitle, CardContent, CardFooter)

**Barrel Files:**
- Not used in this codebase
- Each component imported directly from its file

**Component Subcomponents:**
- Grouped exports from single file: `export { Card, CardHeader, CardTitle, CardContent, CardFooter }`
- All use `React.forwardRef` with `displayName` set for debugging

**Example from `components/ui/card.tsx`:**
```typescript
export { Card, CardHeader, CardTitle, CardContent, CardFooter };
```

## React Patterns

**Client Components:**
- Marked with `"use client"` directive at top of file for client-side interactivity
- Used for state management, event handlers, context providers

**Server Components:**
- Default for layout files and pages without interactivity
- `app/layout.tsx` is server component

**Hooks:**
- Standard React hooks: `useState`, `useRef`, `useEffect`, `useMemo`, `useCallback`
- Custom hooks: `useAuth()`, `useDateFilter()`
- Context pattern: Create context, Provider component, use hook to access

**Context Provider Pattern (from `components/auth/auth-provider.tsx`):**
```typescript
const AuthContext = createContext<AuthContextType>({...});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Provider implementation
  return <AuthContext.Provider value={...}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
```

**Higher-Order Components:**
- Not used; composition via props preferred

## Styling

**Framework:** Tailwind CSS with custom theme extension

**Patterns:**
- Utility-first classes directly in JSX
- Color tokens: `brand-*` custom colors, standard Tailwind colors (gray, amber, red, green, blue)
- Spacing: Tailwind defaults (4, 8, 12, 16, 20, 24, etc.)
- Responsive classes not heavily used (mobile-first approach implicit)

**Conditional Styling:**
- `cn()` utility function (from `clsx` + `tailwind-merge`) for combining classes
- Ternary operators for variant selection
- Example: `className={cn("...", isWarning ? "bg-amber-50" : "bg-blue-50")}`

**CVA (Class Variance Authority):**
- Used for component variant definitions (`buttonVariants`, `badgeVariants`)
- Enables prop-based styling consistency

**Example from `components/ui/button.tsx`:**
```typescript
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2...",
  {
    variants: {
      variant: {
        default: "bg-brand-600 text-white hover:bg-brand-700...",
        outline: "border border-brand-600...",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 px-3",
      },
    },
  }
);
```

## Type Safety

**TypeScript Configuration:**
- Strict mode enabled: `"strict": true` in `tsconfig.json`
- Target: ES2017
- Module: ESNext
- JSX handling: `"jsx": "preserve"` (Next.js transforms)

**Type Annotations:**
- Always present on function parameters and returns
- Props interfaces defined for all components
- Generic types used for context and hooks
- `as const` assertions used for discriminated unions (e.g., `type: "warning" as const`)

---

*Convention analysis: 2026-04-07*
