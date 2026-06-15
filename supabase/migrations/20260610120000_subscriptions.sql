-- Subscription state, mirrored from Polar webhooks. One row per user; the row
-- is upserted by the webhook handler (secret-key client) and only ever read
-- by browsers/SSR. Apply via Supabase Dashboard → SQL Editor, or:
--   supabase link --project-ref tlyvjybccqlafmowvusp && supabase db push

create table public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  polar_customer_id text,
  polar_subscription_id text unique,
  polar_product_id text,
  plan text check (plan in ('monthly', 'yearly')),
  -- Polar subscription status verbatim: active | trialing | past_due |
  -- canceled | unpaid | incomplete | incomplete_expired | revoked.
  status text not null,
  cancel_at_period_end boolean not null default false,
  current_period_end timestamptz,
  -- Polar's modified_at for the recorded event; the webhook refuses to
  -- overwrite newer state with older retried/out-of-order deliveries.
  polar_modified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "Users can read own subscription"
  on public.subscriptions for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- No insert/update/delete policies: RLS denies client writes. Belt and
-- braces: strip write privileges from the API roles entirely. Writes happen
-- only through the secret-key (service role) client in the webhook handler.
revoke insert, update, delete on public.subscriptions from anon, authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();
