# Milestones

## v1.0 Finances Module + Calendar Sync (Shipped: 2026-05-01)

**Phases completed:** 4 phases, 11 plans, 7 tasks

**Key accomplishments:**
- Fixed the Brazil timezone date-filter bug by replacing UTC serialization in the shared date filter.
- Centralized transaction category constants and tightened typing in the financial service layer.
- Switched the finances page and dashboard financial KPIs from mock data to shared Supabase-backed services.
- Unified the finances page with the shared global calendar filter.
- Replaced mock financial charts with live transaction-derived chart data.
- Added Supabase-backed transaction CRUD and sale-to-revenue create sync with duplicate prevention.

**Known gaps accepted at close:**
- Phases 1-3 are missing `VERIFICATION.md` artifacts, leaving 16 requirements unverified in milestone documentation.
- Sale edit/delete does not update the linked revenue transaction created from the sale.

**Artifacts:**
- Roadmap archive: `.planning/milestones/v1.0-ROADMAP.md`
- Requirements archive: `.planning/milestones/v1.0-REQUIREMENTS.md`
- Audit: `.planning/milestones/v1.0-MILESTONE-AUDIT.md`

---
