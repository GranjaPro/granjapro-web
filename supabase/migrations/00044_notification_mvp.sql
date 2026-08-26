-- Notification MVP persistence, authorization, recipient state, and delivery queue.

create table public.notification_settings (
  farm_id uuid primary key references public.farms(id) on delete cascade,
  low_stock_threshold_percent numeric(5,2) not null default 25 check (low_stock_threshold_percent between 0 and 100),
  upcoming_vaccination_days integer not null default 7 check (upcoming_vaccination_days between 0 and 90),
  low_laying_window_days integer not null default 7 check (low_laying_window_days between 1 and 90),
  low_laying_gap_percent numeric(5,2) not null default 5 check (low_laying_gap_percent between 0 and 100),
  high_mortality_window_days integer not null default 7 check (high_mortality_window_days between 1 and 90),
  high_mortality_percent numeric(5,2) not null default 0.5 check (high_mortality_percent between 0 and 100),
  delinquency_days integer not null default 30 check (delinquency_days between 1 and 365),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  category text not null check (category in ('low_inventory', 'vaccination', 'low_laying_rate', 'high_mortality', 'delinquent_customer')),
  severity text not null check (severity in ('info', 'warning', 'critical')),
  title text not null,
  body text not null,
  entity_type text not null,
  entity_id text not null,
  action_path text not null check (action_path like '/dashboard%'),
  dedup_key text not null,
  status text not null default 'active' check (status in ('active', 'resolved')),
  occurrence_version integer not null default 1 check (occurrence_version > 0),
  occurrence_count integer not null default 1 check (occurrence_count > 0),
  first_detected_at timestamptz not null default now(),
  last_detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (farm_id, dedup_key),
  unique (id, farm_id),
  check ((status = 'active' and resolved_at is null) or (status = 'resolved' and resolved_at is not null))
);

create table public.notification_preferences (
  farm_id uuid not null references public.farms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('low_inventory', 'vaccination', 'low_laying_rate', 'high_mortality', 'delinquent_customer')),
  in_app_enabled boolean not null default true,
  email_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (farm_id, user_id, category)
);

create table public.notification_recipients (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null,
  farm_id uuid not null references public.farms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  occurrence_version integer not null check (occurrence_version > 0),
  read_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (notification_id, user_id, occurrence_version),
  foreign key (notification_id, farm_id) references public.notifications(id, farm_id) on delete cascade
);

create table public.notification_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null,
  farm_id uuid not null references public.farms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  occurrence_version integer not null check (occurrence_version > 0),
  recipient_email text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'retry', 'sent', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  provider_id text,
  idempotency_key text not null unique check (length(idempotency_key) between 1 and 256),
  last_http_status integer,
  last_error_code text,
  last_error_detail text check (last_error_detail is null or length(last_error_detail) <= 500),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (notification_id, user_id, occurrence_version),
  foreign key (notification_id, farm_id) references public.notifications(id, farm_id) on delete cascade
);

create index idx_notifications_farm_status_category on public.notifications(farm_id, status, category);
create index idx_notifications_farm_detected on public.notifications(farm_id, last_detected_at desc);
create index idx_notification_recipients_user_state on public.notification_recipients(user_id, read_at, dismissed_at);
create index idx_notification_recipients_farm_user_created on public.notification_recipients(farm_id, user_id, created_at desc);
create index idx_notification_preferences_user_farm on public.notification_preferences(user_id, farm_id);
create index idx_notification_email_deliveries_queue on public.notification_email_deliveries(status, next_attempt_at);
create index idx_notification_email_deliveries_user_created on public.notification_email_deliveries(farm_id, user_id, created_at desc);

alter table public.notification_settings enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_recipients enable row level security;
alter table public.notification_email_deliveries enable row level security;

create policy "Farm members can view notification settings"
  on public.notification_settings for select
  using (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.farm_id = notification_settings.farm_id
  ) or exists (
    select 1 from public.farms
    where farms.id = notification_settings.farm_id and farms.owner_id = auth.uid()
  ));

