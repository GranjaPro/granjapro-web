alter table public.equipment
  add constraint equipment_name_not_blank
    check (btrim(name) <> '') not valid,
  add constraint equipment_value_nonnegative
    check (equipment_value is not null and equipment_value >= 0) not valid,
  add constraint equipment_usage_hours_nonnegative
    check (usage_hours is not null and usage_hours >= 0) not valid,
  add constraint equipment_lifespan_hours_nonnegative
    check (lifespan_hours is not null and lifespan_hours >= 0) not valid,
  add constraint equipment_maintenance_after_installation
    check (
      installation_date is null
      or next_maintenance_date is null
      or next_maintenance_date >= installation_date
    ) not valid;
