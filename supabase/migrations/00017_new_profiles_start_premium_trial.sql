-- New profiles start on the automatic 7-day Premium trial.

create or replace function public.handle_new_user()
returns trigger
set search_path = public, auth
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    plan,
    trial_started_at,
    trial_ends_at,
    trial_used_at
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    'premium',
    now(),
    now() + interval '7 days',
    now()
  );
  return new;
end;
$$ language plpgsql security definer;