create policy "Farm owners can insert notification settings"
  on public.notification_settings for insert
  with check (exists (
    select 1 from public.farms
    where farms.id = notification_settings.farm_id and farms.owner_id = auth.uid()
  ));

create policy "Farm owners can update notification settings"
  on public.notification_settings for update
  using (exists (
    select 1 from public.farms
    where farms.id = notification_settings.farm_id and farms.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.farms
    where farms.id = notification_settings.farm_id and farms.owner_id = auth.uid()
  ));

create policy "Recipients can view notifications"
  on public.notifications for select
  using (exists (
    select 1
    from public.notification_recipients recipient
    where recipient.notification_id = notifications.id
      and recipient.occurrence_version = notifications.occurrence_version
      and recipient.user_id = auth.uid()
  ));

create policy "Users can view own notification preferences"
  on public.notification_preferences for select
  using (
    user_id = auth.uid()
    and (exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.farm_id = notification_preferences.farm_id
    ) or exists (
      select 1 from public.farms
      where farms.id = notification_preferences.farm_id and farms.owner_id = auth.uid()
    ))
  );

create policy "Users can insert own notification preferences"
  on public.notification_preferences for insert
  with check (
    user_id = auth.uid()
    and (exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.farm_id = notification_preferences.farm_id
    ) or exists (
      select 1 from public.farms
      where farms.id = notification_preferences.farm_id and farms.owner_id = auth.uid()
    ))
  );

create policy "Users can update own notification preferences"
  on public.notification_preferences for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.farm_id = notification_preferences.farm_id
    ) or exists (
      select 1 from public.farms
      where farms.id = notification_preferences.farm_id and farms.owner_id = auth.uid()
    ))
  );

create policy "Users can view own notification recipients"
  on public.notification_recipients for select
  using (
    user_id = auth.uid()
    and (exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.farm_id = notification_recipients.farm_id
    ) or exists (
      select 1 from public.farms
      where farms.id = notification_recipients.farm_id and farms.owner_id = auth.uid()
    ))
  );

create policy "Users can update own notification recipients"
  on public.notification_recipients for update
  using (
    user_id = auth.uid()
    and (exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.farm_id = notification_recipients.farm_id
    ) or exists (
      select 1 from public.farms
      where farms.id = notification_recipients.farm_id and farms.owner_id = auth.uid()
    ))
  )
  with check (
    user_id = auth.uid()
    and (exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.farm_id = notification_recipients.farm_id
    ) or exists (
      select 1 from public.farms
      where farms.id = notification_recipients.farm_id and farms.owner_id = auth.uid()
    ))
  );

create policy "Users can view own notification email deliveries"
  on public.notification_email_deliveries for select
  using (
    user_id = auth.uid()
    and (exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.farm_id = notification_email_deliveries.farm_id
    ) or exists (
      select 1 from public.farms
      where farms.id = notification_email_deliveries.farm_id and farms.owner_id = auth.uid()
    ))
  );

revoke insert, update, delete on public.notifications from anon, authenticated;
revoke insert, delete on public.notification_recipients from anon, authenticated;
revoke update on public.notification_recipients from anon, authenticated;
grant update (read_at, dismissed_at, updated_at) on public.notification_recipients to authenticated;
revoke insert, update, delete on public.notification_email_deliveries from anon, authenticated;

