alter table public.egg_production
  add constraint egg_production_non_negative_quantities
  check (
    eggs_produced >= 0
    and coalesce(broken_eggs, 0) >= 0
    and coalesce(dirty_eggs, 0) >= 0
    and coalesce(discarded_eggs, 0) >= 0
  ) not valid;
