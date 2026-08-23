delete from public.financial_transactions
 where amount <= 0;

alter table public.financial_transactions
  add constraint financial_transactions_amount_positive check (amount > 0);

alter table public.financial_transactions
  add column feed_inventory_id uuid references public.feed_inventory(id) on delete set null,
  add column medicine_inventory_id uuid references public.medicine_inventory(id) on delete set null,
  add column packaging_inventory_id uuid references public.packaging_inventory(id) on delete set null,
  add column equipment_inventory_id uuid references public.equipment_inventory(id) on delete set null;

alter table public.financial_transactions
  add constraint financial_transactions_single_inventory_item check (
    num_nonnulls(
      feed_inventory_id,
      medicine_inventory_id,
      packaging_inventory_id,
      equipment_inventory_id
    ) <= 1
  );

create index idx_financial_transactions_feed_inventory
  on public.financial_transactions(feed_inventory_id)
  where feed_inventory_id is not null;

create index idx_financial_transactions_medicine_inventory
  on public.financial_transactions(medicine_inventory_id)
  where medicine_inventory_id is not null;

create index idx_financial_transactions_packaging_inventory
  on public.financial_transactions(packaging_inventory_id)
  where packaging_inventory_id is not null;

create index idx_financial_transactions_equipment_inventory
  on public.financial_transactions(equipment_inventory_id)
  where equipment_inventory_id is not null;

update public.financial_transactions transaction
   set feed_inventory_id = inventory.id
  from public.feed_inventory inventory
 where transaction.reference = 'inventory:feed:' || inventory.id::text;

update public.financial_transactions transaction
   set medicine_inventory_id = inventory.id
  from public.medicine_inventory inventory
 where transaction.reference = 'inventory:medicine:' || inventory.id::text;

update public.financial_transactions transaction
   set packaging_inventory_id = inventory.id
  from public.packaging_inventory inventory
 where transaction.reference = 'inventory:packaging:' || inventory.id::text;

create or replace function public.sync_inventory_purchase_expense()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  expense_category text := tg_argv[0];
  reference_prefix text := tg_argv[1];
  inventory_reference text;
  generated_amount numeric(12,2);
  inventory_description text;
  linked_feed_id uuid;
  linked_medicine_id uuid;
  linked_packaging_id uuid;
  linked_equipment_id uuid;
begin
  inventory_reference := reference_prefix || ':' || new.id::text;
  generated_amount := coalesce(nullif(new.total_cost, 0), new.quantity * coalesce(new.unit_cost, 0));

  if generated_amount is null or generated_amount <= 0 then
    if tg_op = 'INSERT' then
      raise exception 'O custo total do item de estoque deve ser maior que zero.';
    end if;

    delete from public.financial_transactions
     where reference = inventory_reference;
    return new;
  end if;

  linked_feed_id := case when reference_prefix = 'inventory:feed' then new.id end;
  linked_medicine_id := case when reference_prefix = 'inventory:medicine' then new.id end;
  linked_packaging_id := case when reference_prefix = 'inventory:packaging' then new.id end;
  linked_equipment_id := case when reference_prefix = 'inventory:equipment' then new.id end;
  inventory_description := 'Compra de estoque: ' || new.name;

  insert into public.financial_transactions (
    farm_id,
    date,
    type,
    category,
    description,
    amount,
    reference,
    feed_inventory_id,
    medicine_inventory_id,
    packaging_inventory_id,
    equipment_inventory_id
  )
  values (
    new.farm_id,
    new.entry_date,
    'expense',
    expense_category,
    inventory_description,
    generated_amount,
    inventory_reference,
    linked_feed_id,
    linked_medicine_id,
    linked_packaging_id,
    linked_equipment_id
  )
  on conflict (reference) where reference is not null do update
    set farm_id = excluded.farm_id,
        date = excluded.date,
        type = excluded.type,
        category = excluded.category,
        description = excluded.description,
        amount = excluded.amount,
        feed_inventory_id = excluded.feed_inventory_id,
        medicine_inventory_id = excluded.medicine_inventory_id,
        packaging_inventory_id = excluded.packaging_inventory_id,
        equipment_inventory_id = excluded.equipment_inventory_id;

  return new;
end;
$$;

drop trigger if exists sync_equipment_inventory_purchase_expense on public.equipment_inventory;
create trigger sync_equipment_inventory_purchase_expense
  after insert or update of quantity, unit_cost, total_cost, entry_date, name, equipment_category, equipment_type
  on public.equipment_inventory
  for each row execute procedure public.sync_inventory_purchase_expense('maintenance', 'inventory:equipment');

update public.equipment_inventory
   set total_cost = total_cost
 where coalesce(nullif(total_cost, 0), quantity * coalesce(unit_cost, 0)) > 0;
