create or replace function public.validate_productive_flock_egg_production()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  flock_record public.flocks%rowtype;
  age_weeks integer;
  live_birds integer;
begin
  if new.flock_id is null then
    raise exception using
      errcode = '23514',
      message = 'Selecione um lote para registrar a produção.';
  end if;

  select * into flock_record
    from public.flocks
   where id = new.flock_id
     and farm_id = new.farm_id;

  if not found then
    raise exception using
      errcode = '23514',
      message = 'O lote selecionado não pertence a esta granja.';
  end if;

  if lower(flock_record.status) = 'descarte' then
    raise exception using
      errcode = '23514',
      message = 'Não é possível registrar produção para um lote em descarte.';
  end if;

  if new.date < flock_record.arrival_date then
    raise exception using
      errcode = '23514',
      message = 'O lote ainda não havia chegado à granja nesta data.';
  end if;

  age_weeks := flock_record.arrival_age_weeks + ((new.date - flock_record.arrival_date) / 7);
  if age_weeks < 18 then
    raise exception using
      errcode = '23514',
      message = 'O lote ainda não atingiu 18 semanas nesta data.';
  end if;

  select greatest(
    flock_record.bird_count - coalesce(sum(mortality.dead_birds), 0),
    0
  ) into live_birds
    from public.mortality
   where mortality.flock_id = new.flock_id
     and mortality.date <= new.date;

  if live_birds <= 0 then
    raise exception using
      errcode = '23514',
      message = 'O lote não possui aves vivas nesta data.';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_productive_flock_egg_production on public.egg_production;
create trigger validate_productive_flock_egg_production
  before insert or update on public.egg_production
  for each row execute procedure public.validate_productive_flock_egg_production();
