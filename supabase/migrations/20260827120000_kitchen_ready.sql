-- =============================================================================
-- KampeDrop: kitchen_ready_at flag for delivery orders (vendor signal)
-- REVIEW BEFORE APPLYING
--
-- Not a pipeline status. Does not touch enforce_order_status_pipeline,
-- escrow, or passkey. Sits alongside status = 'preparing' for delivery.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Column
-- -----------------------------------------------------------------------------
alter table public.orders
  add column if not exists kitchen_ready_at timestamptz;

comment on column public.orders.kitchen_ready_at is
  'Vendor signal: kitchen pack is ready for rider pickup. Delivery + preparing only; null until mark_kitchen_ready. Not a status pipeline step.';

-- -----------------------------------------------------------------------------
-- 2) mark_kitchen_ready — vendor token + ownership
-- -----------------------------------------------------------------------------
create or replace function public.mark_kitchen_ready(
  p_token text,
  p_id text
)
returns public.orders
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_vendor public.vendors%rowtype;
  v_order public.orders%rowtype;
begin
  if p_token is null or btrim(p_token) = '' then
    raise exception 'Missing vendor access token.';
  end if;
  if p_id is null or btrim(p_id) = '' then
    raise exception 'Missing order id.';
  end if;

  select * into v_vendor
  from public.vendors
  where access_token::text = btrim(p_token)
  limit 1;

  if not found then
    raise exception 'Invalid vendor access token.';
  end if;

  select * into v_order
  from public.orders
  where id = btrim(p_id)
  for update;

  if not found then
    raise exception 'Order not found.';
  end if;

  if v_order.vendor_id is distinct from v_vendor.id::text then
    raise exception 'This order does not belong to this vendor.';
  end if;

  if v_order.fulfillment is distinct from 'delivery' then
    raise exception
      'Kitchen ready is only for delivery orders (order % is %).',
      v_order.id, v_order.fulfillment;
  end if;

  if v_order.status is distinct from 'preparing' then
    raise exception
      'Kitchen ready only while preparing (order % is %).',
      v_order.id, v_order.status;
  end if;

  -- Idempotent: already flagged → return as-is (no error, no clock rewrite)
  if v_order.kitchen_ready_at is not null then
    return v_order;
  end if;

  update public.orders
  set kitchen_ready_at = now()
  where id = v_order.id
  returning * into v_order;

  return v_order;
end;
$$;

revoke all on function public.mark_kitchen_ready(text, text) from public;
grant execute on function public.mark_kitchen_ready(text, text)
  to anon, authenticated;

comment on function public.mark_kitchen_ready(text, text) is
  'Vendor portal: set kitchen_ready_at on own delivery order while preparing. Idempotent if already set. Does not change status/escrow.';
