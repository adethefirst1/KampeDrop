-- =============================================================================
-- KampeDrop: allow payment = 'card' + document card payment_state values
-- =============================================================================

alter table public.orders drop constraint if exists orders_payment_check;

alter table public.orders
  add constraint orders_payment_check
  check (payment = any (array['cod'::text, 'transfer'::text, 'card'::text]));

comment on column public.orders.payment is
  'cod | transfer | card. Card uses Paystack; payment_state: card_pending → card_paid | card_failed.';

-- Optional audit fields for Paystack (nullable; filled by Edge Functions)
alter table public.orders
  add column if not exists paystack_reference text;

alter table public.orders
  add column if not exists paystack_access_code text;

create unique index if not exists orders_paystack_reference_uidx
  on public.orders (paystack_reference)
  where paystack_reference is not null;

comment on column public.orders.paystack_reference is
  'Paystack transaction reference (usually equals order id). Set by paystack-initialize.';