create or replace function public.sync_notification_channels(p_notification_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_notification public.notifications%rowtype;
begin
  select * into target_notification
  from public.notifications
  where id = p_notification_id and status = 'active';

  if not found then
    return;
  end if;

  insert into public.notification_recipients (
    notification_id, farm_id, user_id, occurrence_version
  )
  select
    target_notification.id,
    target_notification.farm_id,
    recipient.id,
    target_notification.occurrence_version
  from (
    select profile.id, profile.email
    from public.profiles profile
    where profile.farm_id = target_notification.farm_id
    union
    select profile.id, profile.email
    from public.profiles profile
    join public.farms farm on farm.owner_id = profile.id
    where farm.id = target_notification.farm_id
  ) recipient
  left join public.notification_preferences preference
    on preference.farm_id = target_notification.farm_id
   and preference.user_id = recipient.id
   and preference.category = target_notification.category
  where coalesce(preference.in_app_enabled, true)
  on conflict (notification_id, user_id, occurrence_version) do nothing;

  insert into public.notification_email_deliveries (
    notification_id,
    farm_id,
    user_id,
    occurrence_version,
    recipient_email,
    idempotency_key
  )
  select
    target_notification.id,
    target_notification.farm_id,
    recipient.id,
    target_notification.occurrence_version,
    recipient.email,
    'notification/' || target_notification.id::text || '/' || target_notification.occurrence_version::text || '/' || recipient.id::text
  from (
    select profile.id, profile.email
    from public.profiles profile
    where profile.farm_id = target_notification.farm_id
    union
    select profile.id, profile.email
    from public.profiles profile
    join public.farms farm on farm.owner_id = profile.id
    where farm.id = target_notification.farm_id
  ) recipient
  left join public.notification_preferences preference
    on preference.farm_id = target_notification.farm_id
   and preference.user_id = recipient.id
   and preference.category = target_notification.category
  where coalesce(preference.email_enabled, true)
  on conflict (notification_id, user_id, occurrence_version) do nothing;
end;
$$;

create or replace function public.upsert_notification_condition(
  p_farm_id uuid,
  p_category text,
  p_severity text,
  p_title text,
  p_body text,
  p_entity_type text,
  p_entity_id text,
  p_action_path text,
  p_dedup_key text,
  p_data jsonb default '{}'::jsonb
)
returns public.notifications
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_notification public.notifications%rowtype;
  saved_notification public.notifications%rowtype;
begin
  if p_category not in ('low_inventory', 'vaccination', 'low_laying_rate', 'high_mortality', 'delinquent_customer') then
    raise exception 'Invalid notification category';
  end if;
  if p_severity not in ('info', 'warning', 'critical') then
    raise exception 'Invalid notification severity';
  end if;
  if p_action_path not like '/dashboard%' then
    raise exception 'Invalid notification action path';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_farm_id::text || ':' || p_dedup_key, 0));

  select * into existing_notification
  from public.notifications
  where farm_id = p_farm_id and dedup_key = p_dedup_key
  for update;

  if not found then
    insert into public.notifications (
      farm_id, category, severity, title, body, entity_type, entity_id,
      action_path, dedup_key, data
    ) values (
      p_farm_id, p_category, p_severity, p_title, p_body, p_entity_type,
      p_entity_id, p_action_path, p_dedup_key, coalesce(p_data, '{}'::jsonb)
    ) returning * into saved_notification;
  elsif existing_notification.status = 'resolved' then
    update public.notifications
    set category = p_category,
        severity = p_severity,
        title = p_title,
        body = p_body,
        entity_type = p_entity_type,
        entity_id = p_entity_id,
        action_path = p_action_path,
        status = 'active',
        occurrence_version = occurrence_version + 1,
        occurrence_count = occurrence_count + 1,
        first_detected_at = now(),
        last_detected_at = now(),
        resolved_at = null,
        data = coalesce(p_data, '{}'::jsonb),
        updated_at = now()
    where id = existing_notification.id
    returning * into saved_notification;
  else
    update public.notifications
    set category = p_category,
        severity = p_severity,
        title = p_title,
        body = p_body,
        entity_type = p_entity_type,
        entity_id = p_entity_id,
        action_path = p_action_path,
        last_detected_at = now(),
        data = coalesce(p_data, '{}'::jsonb),
        updated_at = now()
    where id = existing_notification.id
    returning * into saved_notification;
  end if;

  perform public.sync_notification_channels(saved_notification.id);
  return saved_notification;
end;
$$;

create or replace function public.resolve_notification_condition(
  p_farm_id uuid,
  p_dedup_key text
)
returns public.notifications
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_notification public.notifications%rowtype;
begin
  update public.notifications
  set status = 'resolved',
      resolved_at = now(),
      updated_at = now()
  where farm_id = p_farm_id
    and dedup_key = p_dedup_key
    and status = 'active'
  returning * into saved_notification;

  return saved_notification;
