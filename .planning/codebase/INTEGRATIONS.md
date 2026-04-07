# External Integrations

**Analysis Date:** 2026-04-07

## APIs & External Services

**AI/LLM:**
- Claude AI (via Anthropic) - Diagnostic and analysis assistance for farm management
  - SDK/Client: `@anthropic-ai/sdk` 0.80.0
  - Auth: `ANTHROPIC_API_KEY` environment variable
  - Endpoint: `/api/ai` (Server-Side Streaming with tier-based model selection)
  - Models used: `claude-haiku-4-5` (simple tier), `claude-sonnet-4-6` (detailed/diagnostic tiers)
  - Features: Three-tier response system (simple, detailed, diagnostic) with streaming responses

**OAuth:**
- Google OAuth - Social login integration
  - Provider: Google (via Supabase OAuth)
  - Callback: `/auth/callback`
  - Redirect: `NEXT_PUBLIC_SUPABASE_URL` configured

## Data Storage

**Databases:**
- Supabase PostgreSQL
  - Connection: Via `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
  - Client SDKs: `@supabase/supabase-js` 2.99.3 (browser), `@supabase/ssr` 0.9.0 (server)
  - ORM/Client: Supabase PostgREST API (SQL queries via JavaScript client)

**Tables:**
- `profiles` - User profile information, farm references
- `farms` - Farm/organization details
- `barns` - Poultry barn/facility data
- `flocks` - Bird flock information (breed, bird count, status)
- `egg_production` - Daily/periodic egg production records
- `feed_consumption` - Feed usage tracking
- `feed_inventory` - Feed stock and inventory
- `mortality` - Bird mortality records and statistics
- `health_records` - Animal health and illness tracking
- `equipment` - Farm equipment inventory
- `financial_transactions` - Revenue, expenses, costs
- `customers` - Customer/buyer information
- `sales` - Sales transactions
- `tasks` - Operational tasks/reminders
- `workers` - Staff/worker management
- `alerts` - System alerts and notifications
- `inventory` - General inventory management

**File Storage:**
- Not detected - No S3, Supabase Storage, or external file storage configured

**Caching:**
- Not detected - No Redis or caching layer

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (built-in PostgreSQL user management)
  - Implementation: Email/password and Google OAuth sign-in
  - Session management: Cookie-based via `@supabase/ssr` with Next.js middleware
  - Client: `lib/supabase/client.ts` for browser contexts
  - Server: `lib/supabase/server.ts` for API routes and server components
  - Middleware: `middleware.ts` + `lib/supabase/middleware.ts` for session refresh and auth checks

**Protected Routes:**
- Public: `/login`, `/signup`, `/forgot-password`, `/auth/callback`, `/auth/confirm`, `/termos-de-uso`, `/politica-de-privacidade`, `/`
- Protected: All `/dashboard/*` routes require authenticated session
- Onboarding: First-time users redirected to `/dashboard/onboarding` on login

**Email Verification:**
- Supabase email confirmation flow
  - Endpoint: `app/auth/confirm` (email confirmation callback)
  - Password reset: Email-based recovery via `/forgot-password`

## Monitoring & Observability

**Error Tracking:**
- Not detected - No Sentry, LogRocket, or external error tracking

**Logs:**
- Console logging only
  - AI API errors logged to console in `app/api/ai/route.ts`
  - Anthropic authentication/rate limit errors handled with user-friendly messages

## CI/CD & Deployment

**Hosting:**
- Deployment platform not specified in configuration

**CI Pipeline:**
- Not detected - No GitHub Actions, GitLab CI, or other CI configuration

## Environment Configuration

**Required env vars:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (public, used in browser)
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` - Supabase anonymous/publishable key (public)
- `ANTHROPIC_API_KEY` - Claude API key (secret, server-side only)

**Secrets location:**
- `.env.local` file (local development)
- Production: Environment variables from deployment platform (not configured in repo)

## Webhooks & Callbacks

**Incoming:**
- `/auth/callback` - OAuth callback handler for Google sign-in and email confirmation
  - Exchanges authorization code for session
  - Detects first-time users (no farm) and redirects to onboarding
  - Supports optional `next` parameter for post-auth redirect

**Outgoing:**
- Not detected - No outbound webhooks to third-party services

## Data Export & Reporting

**Report Generation:**
- PDF export: Via `jspdf` and `jspdf-autotable` in `/dashboard/reports`
- Excel export: Via `exceljs` and `xlsx` in `/dashboard/reports`
- Client-side download: Via `file-saver`

## API Routes

**AI Endpoint:**
- `POST /api/ai` - Claude AI streaming responses
  - Body: `{ messages: Array<{role, content}>, tier: "simple" | "detailed" | "diagnostic" }`
  - Response: Server-sent events (text/event-stream) with real-time token streaming
  - Error codes: 400 (bad request), 401 (invalid API key), 429 (rate limited), 500 (server error)

---

*Integration audit: 2026-04-07*
