# Testing Patterns

**Analysis Date:** 2026-04-07

## Test Framework

**Status:** No testing framework configured

**Runner:**
- Not detected
- No Jest, Vitest, or other test runner installed

**Assertion Library:**
- Not detected
- No testing library dependencies found

**Run Commands:**
- No test commands in `package.json`
- `npm run lint` available (ESLint only)

## Test File Organization

**Location:**
- Not applicable - no tests present
- No `.test.ts`, `.test.tsx`, `.spec.ts`, or `.spec.tsx` files found in codebase

**Naming Convention:**
- Standard convention would be: `[component].test.tsx` or `[component].spec.tsx`
- Not currently in use

**Test Structure:**
- No test directories present
- Potential locations for future tests:
  - Co-located with components: `components/ui/button.test.tsx`
  - Separate test directory: `__tests__/components/`

## Test Types

**Unit Tests:**
- Not implemented
- Candidates for testing: Utility functions in `lib/utils.ts`, component rendering logic

**Integration Tests:**
- Not implemented
- Candidates: Auth provider context, date filter context, Supabase interactions

**E2E Tests:**
- Not implemented
- No Cypress, Playwright, or other E2E framework installed

## Current Testing Approach

**Manual Testing:**
- Primary approach appears to be manual/live testing
- Component development in Next.js with hot reload (`npm run dev`)
- Browser-based testing of UI and interactions

**Type Safety as Testing:**
- TypeScript strict mode enabled (`"strict": true` in `tsconfig.json`)
- Strong typing reduces runtime errors
- Type checking via `npm run build`

## Mock Data Strategy

**Location:** `lib/mock-data.ts`

**Pattern:**
- Centralized mock data exports for dashboard development
- Separate constants for each domain:
  - `mockFarm` - Farm/granja metadata
  - `mockTodayProduction` - Daily egg production metrics
  - `mockTodayFeed` - Feed consumption and costs
  - `mockTodayMortality` - Bird mortality data
  - `mockMonthFinancial` - Monthly financial summary
  - `mockTasks` - Task list with status
  - `mockAlerts` - Alert/notification items
  - `mockProductionTrend` - 7-day production trend chart data
  - `mockBarns` - Barn/galpão inventory

**Usage Example (from `components/dashboard/alerts-panel.tsx`):**
```typescript
import { mockAlerts } from "@/lib/mock-data";

export function AlertsPanel() {
  if (mockAlerts.length === 0) return null;
  
  return (
    <div className="space-y-2">
      {mockAlerts.map((alert) => (
        // Render alert
      ))}
    </div>
  );
}
```

**Data Structure Pattern (from `lib/mock-data.ts`):**
```typescript
export const mockAlerts = [
  {
    id: 1,
    type: "warning" as const,
    message: "Taxa de postura abaixo da média no Galpão 2",
    time: "08:15",
  },
  // ...
];
```

## Potential Testing Approach

### Recommended Testing Stack

For future test implementation, recommended approach:

**Testing Framework:** Vitest
- Reason: Modern, fast, excellent TypeScript support, ESM-first
- Configuration location: `vitest.config.ts`

**React Testing Library**
- For component testing
- Installed alongside Vitest

**Setup:**

```json
{
  "devDependencies": {
    "vitest": "^latest",
    "@testing-library/react": "^latest",
    "@testing-library/jest-dom": "^latest",
    "@testing-library/user-event": "^latest",
    "jsdom": "^latest"
  }
}
```

**Test Configuration (future `vitest.config.ts`):**

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
  },
});
```

### Suggested Test File Structure

**For utilities (lib/utils.ts):**

```typescript
import { describe, it, expect } from 'vitest';
import { formatNumber, formatCurrency, formatPercent } from '@/lib/utils';

describe('Format Utilities', () => {
  describe('formatNumber', () => {
    it('should format number with pt-BR locale', () => {
      expect(formatNumber(15000)).toBe('15.000');
    });
  });

  describe('formatCurrency', () => {
    it('should format as BRL currency', () => {
      expect(formatCurrency(1350)).toBe('R$ 1.350,00');
    });
  });

  describe('formatPercent', () => {
    it('should format percent with one decimal', () => {
      expect(formatPercent(88)).toBe('88.0%');
    });
  });
});
```

**For components (components/ui/button.test.tsx):**

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/button';

describe('Button Component', () => {
  it('should render with default variant', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toHaveClass('bg-brand-600');
  });

  it('should handle click events', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    
    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('should apply outline variant styling', () => {
    render(<Button variant="outline">Outlined</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('border-brand-600');
  });
});
```

**For context (components/auth/auth-provider.test.tsx):**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/components/auth/auth-provider';

describe('AuthProvider', () => {
  it('should provide auth context', async () => {
    function TestComponent() {
      const { user, loading } = useAuth();
      if (loading) return <div>Loading...</div>;
      return <div>{user ? 'Logged in' : 'Logged out'}</div>;
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/logged (in|out)/)).toBeInTheDocument();
    });
  });
});
```

## Coverage

**Current State:** No coverage measurement tooling

**Recommendation for Future:**

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

**Coverage Configuration:**

```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['lib/**/*.ts', 'components/**/*.tsx'],
      exclude: ['node_modules', '.next'],
      lines: 70,
      functions: 70,
      branches: 70,
      statements: 70,
    },
  },
});
```

## Testing Considerations for Codebase

### Areas Needing Tests

**High Priority:**
1. **Authentication Context (`components/auth/auth-provider.tsx`)**
   - User session initialization
   - Farm data loading
   - Sign out flow
   - Profile refresh
   
2. **Date Filter Context (`components/date-filter/date-filter-context.tsx`)**
   - Filter mode transitions (dia → intervalo → mes)
   - Date range calculations
   - ISO date string generation
   
3. **Utility Functions (`lib/utils.ts`)**
   - `formatNumber` with pt-BR locale
   - `formatCurrency` with BRL conversion
   - `formatPercent` decimal handling
   - `cn()` class merging

**Medium Priority:**
4. **UI Components**
   - Button variants and sizes
   - Card component composition
   - Badge variants
   - Progress bar value display

5. **API Routes**
   - `app/api/ai/route.ts` message validation
   - Model selection by tier
   - Stream response handling

**Lower Priority:**
6. **Dashboard components** (integration-heavy, harder to test in isolation)

### Mocking Strategy

**What to Mock:**
- Supabase client and database queries
- Next.js router and navigation
- Authentication state (via `useAuth` hook)
- External APIs (Anthropic SDK)
- File system operations

**What NOT to Mock:**
- Utility functions (test real behavior)
- React hooks (test with full context)
- Tailwind CSS classes (integration tests only)
- Component rendering (test actual JSX)

**Example Mocking Pattern:**

```typescript
import { vi } from 'vitest';

// Mock Supabase
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: mockProfile }),
        })),
      })),
    })),
    auth: {
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(),
      signOut: vi.fn(),
    },
  })),
}));

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    pathname: '/dashboard',
  }),
  usePathname: () => '/dashboard',
}));
```

## Performance Testing

**Not Implemented:**

Recommendations for future:

```typescript
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import DashboardPage from '@/app/dashboard/page';

describe('Dashboard Performance', () => {
  it('should render in < 1s with large data set', () => {
    const startTime = performance.now();
    render(<DashboardPage />);
    const endTime = performance.now();
    
    expect(endTime - startTime).toBeLessThan(1000);
  });
});
```

---

*Testing analysis: 2026-04-07*
