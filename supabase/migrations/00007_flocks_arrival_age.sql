-- ============================================
-- Migration 00007: Replace age_weeks with arrival_age_weeks, drop production_start_date
-- Age is now computed in code from arrival_date + arrival_age_weeks
-- ============================================

-- Rename age_weeks to arrival_age_weeks
alter table public.flocks rename column age_weeks to arrival_age_weeks;

-- Drop production_start_date (production starts on arrival)
alter table public.flocks drop column if exists production_start_date;
