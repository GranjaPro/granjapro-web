-- ============================================
-- Granja Pro - Migration 00014: Profile plan and trial state
-- Aligns repository schema with the live profiles.plan field and
-- adds one-time Premium trial tracking.
-- ============================================

alter table public.profiles
  add column if not exists plan text default 'essencial';

alter table public.profiles
  add column if not exists trial_started_at timestamptz,
  add column if not exists trial_ends_at timestamptz,
  add column if not exists trial_used_at timestamptz;

update public.profiles
set plan = 'essencial'
where plan is null
  or plan not in ('essencial', 'pro', 'premium');

alter table public.profiles
  alter column plan set default 'essencial',
  alter column plan set not null;

alter table public.profiles
  drop constraint if exists profiles_plan_check;

alter table public.profiles
  add constraint profiles_plan_check
  check (plan in ('essencial', 'pro', 'premium'));

create or replace function public.handle_new_user()
returns trigger
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, email, full_name, plan)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    'essencial'
  );
  return new;
end;
$$ language plpgsql security definer;