end;
$$;

create or replace function public.seed_notification_preferences()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.farm_id is not null then
    insert into public.notification_preferences (farm_id, user_id, category)
    select new.farm_id, new.id, category
    from unnest(array['low_inventory', 'vaccination', 'low_laying_rate', 'high_mortality', 'delinquent_customer']) category
    on conflict (farm_id, user_id, category) do nothing;
  end if;
  return new;
end;
$$;

insert into public.notification_preferences (farm_id, user_id, category)
select profile.farm_id, profile.id, category
from public.profiles profile
cross join unnest(array['low_inventory', 'vaccination', 'low_laying_rate', 'high_mortality', 'delinquent_customer']) category
where profile.farm_id is not null
on conflict (farm_id, user_id, category) do nothing;

drop trigger if exists seed_notification_preferences_on_profile on public.profiles;
create trigger seed_notification_preferences_on_profile
  after insert or update of farm_id on public.profiles
  for each row execute procedure public.seed_notification_preferences();

create or replace function public.claim_notification_email_deliveries(p_limit integer default 4)
returns setof public.notification_email_deliveries
language sql
security definer
set search_path = public
as $$
  with candidates as (
    select id
    from public.notification_email_deliveries
    where (
      status in ('pending', 'retry') and next_attempt_at <= now()
    ) or (
      status = 'processing' and locked_at < now() - interval '10 minutes'
    )
    order by next_attempt_at, created_at
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 4), 20))
  )
  update public.notification_email_deliveries delivery
  set status = 'processing',
      attempt_count = delivery.attempt_count + 1,
      locked_at = now(),
      updated_at = now()
  from candidates
  where delivery.id = candidates.id
  returning delivery.*;
$$;

create or replace function public.complete_notification_email_delivery(
  p_delivery_id uuid,
  p_provider_id text
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.notification_email_deliveries
  set status = 'sent',
      provider_id = p_provider_id,
      sent_at = now(),
      locked_at = null,
      last_http_status = null,
      last_error_code = null,
      last_error_detail = null,
      updated_at = now()
  where id = p_delivery_id and status = 'processing';
$$;

create or replace function public.fail_notification_email_delivery(
  p_delivery_id uuid,
  p_terminal boolean,
  p_next_attempt_at timestamptz,
  p_http_status integer,
  p_error_code text,
  p_error_detail text
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.notification_email_deliveries
  set status = case when p_terminal or attempt_count >= 6 then 'failed' else 'retry' end,
      next_attempt_at = case when p_terminal or attempt_count >= 6 then next_attempt_at else p_next_attempt_at end,
      locked_at = null,
      last_http_status = p_http_status,
      last_error_code = left(p_error_code, 100),
      last_error_detail = left(p_error_detail, 500),
      updated_at = now()
  where id = p_delivery_id and status = 'processing';
$$;

revoke all on function public.sync_notification_channels(uuid) from public, anon, authenticated;
revoke all on function public.upsert_notification_condition(uuid, text, text, text, text, text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.resolve_notification_condition(uuid, text) from public, anon, authenticated;
revoke all on function public.claim_notification_email_deliveries(integer) from public, anon, authenticated;
revoke all on function public.complete_notification_email_delivery(uuid, text) from public, anon, authenticated;
revoke all on function public.fail_notification_email_delivery(uuid, boolean, timestamptz, integer, text, text) from public, anon, authenticated;
revoke all on function public.seed_notification_preferences() from public, anon, authenticated;

grant execute on function public.upsert_notification_condition(uuid, text, text, text, text, text, text, text, text, jsonb) to service_role;
grant execute on function public.resolve_notification_condition(uuid, text) to service_role;
grant execute on function public.claim_notification_email_deliveries(integer) to service_role;
grant execute on function public.complete_notification_email_delivery(uuid, text) to service_role;
grant execute on function public.fail_notification_email_delivery(uuid, boolean, timestamptz, integer, text, text) to service_role;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notification_recipients'
  ) then
    alter publication supabase_realtime add table public.notification_recipients;
  end if;
end;
$$;
