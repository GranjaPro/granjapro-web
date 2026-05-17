-- Allow null plan as the explicit "no active plan" state used after trial expiry.

alter table public.profiles
  alter column plan drop not null;

alter table public.profiles
  drop constraint if exists profiles_plan_check;

alter table public.profiles
  add constraint profiles_plan_check
  check (plan in ('essencial', 'pro', 'premium'));
