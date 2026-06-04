# Phase 11: Form Standardization - Context

**Gathered:** 2026-06-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 11 focuses on standardizing the data entry layer and UI components of Granja Pro. This involves creating a centralized form system using React Hook Form and Zod, refactoring dashboard pages into feature-based components, and moving complex logic (like reports) into dedicated services.

This phase includes:
- Implementation of a reusable atomic form component library (`FormField`, `FormInput`, etc.).
- Centralized Zod validation schemas for core entities (Barns, Flocks, Production, Inventory, Sales).
- Refactoring `app/dashboard/inventory` and `app/dashboard/reports` into clean components.
- Standardizing report data processing in `lib/services/reports.ts`.
- **Refactoring the monolithic `profile-settings.tsx`** using the new standardized system.
- Integration of **`react-toastify`** for global success/error notifications.
- Standardized **`ConfirmDelete`** components to unify deletion workflows.
- **Dirty state protection** for complex forms with user confirmation prompts.

It does NOT include:
- KPI goal customization (deferred to Phase 15).
- Task management system (deferred to Phase 13).
- Complex Supabase-to-Zod error mapping (avoiding over-engineering for MVP).
</domain>

<decisions>
## Implementation Decisions

### Form Management & Validation
- **D-01:** Use **React Hook Form** as the primary library for form state management.
- **D-02:** Use **Zod** for schema-based validation.
- **D-03:** Store all Zod schemas in `lib/schemas/` (e.g., `lib/schemas/barn.ts`, `lib/schemas/inventory.ts`).
- **D-04:** Implement **Atomic Components** for forms. Provide a set of reusable fields (`FormField`, `Input`, `Select`, `Checkbox`) that can be composed within feature-specific forms.
- **D-05:** Validation feedback should be **Real-time** (onBlur or onChange) to provide immediate guidance to the user.

### UI & UX Standardization
- **D-06:** Organize reusable dashboard components into **Feature-based Folders** under `components/dashboard/[feature]/` (e.g., `components/dashboard/inventory/InventoryTable.tsx`).
- **D-07:** Refactor large page files (like `inventory/page.tsx`, `reports/page.tsx`, and `profile-settings.tsx`) by extracting their sub-elements.
- **D-08:** Use **`react-toastify`** for all form submission feedback. Implement a standard helper for success and error toasts.
- **D-09:** **Automated Loading State**: Form buttons should automatically disable and show a loading indicator using the `isSubmitting` state from React Hook Form.
- **D-10:** **Mobile Optimization**: Input components must use appropriate `inputMode` (e.g., `decimal` for quantities) and native pickers where appropriate for a better smartphone experience.
- **D-11:** **Standardized Deletion**: Create a `ConfirmDelete` modal/button component to replace scattered "Confirmar Exclusão" logic.
- **D-12:** **Dirty State Warning**: Implement a confirmation prompt if the user tries to close a modal or navigate away with unsaved changes: *"Você tem alterações não salvas. Deseja realmente sair?"*.

### Reports & Data Integration
- **D-13:** Move all data fetching, transformation, and export preparation logic for reports into **`lib/services/reports.ts`**.
- **D-14:** Ensure report components are "dumb" and only receive pre-formatted data from the service layer.

### General Code Quality
- **D-15:** Eliminate code repetition between similar component types.
- **D-16:** Ensure 100% database integration for components and charts that are currently using mock data or local-only state.

</decisions>

<canonical_refs>
## Canonical References

- `.planning/REQUIREMENTS.md` - v1.3 requirements for form standardization and inventory integration.
- `.planning/ROADMAP.md` - Phase 11 and 12 goals.
- `app/dashboard/inventory/page.tsx` - Reference for inventory form logic to be refactored.
- `app/dashboard/reports/page.tsx` - Reference for report logic to be extracted.
- `app/dashboard/barns/page.tsx` - Reference for existing form patterns to be standardized.
- `lib/services/inventory.ts` - Existing service to be enhanced.
</canonical_refs>

<code_context>
## Existing Code Insights

- **Forms**: Currently, forms are handled with local `useState` and manual input elements. `CustomSelect` is often redefined inline.
- **Service Layer**: There is an existing service layer in `lib/services/`, but it lacks strict type validation for inputs beyond basic TypeScript interfaces.
- **Dashboard Components**: Many components are currently living in `components/dashboard/` but are becoming cluttered; the move to feature-based subfolders is required.
- **Reports**: The reports page is currently very large (1600+ lines) and contains significant data transformation logic that needs to be moved to a service.
</code_context>

<deferred>
## Deferred Ideas

- **KPI Customization**: Clicking on KPIs to adjust metrics/goals is deferred to Phase 15.
- **Rollout Gap**: Refactoring the legacy forms for Feed, Health, Mortality, Finances, Customers, and Equipment is deferred to Phase 15 (schemas are defined in Phase 11).
- **Task System**: Full task creation and management forms will be built in Phase 13.
- **Notifications**: The notification system implementation remains in Phase 13.
</deferred>

---

*Phase: 11-Form Standardization*
*Context gathered: 2026-06-03*
