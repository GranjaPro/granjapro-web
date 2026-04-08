# Codebase Concerns

**Analysis Date:** 2026-04-07

## Tech Debt

**Overly Permissive Type System:**
- Issue: Heavy use of `Record<string, any>` throughout service layer prevents compile-time type safety and allows invalid data to be passed to database operations
- Files: 
  - `lib/services/flocks.ts` (lines 25, 36)
  - `lib/services/barns.ts` (lines 25, 36)
  - `lib/services/feed.ts` (lines 29, 40)
  - `lib/services/inventory.ts` (lines 14, 25)
  - `lib/services/alerts.ts` (similar pattern)
  - 29 instances total across all service files
- Impact: No validation of required fields before database operations, silent failures when wrong data types are passed, harder to debug data inconsistencies
- Fix approach: Replace `Record<string, any>` with proper interface types using database.types.ts. Create specific Insert/Update types for each entity matching Supabase schema definitions

**Missing Test Coverage:**
- Issue: Zero unit or integration tests in codebase
- Files: No test files found in `app/`, `lib/`, or `components/` directories
- Impact: Cannot safely refactor code, no regression protection, difficult to verify business logic correctness
- Fix approach: Add Jest/Vitest configuration, create test files co-located with source (e.g., `lib/services/__tests__/flocks.test.ts`), prioritize testing service layer and critical utility functions

**Console Logging for Debugging:**
- Issue: 39 instances of `console.log`, `console.error`, etc. scattered throughout production code for debugging
- Files: Multiple dashboard pages and components using console statements
- Impact: Logs clutter output, inconsistent error reporting, no structured logging, difficult to trace issues in production
- Fix approach: Implement structured logging utility (Winston or pino), replace all console calls with logging service, establish logging levels and patterns

## Known Bugs

**Floating Error States in Large Pages:**
- Symptoms: Dashboard pages with 20+ useState hooks have error handling via `catch { setDataLoaded(true); }` which silently swallows errors without user notification
- Files: 
  - `app/dashboard/page.tsx` (line 283: `} catch (err) { console.error(...); setDataLoaded(true); }`)
  - `app/dashboard/racao/page.tsx`
  - `app/dashboard/reports/page.tsx`
- Trigger: Any database query fails (network error, permission denied, row-level security violation)
- Workaround: User sees loading spinner forever or stale cached data, no error message shown
- Fix approach: Display error toast/modal to user, add error state to distinguish between "no data" and "load failed"

**Incomplete Error Context in API Route:**
- Symptoms: AI API route catches errors but only handles specific Anthropic errors, generic errors return 500 with message "Erro interno do assistente IA" without logging context
- Files: `app/api/ai/route.ts` (lines 138-157)
- Trigger: Non-Anthropic errors (invalid request JSON, missing system dependencies)
- Workaround: None - users see generic error, developer has no logs
- Fix approach: Log full error stack and request context before returning 500, add validation for request shape

## Security Considerations

**Hardcoded Farm Context in AI Prompts:**
- Risk: `BASE_CONTEXT` in AI route contains static mock farm data, not actual user farm data - AI responds with wrong numbers for every user
- Files: `app/api/ai/route.ts` (lines 8-18)
- Current mitigation: Static context means AI never leaks data between users (accidental safety), but also means AI is useless for personalized analysis
- Recommendations: Fetch actual farm data from Supabase in POST handler, include real metrics in system prompt, add tenant isolation to ensure AI queries include farm_id filters

