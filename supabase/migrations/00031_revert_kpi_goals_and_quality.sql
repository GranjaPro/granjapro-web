drop table if exists public.kpi_goals cascade;

alter table public.egg_production
  drop column if exists deformed_eggs,
  drop column if exists internal_abnormality_eggs;
