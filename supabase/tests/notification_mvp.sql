begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'owner-one@example.com', '', now(), '{}', '{"full_name":"Owner One"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'member-one@example.com', '', now(), '{}', '{"full_name":"Member One"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'owner-two@example.com', '', now(), '{}', '{"full_name":"Owner Two"}', now(), now());

insert into public.farms (id, name, producer_name, owner_id) values
  ('20000000-0000-0000-0000-000000000001', 'Farm One', 'Owner One', '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002', 'Farm Two', 'Owner Two', '10000000-0000-0000-0000-000000000003');

update public.profiles set farm_id = '20000000-0000-0000-0000-000000000001'
where id in ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002');
update public.profiles set farm_id = '20000000-0000-0000-0000-000000000002'
where id = '10000000-0000-0000-0000-000000000003';

select public.upsert_notification_condition(
  '20000000-0000-0000-0000-000000000001', 'low_inventory', 'warning',
  'Low stock', 'Feed is below the configured threshold.', 'feed_inventory',
  '30000000-0000-0000-0000-000000000001', '/dashboard/inventory',
  'low_inventory:feed_inventory:30000000-0000-0000-0000-000000000001', '{}'::jsonb
);

select is((select count(*) from public.notifications where farm_id = '20000000-0000-0000-0000-000000000001'), 1::bigint, 'creates one structured notification');
select is((select count(*) from public.notification_recipients), 2::bigint, 'creates one recipient per authenticated farm profile');
select is((select count(*) from public.notification_email_deliveries), 2::bigint, 'queues email for default preferences');

select public.upsert_notification_condition(
  '20000000-0000-0000-0000-000000000001', 'low_inventory', 'critical',
  'Low stock', 'Feed remains below the configured threshold.', 'feed_inventory',
  '30000000-0000-0000-0000-000000000001', '/dashboard/inventory',
  'low_inventory:feed_inventory:30000000-0000-0000-0000-000000000001', '{"stockPercent":10}'::jsonb
);

select is((select count(*) from public.notifications), 1::bigint, 'repeated evaluation does not duplicate the condition');
select is((select occurrence_version from public.notifications limit 1), 1, 'active updates keep the occurrence version');

select public.resolve_notification_condition(
  '20000000-0000-0000-0000-000000000001',
  'low_inventory:feed_inventory:30000000-0000-0000-0000-000000000001'
);
select is((select status from public.notifications limit 1), 'resolved', 'resolves independently of recipient read state');
select is((select count(*) from public.notification_recipients where read_at is null), 2::bigint, 'resolution does not mark recipients as read');

select public.upsert_notification_condition(
  '20000000-0000-0000-0000-000000000001', 'low_inventory', 'warning',
  'Low stock again', 'Feed returned below the threshold.', 'feed_inventory',
  '30000000-0000-0000-0000-000000000001', '/dashboard/inventory',
  'low_inventory:feed_inventory:30000000-0000-0000-0000-000000000001', '{}'::jsonb
);
select is((select occurrence_version from public.notifications limit 1), 2, 'reopening increments the occurrence version');
select is((select count(*) from public.notification_recipients), 4::bigint, 'reopening creates independent recipient state');

update public.notification_preferences
set email_enabled = false
where farm_id = '20000000-0000-0000-0000-000000000001'
  and user_id = '10000000-0000-0000-0000-000000000002'
  and category = 'vaccination';

select public.upsert_notification_condition(
  '20000000-0000-0000-0000-000000000001', 'vaccination', 'warning',
  'Upcoming vaccination', 'A vaccination is due soon.', 'health_record',
  '40000000-0000-0000-0000-000000000001', '/dashboard/health',
  'vaccination:health_record:40000000-0000-0000-0000-000000000001', '{}'::jsonb
);
select is((select count(*) from public.notification_recipients where notification_id = (select id from public.notifications where category = 'vaccination')), 2::bigint, 'in-app defaults create recipients for both profiles');
select is((select count(*) from public.notification_email_deliveries where notification_id = (select id from public.notifications where category = 'vaccination')), 1::bigint, 'disabled email preference prevents delivery work');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select is((select count(*) from public.notifications), 2::bigint, 'recipient can read the intended farm notifications');
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select is((select count(*) from public.notifications), 0::bigint, 'user from another farm cannot read the notification');

select * from finish();
rollback;
