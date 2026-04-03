-- Add extended fields to barns table
alter table public.barns add column if not exists area_m2 numeric(10,2);
alter table public.barns add column if not exists notes text;
alter table public.barns add column if not exists density_barn numeric(6,2);
alter table public.barns add column if not exists density_pasture numeric(6,2);
alter table public.barns add column if not exists birds_per_feeder int;
alter table public.barns add column if not exists birds_per_drinker int;
alter table public.barns add column if not exists nest_count int;
alter table public.barns add column if not exists birds_per_perch int;
alter table public.barns add column if not exists temperature numeric(4,1);
alter table public.barns add column if not exists humidity numeric(4,1);
alter table public.barns add column if not exists light_intensity numeric(6,1);
