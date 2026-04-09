# Technology Stack

**Analysis Date:** 2026-04-07

## Languages

**Primary:**
- TypeScript 5.x - All source code and configuration
- JavaScript (ES2017+) - Runtime and build scripts

## Runtime

**Environment:**
- Node.js (version not specified in package.json)

**Package Manager:**
- npm - Lockfile: present (package-lock.json implied)

## Frameworks

**Core:**
- Next.js 15.5.14 - Full-stack React framework with API routes and SSR
- React 19.0.0 - UI library
- React DOM 19.0.0 - DOM rendering

**Testing:**
- Not detected - No test framework configured

**Build/Dev:**
- TypeScript 5.x - Type checking
- ESLint 8.x - Linting via `eslint-config-next`
- PostCSS 8.x - CSS processing
- Autoprefixer 10.4.27 - Vendor prefixes for CSS

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` 2.99.3 - Database and authentication client
- `@supabase/ssr` 0.9.0 - Supabase server-side rendering support
- `@anthropic-ai/sdk` 0.80.0 - Claude AI integration for diagnostic features

**UI Components:**
- `@radix-ui/react-checkbox` 1.1.2 - Accessible checkbox component
- `@radix-ui/react-progress` 1.1.0 - Progress bar component
- `@radix-ui/react-slot` 1.1.0 - Slot composition primitive
- `lucide-react` 0.460.0 - Icon library
- `class-variance-authority` 0.7.1 - CSS class composition utility
- `clsx` 2.1.1 - Conditional CSS class utility
- `tailwind-merge` 2.5.4 - Tailwind CSS class merging

**Styling:**
- `tailwindcss` 3.4.1 - Utility-first CSS framework
- `tailwindcss-animate` 1.0.7 - Tailwind animation utilities

**Data Visualization:**
- `recharts` 3.8.0 - React charting library for production/mortality/feed analytics

**Export/Reporting:**
- `jspdf` 4.2.1 - PDF generation for reports
- `jspdf-autotable` 5.0.7 - PDF table formatting for reports
- `exceljs` 4.4.0 - Excel spreadsheet generation
- `xlsx` 0.18.5 - Spreadsheet read/write utilities
- `file-saver` 2.0.5 - Client-side file download handling

**Utilities:**
- `@types/file-saver` 2.0.7 - TypeScript definitions for file-saver

## Configuration

**Environment:**
- `.env.local` file present - Contains environment configuration
- Required vars (based on code inspection):
  - `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` - Supabase anonymous key
  - `ANTHROPIC_API_KEY` - Claude API key for AI features

**Build:**
- `tsconfig.json` - TypeScript compilation settings with `@/*` path alias
- `next.config.ts` - Next.js configuration (minimal, React strict mode enabled)
- `middleware.ts` - Request middleware for authentication and session management

**Development:**
- No `.eslintrc` or `.prettierrc` detected - Using Next.js default linting configuration

## Platform Requirements

**Development:**
- Node.js (version unspecified)
- npm or equivalent package manager
- TypeScript 5.x for compilation

**Production:**
- Node.js runtime compatible with Next.js 15.5.14
- Supabase project URL and API keys
- Anthropic API key for AI features

---

*Stack analysis: 2026-04-07*
