alter table public.customers
  add column cnpj text,
  add column postal_code text,
  add column street text,
  add column address_number text,
  add column address_complement text,
  add column neighborhood text,
  add column city text,
  add column state text;

alter table public.customers
  add constraint customers_cnpj_format
  check (cnpj is null or cnpj ~ '^[0-9]{14}$'),
  add constraint customers_postal_code_format
  check (postal_code is null or postal_code ~ '^[0-9]{8}$'),
  add constraint customers_state_format
  check (state is null or state ~ '^[A-Z]{2}$');

create unique index idx_customers_farm_cnpj_unique
  on public.customers(farm_id, cnpj)
  where cnpj is not null;
