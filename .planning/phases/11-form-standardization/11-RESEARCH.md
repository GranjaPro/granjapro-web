# Phase 11: Form Standardization - Research

**Researched:** 2026-06-03
**Domain:** Form Management, Data Validation, UI Standardization
**Confidence:** HIGH

## Summary

This phase aims to modernize and unify the data entry layer of Granja Pro. Currently, forms are implemented with scattered `useState` hooks, manual validation, and inconsistent UI patterns. The research confirms that a combination of **React Hook Form (v7)** and **Zod (v4)** is the optimal stack for type-safe, performant, and maintainable forms.

The primary recommendation is to implement an **Atomic Form System** using `FormProvider`. This allows for a clean separation between form logic (Organisms) and UI components (Atoms/Molecules). We will also introduce a centralized Zod schema repository in `lib/schemas/` to ensure data consistency between the frontend and Supabase.

**Primary recommendation:** Use `react-hook-form` with `zodResolver` and a centralized `FormField` component that consumes form context.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Form State Management | Browser (Client) | — | Handled by React Hook Form in the client. |
| Input Validation | Browser (Client) | API (Supabase) | Client-side for UX (Zod); Server-side for security (RLS/Database constraints). |
| Notification Feedback | Browser (Client) | — | `react-toastify` handles global alerts. |
| Data Persistence | API (Supabase) | — | All forms eventually commit to Supabase services. |
| Navigation Protection | Browser (Client) | — | Blocking navigation with unsaved changes is a client-side routing concern. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react-hook-form` | 7.77.0 | Form state & lifecycle | Ecosystem leader for performance (uncontrolled) and DX. |
| `zod` | 4.4.3 | Schema validation | Single source of truth for types and validation; high performance in v4. |
| `@hookform/resolvers` | 5.4.0 | Glue between RHF & Zod | Official resolver for integrating Zod into React Hook Form. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|--------------|
| `react-toastify` | 11.1.0 | Global notifications | For success/error feedback after form submission. |
| `lucide-react` | 0.460.0 | Iconography | Standard icon set for inputs and feedback. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `react-hook-form` | Formik | Formik is older, uses controlled inputs by default (slower for large forms). |
| `zod` | Yup | Zod has better TypeScript integration and a more modern API. |
| `react-toastify` | `sonner` | Sonner is lighter, but Toastify is already decided in context [D-08]. |

**Installation:**
```bash
npm install react-hook-form zod @hookform/resolvers react-toastify
```

**Version verification:**
- `zod@4.4.3`: Verified stable (released July 2025). [VERIFIED: npm registry]
- `react-hook-form@7.77.0`: Current stable. [VERIFIED: npm registry]
- `react-toastify@11.1.0`: Current stable. [VERIFIED: npm registry]

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `zod` | npm | 6 yrs | 20M/wk | github.com/colinhacks/zod | [OK] | Approved |
| `react-hook-form` | npm | 6 yrs | 4M/wk | github.com/react-hook-form/react-hook-form | [OK] | Approved |
| `@hookform/resolvers` | npm | 5 yrs | 3M/wk | github.com/react-hook-form/resolvers | [OK] | Approved |
| `react-toastify` | npm | 8 yrs | 2M/wk | github.com/fkhadra/react-toastify | [OK] | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── ui/
│   │   ├── form-field.tsx   # Molecule: Label + Atom + Error
│   │   ├── input.tsx        # Atom: Pure input UI
│   │   ├── select.tsx       # Atom: Standardized select
│   │   └── checkbox.tsx     # Atom: Standardized checkbox
│   └── dashboard/           # Feature-based components [D-06]
│       ├── inventory/
│       ├── reports/
│       └── profile/
├── lib/
│   ├── schemas/             # Centralized Zod schemas [D-03]
│   │   ├── barn.ts
│   │   ├── inventory.ts
│   │   └── profile.ts
│   └── utils/
│       └── toast.ts         # Toastification helpers
└── hooks/
    └── use-form-guard.ts    # Dirty state / Navigation guard
```

### Pattern 1: Atomic Form Molecule (`FormField`)
**What:** A wrapper component that connects to `useFormContext` to display labels and errors automatically.
**When to use:** For every field in a standardized form.
**Example:**
```tsx
// components/ui/form-field.tsx
import { useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  className?: string;
}

export function FormField({ name, label, type = "text", placeholder, className }: FormFieldProps) {
  const { register, formState: { errors } } = useFormContext();
  const error = errors[name];

  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="text-xs font-semibold text-gray-600 dark:text-slate-400">
        {label}
      </label>
      <input
        {...register(name)}
        type={type}
        placeholder={placeholder}
        className={cn(
          "w-full border rounded-xl px-3.5 py-2.5 text-sm transition-all",
          error ? "border-red-500 ring-red-500/10" : "border-gray-200 focus:border-brand-500"
        )}
      />
      {error && (
        <p className="text-[11px] font-medium text-red-500">
          {error.message as string}
        </p>
      )}
    </div>
  );
}
```

