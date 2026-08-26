-- Notification condition generators and Supabase-based scheduling.

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

  if saved_notification.id is not null then
    update public.notification_recipients
    set updated_at = now()
    where notification_id = saved_notification.id
      and occurrence_version = saved_notification.occurrence_version;
  end if;

  return saved_notification;
end;
$$;

create or replace function public.evaluate_farm_notification_conditions(
  p_farm_id uuid,
  p_today date default ((now() at time zone 'America/Sao_Paulo')::date)
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  settings_record record;
  item_record record;
  vaccine_record record;
  customer_record record;
  production_record record;
  mortality_record record;
  notification_record record;
  active_keys text[];
  condition_key text;
  stock_percent numeric;
  production_start date;
  mortality_start date;
  actual_laying_rate numeric;
  expected_laying_rate numeric;
  mortality_rate numeric;
  generated_count integer := 0;
  resolved_count integer := 0;
begin
  if p_farm_id is null or not exists (select 1 from public.farms where id = p_farm_id) then
    return jsonb_build_object('generated', 0, 'resolved', 0);
  end if;

  select
    coalesce(setting.low_stock_threshold_percent, 25)::numeric as low_stock_threshold_percent,
    coalesce(setting.upcoming_vaccination_days, 7) as upcoming_vaccination_days,
    coalesce(setting.low_laying_window_days, 7) as low_laying_window_days,
    coalesce(setting.low_laying_gap_percent, 5)::numeric as low_laying_gap_percent,
    coalesce(setting.high_mortality_window_days, 7) as high_mortality_window_days,
    coalesce(setting.high_mortality_percent, 0.5)::numeric as high_mortality_percent,
    coalesce(setting.delinquency_days, 30) as delinquency_days
  into settings_record
  from (select 1) singleton
  left join public.notification_settings setting on setting.farm_id = p_farm_id;

  active_keys := array[]::text[];
  for item_record in
    select 'feed_inventory'::text as entity_type, id, name, quantity, minimum_quantity, unit
    from public.feed_inventory where farm_id = p_farm_id
    union all
    select 'medicine_inventory', id, name, quantity, minimum_quantity, unit
    from public.medicine_inventory where farm_id = p_farm_id
    union all
    select 'packaging_inventory', id, name, quantity, minimum_quantity, unit
    from public.packaging_inventory where farm_id = p_farm_id
    union all
    select 'equipment_inventory', id, name, quantity, minimum_quantity, unit
    from public.equipment_inventory where farm_id = p_farm_id
  loop
    stock_percent := case
      when item_record.minimum_quantity <= 0 then case when item_record.quantity > 0 then 100 else 0 end
      else least(100, round((item_record.quantity / item_record.minimum_quantity) * 100))
    end;
    condition_key := 'low_inventory:' || item_record.entity_type || ':' || item_record.id::text;

    if stock_percent <= settings_record.low_stock_threshold_percent then
      active_keys := array_append(active_keys, condition_key);
      perform public.upsert_notification_condition(
        p_farm_id,
        'low_inventory',
        case when item_record.quantity <= 0 then 'critical' else 'warning' end,
        'Estoque baixo: ' || item_record.name,
        'O estoque atual está em ' || trim(to_char(stock_percent, 'FM999990D0')) || '% do mínimo configurado.',
        item_record.entity_type,
        item_record.id::text,
        '/dashboard/inventory',
        condition_key,
        jsonb_build_object('stock_percent', stock_percent, 'quantity', item_record.quantity, 'unit', item_record.unit)
      );
      generated_count := generated_count + 1;
    end if;
  end loop;

  for notification_record in
    select dedup_key from public.notifications
    where farm_id = p_farm_id and category = 'low_inventory' and status = 'active'
      and dedup_key like 'low_inventory:%'
      and not (dedup_key = any(active_keys))
  loop
    perform public.resolve_notification_condition(p_farm_id, notification_record.dedup_key);
    resolved_count := resolved_count + 1;
  end loop;

  active_keys := array[]::text[];
  for vaccine_record in
    select id, title, date, flock_id
    from public.health_records
    where farm_id = p_farm_id
      and type = 'vaccination'
      and status in ('scheduled', 'upcoming')
      and date <= p_today + settings_record.upcoming_vaccination_days
  loop
    condition_key := 'vaccination:health_record:' || vaccine_record.id::text;
    active_keys := array_append(active_keys, condition_key);
    perform public.upsert_notification_condition(
      p_farm_id,
      'vaccination',
      case when vaccine_record.date < p_today then 'critical' else 'warning' end,
      case when vaccine_record.date < p_today then 'Vacinação atrasada' else 'Vacinação próxima' end,
      vaccine_record.title || ' — ' || case
        when vaccine_record.date < p_today then 'prevista para ' || to_char(vaccine_record.date, 'DD/MM/YYYY')
        else 'agendada para ' || to_char(vaccine_record.date, 'DD/MM/YYYY')
      end || '.',
      'health_record',
      vaccine_record.id::text,
      case when vaccine_record.flock_id is null then '/dashboard/health'
        else '/dashboard/flocks/detalhes/' || vaccine_record.flock_id::text || '/saude' end,
      condition_key,
      jsonb_build_object('scheduled_date', vaccine_record.date, 'overdue', vaccine_record.date < p_today)
    );
    generated_count := generated_count + 1;
  end loop;

  for notification_record in
    select dedup_key from public.notifications
    where farm_id = p_farm_id and category = 'vaccination' and status = 'active'
      and dedup_key like 'vaccination:health_record:%'
      and not (dedup_key = any(active_keys))
  loop
    perform public.resolve_notification_condition(p_farm_id, notification_record.dedup_key);
    resolved_count := resolved_count + 1;
  end loop;

  production_start := p_today - greatest(settings_record.low_laying_window_days - 1, 0);
  with daily_production as (
    select
      production.date,
      flock.id as flock_id,
      sum(production.eggs_produced)::numeric as eggs_produced,
      greatest(
        flock.bird_count - coalesce((
          select sum(death.dead_birds)
          from public.mortality death
          where death.farm_id = p_farm_id
            and death.flock_id = flock.id
            and death.date <= production.date
        ), 0),
        0
      )::numeric as live_birds,
      case
        when flock.arrival_age_weeks + floor((production.date - flock.arrival_date) / 7.0) < 18 then 0
        when flock.arrival_age_weeks + floor((production.date - flock.arrival_date) / 7.0) < 22 then 28
        when flock.arrival_age_weeks + floor((production.date - flock.arrival_date) / 7.0) < 25 then 70
        when flock.arrival_age_weeks + floor((production.date - flock.arrival_date) / 7.0) < 35 then 96
        when flock.arrival_age_weeks + floor((production.date - flock.arrival_date) / 7.0) < 60 then 93
        when flock.arrival_age_weeks + floor((production.date - flock.arrival_date) / 7.0) < 75 then 88
        when flock.arrival_age_weeks + floor((production.date - flock.arrival_date) / 7.0) <= 90 then 80
        else 68
      end::numeric as expected_rate
    from public.egg_production production
    join public.flocks flock on flock.id = production.flock_id and flock.farm_id = p_farm_id
    where production.farm_id = p_farm_id
      and production.date between production_start and p_today
      and lower(flock.status) <> 'descarte'
    group by production.date, flock.id
  )
  select
    count(*) as recorded_days,
    coalesce(sum(eggs_produced), 0) as total_eggs,
    coalesce(sum(live_birds), 0) as eligible_bird_days,
    coalesce(sum(live_birds * expected_rate / 100), 0) as expected_eggs
  into production_record
  from daily_production
  where live_birds > 0 and expected_rate > 0;

  condition_key := 'low_laying_rate:farm:' || p_farm_id::text;
  if production_record.recorded_days > 0 and production_record.eligible_bird_days > 0 then
    actual_laying_rate := production_record.total_eggs / production_record.eligible_bird_days * 100;
    expected_laying_rate := production_record.expected_eggs / production_record.eligible_bird_days * 100;
  else
    actual_laying_rate := null;
    expected_laying_rate := null;
  end if;

  if actual_laying_rate is not null
    and actual_laying_rate < expected_laying_rate - settings_record.low_laying_gap_percent then
    perform public.upsert_notification_condition(
      p_farm_id,
      'low_laying_rate',
      'warning',
      'Taxa de postura abaixo do esperado',
      'A média dos últimos ' || settings_record.low_laying_window_days || ' dias registrados foi '
        || trim(to_char(actual_laying_rate, 'FM999990D0')) || '%, frente a '
        || trim(to_char(expected_laying_rate, 'FM999990D0')) || '% esperados.',
      'farm',
      p_farm_id::text,
      '/dashboard/production',
      condition_key,
      jsonb_build_object(
        'actual_rate', round(actual_laying_rate, 2),
        'expected_rate', round(expected_laying_rate, 2),
        'window_start', production_start,
        'window_end', p_today,
        'recorded_days', production_record.recorded_days
      )
    );
    generated_count := generated_count + 1;
  elsif exists (
    select 1 from public.notifications notification
    where notification.farm_id = p_farm_id
      and notification.dedup_key = condition_key
      and notification.status = 'active'
  ) then
    perform public.resolve_notification_condition(p_farm_id, condition_key);
    resolved_count := resolved_count + 1;
  end if;

  mortality_start := p_today - greatest(settings_record.high_mortality_window_days - 1, 0);
  select
    coalesce((select sum(dead_birds) from public.mortality
      where farm_id = p_farm_id and date between mortality_start and p_today), 0)::numeric as deaths,
    coalesce((select sum(bird_count) from public.flocks
      where farm_id = p_farm_id and lower(status) <> 'descarte'), 0)::numeric as birds
  into mortality_record;

  mortality_rate := case when mortality_record.birds > 0
    then mortality_record.deaths / mortality_record.birds * 100 else null end;
  condition_key := 'high_mortality:farm:' || p_farm_id::text;

  if mortality_rate is not null and mortality_rate > settings_record.high_mortality_percent then
    perform public.upsert_notification_condition(
      p_farm_id,
      'high_mortality',
      'critical',
      'Mortalidade acima do limite',
      'A mortalidade dos últimos ' || settings_record.high_mortality_window_days || ' dias chegou a '
        || trim(to_char(mortality_rate, 'FM999990D00')) || '%.',
      'farm',
      p_farm_id::text,
      '/dashboard/mortality',
      condition_key,
      jsonb_build_object(
        'mortality_rate', round(mortality_rate, 3),
        'dead_birds', mortality_record.deaths,
        'bird_count', mortality_record.birds,
        'window_start', mortality_start,
        'window_end', p_today
      )
    );
    generated_count := generated_count + 1;
  elsif exists (
    select 1 from public.notifications notification
    where notification.farm_id = p_farm_id
      and notification.dedup_key = condition_key
      and notification.status = 'active'
  ) then
    perform public.resolve_notification_condition(p_farm_id, condition_key);
    resolved_count := resolved_count + 1;
  end if;

  active_keys := array[]::text[];
  for customer_record in
    select customer.id, customer.name, count(sale.id) as sale_count, sum(sale.total) as overdue_total
    from public.customers customer
    join public.sales sale on sale.customer_id = customer.id and sale.farm_id = p_farm_id
    where customer.farm_id = p_farm_id
      and sale.payment_status = 'pending'
      and p_today - sale.due_date >= settings_record.delinquency_days
    group by customer.id, customer.name
  loop
    condition_key := 'delinquent_customer:customer:' || customer_record.id::text;
    active_keys := array_append(active_keys, condition_key);
    perform public.upsert_notification_condition(
      p_farm_id,
      'delinquent_customer',
      'warning',
      'Cliente inadimplente: ' || customer_record.name,
      customer_record.sale_count || case when customer_record.sale_count = 1
        then ' venda permanece pendente há ' || settings_record.delinquency_days || ' dias ou mais.'
        else ' vendas permanecem pendentes há ' || settings_record.delinquency_days || ' dias ou mais.' end,
      'customer',
      customer_record.id::text,
      '/dashboard/customers',
      condition_key,
      jsonb_build_object('sale_count', customer_record.sale_count, 'overdue_total', customer_record.overdue_total)
    );
    generated_count := generated_count + 1;
  end loop;

  for notification_record in
    select dedup_key from public.notifications
    where farm_id = p_farm_id and category = 'delinquent_customer' and status = 'active'
      and dedup_key like 'delinquent_customer:customer:%'
      and not (dedup_key = any(active_keys))
  loop
    perform public.resolve_notification_condition(p_farm_id, notification_record.dedup_key);
    resolved_count := resolved_count + 1;
  end loop;

  return jsonb_build_object('generated', generated_count, 'resolved', resolved_count);
end;
$$;

create or replace function public.evaluate_all_notification_conditions(
  p_today date default ((now() at time zone 'America/Sao_Paulo')::date)
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  farm_record record;
  evaluated_count integer := 0;
  failed_farms jsonb := '[]'::jsonb;
begin
  for farm_record in select id from public.farms loop
    begin
      perform public.evaluate_farm_notification_conditions(farm_record.id, p_today);
      evaluated_count := evaluated_count + 1;
    exception when others then
      failed_farms := failed_farms || jsonb_build_array(
        jsonb_build_object('farm_id', farm_record.id, 'error', left(sqlerrm, 300))
      );
    end;
  end loop;

  return jsonb_build_object('evaluated_farms', evaluated_count, 'failures', failed_farms);
end;
$$;

create or replace function public.trigger_farm_notification_evaluation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_farm_id uuid;
  previous_farm_id uuid;
begin
  if tg_op <> 'DELETE' then current_farm_id := new.farm_id; end if;
  if tg_op <> 'INSERT' then previous_farm_id := old.farm_id; end if;

  if current_farm_id is not null then
    perform public.evaluate_farm_notification_conditions(
      current_farm_id,
      (now() at time zone 'America/Sao_Paulo')::date
    );
  end if;
  if previous_farm_id is not null and previous_farm_id is distinct from current_farm_id then
    perform public.evaluate_farm_notification_conditions(
      previous_farm_id,
      (now() at time zone 'America/Sao_Paulo')::date
    );
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

do $$
declare
  source_table text;
  trigger_name text;
begin
  foreach source_table in array array[
    'feed_inventory', 'medicine_inventory', 'packaging_inventory', 'equipment_inventory',
    'health_records', 'egg_production', 'mortality', 'flocks', 'sales', 'notification_settings'
  ] loop
    trigger_name := 'evaluate_notifications_after_' || source_table;
    execute format('drop trigger if exists %I on public.%I', trigger_name, source_table);
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute procedure public.trigger_farm_notification_evaluation()',
      trigger_name,
      source_table
    );
  end loop;
end;
$$;

revoke all on function public.evaluate_farm_notification_conditions(uuid, date) from public, anon, authenticated;
revoke all on function public.evaluate_all_notification_conditions(date) from public, anon, authenticated;
revoke all on function public.trigger_farm_notification_evaluation() from public, anon, authenticated;
grant execute on function public.evaluate_farm_notification_conditions(uuid, date) to service_role;
grant execute on function public.evaluate_all_notification_conditions(date) to service_role;

create extension if not exists pg_cron with schema pg_catalog;

do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id from cron.job where jobname = 'granjapro-notification-evaluation';
  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
  perform cron.schedule(
    'granjapro-notification-evaluation',
    '15 11 * * *',
    'select public.evaluate_all_notification_conditions((now() at time zone ''America/Sao_Paulo'')::date);'
  );
end;
$$;
