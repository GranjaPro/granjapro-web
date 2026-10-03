-- Dispatch the persisted notification email queue through the application server.

create extension if not exists pg_net with schema extensions;

create or replace function public.dispatch_notification_email_processor()
returns bigint
language plpgsql
security definer
set search_path = public, vault, net
as $$
declare
  processor_url text;
  processor_secret text;
  request_id bigint;
begin
  select decrypted_secret into processor_url
  from vault.decrypted_secrets
  where name = 'notification_processor_url'
  limit 1;

  select decrypted_secret into processor_secret
  from vault.decrypted_secrets
  where name = 'notification_processor_secret'
  limit 1;

  if processor_url is null or processor_secret is null then
    return null;
  end if;
  if processor_url !~ '^https://[^[:space:]]+$' then
    raise exception 'notification_processor_url must be an HTTPS URL';
  end if;

  select net.http_post(
    url := processor_url,
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || processor_secret,
      'Content-Type', 'application/json'
    ),
    timeout_milliseconds := 10000
  ) into request_id;

  return request_id;
end;
$$;

revoke all on function public.dispatch_notification_email_processor() from public, anon, authenticated;
grant execute on function public.dispatch_notification_email_processor() to service_role;

do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'granjapro-notification-email-processor';

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'granjapro-notification-email-processor',
    '* * * * *',
    'select public.dispatch_notification_email_processor();'
  );
end;
$$;