### Pattern 2: Global Navigation Guard
**What:** Using the modern `Navigation API` (available in 2026) and `beforeunload` to prevent data loss.
**When to use:** On pages with complex forms (Barns, Inventory, Profile).
**Example:**
```tsx
// hooks/use-form-guard.ts
import { useEffect } from "react";

export function useFormGuard(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ""; 
    };

    const handleNavigate = (event: any) => {
      if (event.canIntercept && !window.confirm("Você tem alterações não salvas. Sair?")) {
        event.preventDefault();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    if (window.navigation) {
      window.navigation.addEventListener("navigate", handleNavigate);
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (window.navigation) {
        window.navigation.removeEventListener("navigate", handleNavigate);
      }
    };
  }, [isDirty]);
}
```

### Anti-Patterns to Avoid
- **Manual State Sync:** Do not use `useState` for each field; use `react-hook-form`'s `register` or `Controller`.
- **Inline Schemas:** Do not define Zod schemas inside components; keep them in `lib/schemas/` for reuse and testing.
- **Deep Prop Drilling:** Avoid passing `register` or `errors` down more than 2 levels; use `FormProvider`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Validation Logic | Manual if/else checks | Zod | Edge cases, type safety, reusable schemas. |
| Form State | Custom `useState` objects | React Hook Form | Performance (uncontrolled), built-in error handling. |
| Error Message Mapping | Custom error state | `zodResolver` | Automatically maps Zod issues to RHF error state. |

**Key insight:** React Hook Form's uncontrolled approach prevents re-renders on every keystroke, which is vital for the low-end smartphones often used on farms.

## Common Pitfalls

### Pitfall 1: Numeric Input Coercion
**What goes wrong:** HTML inputs return strings. Zod `.number()` fails if the input is `""` or `"10"`.
**Why it happens:** Zod expects the literal type `number`.
**How to avoid:** Use `z.coerce.number()` or `z.preprocess()` in schemas.

### Pitfall 2: Modal Close vs. Navigation
**What goes wrong:** Navigation guards often only catch URL changes, not Modal closes (X button or backdrop click).
**How to avoid:** The Modal's `onClose` function must explicitly check `form.formState.isDirty` and prompt the user.

## Code Examples

### Standard Zod Schema with Coercion
```typescript
// lib/schemas/barn.ts
import { z } from "zod";

export const barnSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  capacity: z.coerce.number().min(1, "Capacidade deve ser maior que zero"),
  status: z.enum(["active", "maintenance", "inactive"]),
  production_system: z.string().optional(),
});
```

### Integration with `react-toastify`
```typescript
// lib/utils/toast.ts
import { toast } from "react-toastify";

export const notify = {
  success: (msg: string) => toast.success(msg),
  error: (err: any) => {
    const message = typeof err === "string" ? err : err?.message || "Ocorreu um erro";
    toast.error(message);
  },
};
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-01 | Barn validation rules (name, capacity) | unit | `npx vitest lib/schemas/barn.test.ts` | ❌ Wave 0 |
| REQ-02 | Inventory validation rules | unit | `npx vitest lib/schemas/inventory.test.ts` | ❌ Wave 0 |

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes | Zod schemas enforce strict types, length, and formats. |

### Known Threat Patterns for Next.js/Supabase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via Input | Tampering | React auto-escapes, but Zod limits input length/content. |
| Malformed Data | Tampering | Zod ensures data strictly follows database schema before service calls. |

## Sources

### Primary (HIGH confidence)
- `zod` official docs - v4 features and coercion patterns.
- `react-hook-form` official docs - FormProvider and performance patterns.
- `react-toastify` official docs - Integration with Next.js App Router.

### Secondary (MEDIUM confidence)
- Web search results on "Next.js 16 navigation guards" - Community standards for 2026.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Libraries are mature and verified.
- Architecture: HIGH - Atomic design is a proven industry pattern.
- Pitfalls: MEDIUM - Coercion issues are common but manageable.

**Research date:** 2026-06-03
**Valid until:** 2026-07-03
