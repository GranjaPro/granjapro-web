-- ============================================
-- Migration 00018: Secure Workers RLS
-- Updates workers table RLS policies to check user plan and trial status.
-- ============================================

-- Drop existing policies
drop policy if exists "Users can view own farm workers" on public.workers;
drop policy if exists "Users can insert own farm workers" on public.workers;
drop policy if exists "Users can update own farm workers" on public.workers;
drop policy if exists "Users can delete own farm workers" on public.workers;

-- Create new plan-aware and trial-aware RLS policies
create policy "Users can view own farm workers" on public.workers
  for select using (
    farm_id in (
      select farm_id from public.profiles
      where id = auth.uid()
        and plan in ('pro', 'premium')
        and (trial_ends_at is null or trial_ends_at > now())
    )
  );

create policy "Users can insert own farm workers" on public.workers
  for insert with check (
    farm_id in (
      select farm_id from public.profiles
      where id = auth.uid()
        and plan in ('pro', 'premium')
        and (trial_ends_at is null or trial_ends_at > now())
    )
  );

create policy "Users can update own farm workers" on public.workers
  for update using (
    farm_id in (
      select farm_id from public.profiles
      where id = auth.uid()
        and plan in ('pro', 'premium')
        and (trial_ends_at is null or trial_ends_at > now())
    )
  );

create policy "Users can delete own farm workers" on public.workers
  for delete using (
    farm_id in (
      select farm_id from public.profiles
      where id = auth.uid()
        and plan in ('pro', 'premium')
        and (trial_ends_at is null or trial_ends_at > now())
    )
  );
