alter table public.customers
  add column payment_terms_days integer not null default 0,
  add column archived_at timestamptz;

alter table public.customers
  add constraint customers_payment_terms_days_range
  check (payment_terms_days between 0 and 365);

update public.customers
set payment_terms_days = least(
  365,
  greatest(0, substring(trim(payment_terms) from '^(\d+)')::integer)
)
where trim(coalesce(payment_terms, '')) ~ '^\d+(\s*dias?)?$';

alter table public.sales
  add column due_date date,
  add column paid_at date;

update public.sales sale
set due_date = sale.date + customer.payment_terms_days
from public.customers customer
where customer.id = sale.customer_id;

update public.sales
set due_date = date
where due_date is null;

update public.sales
set due_date = least(due_date, current_date - 1),
    payment_status = 'pending'
where payment_status = 'overdue';

update public.sales
set paid_at = date
where payment_status = 'paid';

update public.sales
set payment_status = 'pending',
    paid_at = null
where payment_status is null;

alter table public.sales
  drop constraint if exists sales_payment_status_check;

alter table public.sales
  add constraint sales_payment_status_check
    check (payment_status in ('pending', 'paid')),
  add constraint sales_payment_consistency
    check (
      (payment_status = 'paid' and paid_at is not null)
      or (payment_status = 'pending' and paid_at is null)
    ),
  alter column due_date set not null,
  alter column payment_status set not null;

alter table public.sales
  drop constraint if exists sales_customer_id_fkey;

alter table public.sales
  add constraint sales_customer_id_fkey
  foreign key (customer_id) references public.customers(id) on delete restrict;

create index idx_customers_farm_archived
  on public.customers(farm_id, archived_at);

create index idx_sales_farm_due_status
  on public.sales(farm_id, due_date, payment_status);

create or replace function public.sync_sale_revenue()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  customer_name text;
begin
  if new.payment_status <> 'paid' then
    delete from public.financial_transactions
     where sale_id = new.id;
    return new;
  end if;

  select name
    into customer_name
    from public.customers
   where id = new.customer_id;

  insert into public.financial_transactions (
    farm_id,
    date,
    type,
    category,
    description,
    amount,
    reference,
    sale_id
  )
  values (
    new.farm_id,
    new.paid_at,
    'revenue',
    'sales',
    'Venda - ' || coalesce(customer_name, 'Cliente não informado'),
    new.total,
    'sale:' || new.id::text,
    new.id
  )
  on conflict (sale_id) where sale_id is not null do update
    set farm_id = excluded.farm_id,
        date = excluded.date,
        category = excluded.category,
        description = excluded.description,
        amount = excluded.amount,
        reference = excluded.reference;

  return new;
end;
$$;

drop trigger if exists sync_sale_revenue on public.sales;
create trigger sync_sale_revenue
  after insert or update of farm_id, customer_id, total, payment_status, paid_at
  on public.sales
  for each row execute procedure public.sync_sale_revenue();

delete from public.financial_transactions
where sale_id is not null;

insert into public.financial_transactions (
  farm_id,
  date,
  type,
  category,
  description,
  amount,
  reference,
  sale_id
)
select
  sale.farm_id,
  sale.paid_at,
  'revenue',
  'sales',
  'Venda - ' || coalesce(customer.name, 'Cliente não informado'),
  sale.total,
  'sale:' || sale.id::text,
  sale.id
from public.sales sale
left join public.customers customer on customer.id = sale.customer_id
where sale.payment_status = 'paid';
