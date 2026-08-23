delete from public.sales
 where quantity <= 0
    or unit_price <= 0
    or total <= 0;

alter table public.sales
  add constraint sales_quantity_positive check (quantity > 0),
  add constraint sales_unit_price_positive check (unit_price > 0),
  add constraint sales_total_positive check (total > 0);

alter table public.financial_transactions
  add column sale_id uuid references public.sales(id) on delete cascade;

delete from public.financial_transactions
 where type = 'revenue';

create unique index idx_financial_transactions_sale_unique
  on public.financial_transactions(sale_id)
  where sale_id is not null;

alter table public.financial_transactions
  add constraint financial_transactions_revenue_source check (
    (type = 'revenue' and sale_id is not null)
    or
    (type = 'expense' and sale_id is null)
  );

create or replace function public.sync_sale_revenue()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  customer_name text;
begin
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
    new.date,
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
  after insert or update of farm_id, customer_id, date, total
  on public.sales
  for each row execute procedure public.sync_sale_revenue();

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
  sale.date,
  'revenue',
  'sales',
  'Venda - ' || coalesce(customer.name, 'Cliente não informado'),
  sale.total,
  'sale:' || sale.id::text,
  sale.id
from public.sales sale
left join public.customers customer on customer.id = sale.customer_id;

drop policy if exists "Users can insert transactions in their farm" on public.financial_transactions;
create policy "Users can insert expenses in their farm"
  on public.financial_transactions for insert
  with check (
    type = 'expense'
    and farm_id in (select id from public.farms where owner_id = auth.uid())
  );

drop policy if exists "Users can update transactions in their farm" on public.financial_transactions;
create policy "Users can update expenses in their farm"
  on public.financial_transactions for update
  using (
    type = 'expense'
    and farm_id in (select id from public.farms where owner_id = auth.uid())
  )
  with check (
    type = 'expense'
    and farm_id in (select id from public.farms where owner_id = auth.uid())
  );

drop policy if exists "Users can delete transactions in their farm" on public.financial_transactions;
create policy "Users can delete expenses in their farm"
  on public.financial_transactions for delete
  using (
    type = 'expense'
    and farm_id in (select id from public.farms where owner_id = auth.uid())
  );