**Public Supabase Keys in Environment Variables:**
- Risk: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` are intentionally public (by design), but require proper RLS policies to prevent unauthorized access
- Files: `lib/supabase/client.ts`, `lib/supabase/middleware.ts`
- Current mitigation: RLS policies should block unauthenticated access, but policies need audit
- Recommendations: Verify all tables have RLS enabled and policies verify `auth.uid()` matches `farm_id` owner, audit Supabase dashboard for policy configuration

**No Input Validation on Database Operations:**
- Risk: Service functions accept `Record<string, any>` and pass directly to Supabase, allowing injection of unvalidated fields
- Files: All files in `lib/services/`
- Current mitigation: Supabase RLS policies provide server-side protection, but client-side validation would catch mistakes earlier
- Recommendations: Add Zod or io-ts validators for Insert/Update operations, validate before calling service functions

**Missing CSRF Protection:**
- Risk: Mutation endpoints in dashboard pages don't appear to have CSRF tokens
- Files: Dashboard form submissions in pages like `app/dashboard/page.tsx`, `app/dashboard/racao/page.tsx`
- Current mitigation: Next.js middleware handles auth, but no explicit CSRF validation visible
- Recommendations: Audit form submissions, add CSRF token validation to mutation handlers if not present

## Performance Bottlenecks

**N+1 Queries Pattern in Dashboard Data Loading:**
- Problem: Dashboard page makes 6 parallel queries, then makes 3 MORE queries (customers, sales, inventory) to check setup status - 9 total queries for initial load
- Files: `app/dashboard/page.tsx` (lines 130-137, 245-248)
- Cause: No batching of related data, separate queries for each entity type, additional queries just to check if data exists
- Improvement path: 
  1. Use Supabase `.count('exact', { head: true })` to batch existence checks
  2. Combine related queries (e.g., fetch production + associated flock data in single join)
  3. Implement query result caching at React level with SWR or React Query

**Mega-Components with Heavy State Management:**
- Problem: Dashboard page (1,700 lines) and Ração page (1,844 lines) have 20+ useState hooks each, forcing full re-renders on any state change
- Files: 
  - `app/dashboard/page.tsx` (30 useState/useEffect calls)
  - `app/dashboard/racao/page.tsx` (23 useState/useEffect calls)
  - `app/dashboard/reports/page.tsx` (23 useState/useEffect calls)
- Cause: All state tightly coupled in single component, no memoization of expensive renders
- Improvement path: 
  1. Extract self-contained sections into custom hooks (`useProductionMetrics`, `useFeedInventory`)
  2. Use `useMemo` to memoize expensive chart data calculations
  3. Split mega-component into domain-specific sub-components with isolated state
  4. Consider migration to Zustand or Jotai for cross-component state

**Inefficient Re-renders in Charts:**
- Problem: Recharts components don't memoize properly when parent component re-renders for unrelated state changes
- Files: `app/dashboard/page.tsx`, `app/dashboard/racao/page.tsx` (all chart components)
- Cause: Charts recreated on every parent render, no `React.memo` wrapper
- Improvement path: Wrap chart components in `React.memo`, memoize chart data with `useMemo`, use `useCallback` for event handlers

**Missing Database Indexes:**
- Problem: Common queries filter by farm_id and date range but lack compound indexes
- Files: N/A - Supabase schema configuration issue
- Cause: Database schema not optimized for access patterns
- Improvement path: Add composite indexes on (farm_id, date) for tables: `egg_production`, `feed_consumption`, `financial_transactions`, `mortality_records`

## Fragile Areas

**Calendar Filter State Management:**
- Files: `components/date-filter/date-filter-context.tsx` (76 lines), `components/date-filter/calendar-filter.tsx` (252 lines)
- Why fragile: 
  - Date filter state shared globally via context, used by 10+ pages
  - Date format conversion happens in multiple places (ISO strings, Date objects, locale strings)
  - Changes to filter logic impact all consuming pages simultaneously
  - No validation of date ranges (end date could be before start date)
- Safe modification: 
  - Add comprehensive tests for date range edge cases (leap years, timezone boundaries)
  - Create utility functions for all date conversions (centralize format logic)
  - Add invariant checks for invalid date combinations
  - Bump version and test all 10+ consuming pages when modifying filter logic
- Test coverage: Likely zero test coverage for context logic and date calculations

**Supabase Client Initialization:**
- Files: `lib/supabase/client.ts` (14 lines)
- Why fragile: 
  - Global singleton client cached at module level (`let client: SupabaseClient | null = null`)
  - If client initialization fails, all subsequent calls will fail
  - No error handling if `NEXT_PUBLIC_SUPABASE_URL` or keys are undefined
  - Client reuse across different authentication contexts (could cause stale sessions)
- Safe modification: 
  - Add guards for missing environment variables with helpful error messages
  - Consider using Supabase's session management instead of singleton pattern
  - Add logging when client is created/reused for debugging
  - Test with missing env vars in CI
- Test coverage: No tests for client creation or error scenarios

**Middleware Authentication Logic:**
- Files: `lib/supabase/middleware.ts` (57 lines)
- Why fragile: 
  - Route protection via hardcoded array of public routes (line 33)
  - New public routes require changes to array (easy to forget)
  - Auth callback redirect logic couples onboarding flow to middleware
  - No logging of auth decisions (user blocked from route, etc.)
- Safe modification: 
  - Extract public routes to configuration object at top of file
  - Consider regex patterns for route matching (cleaner than array of exact strings)
  - Move onboarding redirect logic to dedicated route handler, not middleware
  - Add audit logging for auth events
- Test coverage: No tests for middleware routing logic

**AI Service Context:**
- Files: `app/api/ai/route.ts` (lines 20-50)
- Why fragile: 
  - Three different prompt structures hardcoded with subtly different instructions
  - "diagnostic" mode explicitly tells AI to include action plans, while "detailed" forbids them - confusing distinction
  - Static data in BASE_CONTEXT makes AI responses irrelevant to actual farm
  - Tier selection happens on client, not validated server-side
- Safe modification: 
  - Extract tier prompts to separate files or database
  - Validate tier parameter before use (not all strings are valid tiers)
  - Add integration with farm data fetching in POST handler
  - Create unit tests for prompt structure validation
- Test coverage: No tests for API logic

## Scaling Limits

**Dashboard Queries Scaling:**
- Current capacity: Single farm with ~1 month of daily production records (30 rows)
- Limit: Queries with `.gte("date", startDate).lte("date", endDate)` will scan full table once data reaches thousands of rows per farm, causing N*M scans for N farms with M records
- Scaling path: 
  1. Add database indexes on (farm_id, date) immediately
  2. Implement server-side aggregation (Supabase functions) to pre-aggregate daily/weekly/monthly summaries
  3. Add caching layer (Redis or Supubase cache) for reports that don't need real-time data
  4. Consider time-series database (InfluxDB) if analytics volume grows beyond Postgres

**Component Re-render Overhead:**
- Current capacity: Dashboard pages with <50 state variables render acceptably on modern browsers
- Limit: Pages will slow down significantly once state exceeds 100 variables or feature count doubles (each feature adds 3-5 state setters)
- Scaling path: 
  1. Extract state to custom hooks immediately (refactor before reaching pain point)
  2. Implement React Query or SWR for server state caching (reduce local state)
  3. Consider state machine library (XState) for complex workflows
  4. Profile with React DevTools Profiler to identify worst offenders

**Image/File Storage:**
- Current capacity: Profile avatars stored in Supabase storage (no usage data visible)
- Limit: Supabase free tier has 1GB storage, grows slowly with avatars (~50KB each = 20,000 max)
- Scaling path: 
  1. Monitor storage usage in Supabase dashboard
  2. Plan migration to dedicated CDN (Cloudflare, AWS S3) before hitting tier limits
  3. Implement image compression/resizing on upload

**API Rate Limits:**
- Current capacity: Anthropic API with no visible rate limiting on frontend
- Limit: Free tier or basic plan will hit rate limits once multiple users run diagnostic queries simultaneously
- Scaling path: 
  1. Implement server-side rate limiting (rate limit per farm/user)
  2. Queue long-running AI requests instead of blocking
  3. Implement request de-duplication (cache identical queries)
  4. Add user feedback for rate limit states (show queue position)

## Dependencies at Risk

**Anthropic SDK Major Version Mismatch:**
- Risk: `@anthropic-ai/sdk` v0.80.0 (4+ minor versions behind latest), potential API compatibility drift
- Impact: Future API changes may break hardcoded model names like `"claude-sonnet-4-6"` - need to update and re-test
- Migration plan: 
  1. Pin to stable major version (currently 1.x available)
  2. Review Anthropic changelog for breaking changes
  3. Test all tier modes (simple, detailed, diagnostic) with new SDK
  4. Update model names if Anthropic deprecates older models

**Recharts Charting Library:**
- Risk: Recharts is stable but heavy for simple charts, adds ~150KB to bundle
- Impact: Dashboard loads slowly on mobile devices with large number of charts
- Migration plan: If bundle size becomes issue, consider `chart.js` or roll custom SVG charts for simple use cases

**Supabase SSR Package Version Lock:**
- Risk: `@supabase/ssr` v0.9.0 relies on specific cookie handling - breaking changes in Next.js 16+ could invalidate session logic
- Impact: Authentication may silently break after Next.js major update
- Migration plan: 
  1. Monitor Supabase releases for Next.js 16+ compatibility
  2. Add integration tests for auth flow (currently missing)
  3. Test each Next.js minor version update before deploying to production

## Missing Critical Features

**No Data Persistence Verification:**
- Problem: Forms submit data to Supabase but provide no confirmation that data was saved before navigating away
- Blocks: Users don't know if their registration/updates succeeded, may submit duplicate data, experience lost work
- Example: Profile settings page saves but doesn't wait for response before closing modal

**No Audit Trail:**
- Problem: No tracking of who created/updated which records and when
- Blocks: Farm cannot comply with data governance, cannot investigate data inconsistencies, cannot roll back incorrect changes
- Example: If production numbers are wrong, no way to know who entered them or revert to previous value

**No Offline Support:**
- Problem: All pages require internet connection for basic operations
- Blocks: Farm workers cannot record data in areas with poor connectivity
- Solution: Would require service workers, local SQLite, and sync-on-reconnect logic

**No Undo/Redo for Operations:**
- Problem: Delete operations are permanent with no recovery option
- Blocks: Accidental data loss (e.g., deleted barn cannot be recovered)
- Fix approach: Soft deletes with archive feature, or explicit confirmation with 24-hour grace period

**No Bulk Operations:**
- Problem: Entering 100 feed records requires 100 individual form submissions
- Blocks: Efficiency for large operations (annual inventory adjustments, bulk registrations)
- Example: Equipment page can't bulk-update status of multiple items

## Test Coverage Gaps

**Service Layer - Zero Coverage:**
- What's not tested: All database operations in `lib/services/*.ts` (create, read, update, delete operations)
- Files: All 16 service files have no corresponding `.test.ts` files
- Risk: Refactoring service functions could break pages that depend on them silently; type changes to service signatures go undetected
- Priority: High - service layer is critical path for all data operations

**Authentication Flow - Zero Coverage:**
- What's not tested: Login, signup, password reset, session management, middleware redirects
- Files: 
  - `app/(auth)/login/page.tsx`
  - `app/(auth)/signup/page.tsx`
  - `app/auth/callback/route.ts`
  - `lib/supabase/middleware.ts`
- Risk: Auth bugs could lock out users or expose accounts, but no automated validation
- Priority: Critical - auth is foundation of entire app

**API Routes - Zero Coverage:**
- What's not tested: AI API route behavior, error handling, edge cases
- Files: `app/api/ai/route.ts`
- Risk: AI service could silently fail or return corrupted data without detection
- Priority: Medium - impacts only AI assistant feature

**Dashboard Pages - Zero Coverage:**
- What's not tested: Data loading, state management, chart rendering, form submissions
- Files: All `app/dashboard/**/page.tsx` files (15+ pages)
- Risk: Regressions in page-specific logic go undetected; chart data could be calculated incorrectly
- Priority: Medium - many edge cases in date filtering and data aggregation

**Component Library - Zero Coverage:**
- What's not tested: Reusable components (KPI cards, charts, date filters, modals)
- Files: `components/**/*.tsx`
- Risk: Changes to shared components break multiple pages unexpectedly
- Priority: Medium - would provide confidence for refactoring

---

*Concerns audit: 2026-04-07*
