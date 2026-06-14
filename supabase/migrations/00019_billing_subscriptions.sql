-- ============================================
-- Migration 00019: Stripe billing subscriptions
-- Stores Stripe subscription state separately from user profiles.
-- ============================================

create table if not exists public.billing_subscriptions (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  stripe_customer_id text not null,
  stripe_subscription_id text not null unique,
  stripe_price_id text not null,
  plan text not null check (plan in ('essencial', 'pro', 'premium')),
  billing_cycle text not null check (billing_cycle in ('monthly', 'yearly')),
  status text not null,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false not null
);

alter table public.billing_subscriptions enable row level security;

create index if not exists idx_billing_subscriptions_user_id
  on public.billing_subscriptions(user_id);

create index if not exists idx_billing_subscriptions_customer_id
  on public.billing_subscriptions(stripe_customer_id);

drop policy if exists "Users can view own billing subscriptions" on public.billing_subscriptions;
create policy "Users can view own billing subscriptions"
  on public.billing_subscriptions for select
  using (auth.uid() = user_id);

drop trigger if exists set_updated_at on public.billing_subscriptions;
create trigger set_updated_at before update on public.billing_subscriptions
  for each row execute procedure public.handle_updated_at();
