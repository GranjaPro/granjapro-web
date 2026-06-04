# Phase 11: Form Standardization - Validation Map

**Phase:** 11
**Status:** Planned

## Validation Architecture

| Req ID | Requirement | Test Type | Automated Command | Target File |
|--------|-------------|-----------|-------------------|-------------|
| REQ-01 | Barn validation rules (name, capacity, system) | Unit | `npx vitest lib/schemas/barn.test.ts` | `lib/schemas/barn.ts` |
| REQ-02 | Flock validation rules (breed, arrival date) | Unit | `npx vitest lib/schemas/flock.test.ts` | `lib/schemas/flock.ts` |
| REQ-03 | Production validation rules (eggs produced, breakage) | Unit | `npx vitest lib/schemas/production.test.ts` | `lib/schemas/production.ts` |
| REQ-04 | Inventory validation rules (quantity, threshold) | Unit | `npx vitest lib/schemas/inventory.test.ts` | `lib/schemas/inventory.ts` |
| REQ-05 | Sales validation rules (price, payment status) | Unit | `npx vitest lib/schemas/sales.test.ts` | `lib/schemas/sales.ts` |

## Integration & UX Tests (Manual/E2E)

| ID | Case | Success Criteria |
|----|------|------------------|
| UX-01 | Real-time validation | Errors appear/disappear onBlur without page reload. |
| UX-02 | Dirty state protection | Confirmation prompt appears when closing modal with unsaved changes. |
| UX-03 | Toast notifications | Success toast appears after every successful save. |
| UX-04 | Mobile optimized inputs | Quantity fields trigger numeric keyboard on mobile devices. |
| UX-05 | Delete confirmation | Deletion only proceeds after user confirms in the standard modal. |

## Verification Command

```bash
# Run all unit tests for schemas
npx vitest lib/schemas/*.test.ts

# Type checking and linting
npm run lint && npx tsc --noEmit
```
