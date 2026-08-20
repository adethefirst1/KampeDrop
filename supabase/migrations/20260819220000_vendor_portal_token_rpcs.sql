-- =============================================================================
-- KampeDrop: vendor portal token auth + order RPCs
--
-- Pattern mirrors riders.access_token:
--   - Stable secret on the vendor row (not guessable like id)
--   - Returned only from vendor_login after PIN verify
--   - Required on every portal RPC; ownership checked against orders.vendor_id
--
-- Escrow: validate_passkey_and_release_by_vendor delegates to the existing
--   validate_passkey_and_release() so the GUC + enforce_escrow_release_path
--   path stays the single release mechanism.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) access_token on vendors
-- -----------------------------------------------------------------------------
alter table public.vendors
  add column if not exists access_token uuid not null default gen_random_uuid();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'vendors_access_token_key'
  ) then
    alter table public.vendors
      add constraint vendors_access_token_key unique (access_token);
  end if;
end
$$;

comment on column public.vendors.access_token is
  'Portal credential (uuid). Returned only by vendor_login after PIN verify. Never expose via SELECT to anon.';

-- Harden: anon/authenticated must not read pin_hash or access_token even on
-- buyer-visible (approved+active) rows. Login RPC (SECURITY DEFINER) still can.
revoke select (pin_hash) on table public.vendors from public, anon, authenticated;
revoke select (access_token) on table public.vendors from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2) vendor_login — also return access_token (DROP required: return shape change)
-- -----------------------------------------------------------------------------
drop function if exists public.vendor_login(text, text);

create function public.vendor_login(
  p_phone text,
  p_pin text
)
returns table (
  id uuid,
  name text,
  verification_status text,
  active boolean,
  access_token uuid
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_phone text;
  v_national text;
  v_row public.vendors%rowtype;
begin
  -- Normalize phone → 0XXXXXXXXXX (same as submit_vendor_application)
  v_national := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  if left(v_national, 3) = '234' then
    v_national := substr(v_national, 4);
  end if;
  if left(v_national, 1) = '0' then
    v_national := substr(v_national, 2);
  end if;

  if v_national !~ '^[789][0-9]{9}$' then
    raise exception 'Enter a valid Nigerian mobile number.';
  end if;

  v_phone := '0' || v_national;

  if p_pin is null or p_pin !~ '^[0-9]{4}$' then
    raise exception 'PIN must be exactly 4 digits.';
  end if;

  select * into v_row
  from public.vendors
  where phone = v_phone;

  if not found then
    raise exception 'No application found with this phone number';
  end if;

  if v_row.pin_hash is null
     or v_row.pin_hash <> crypt(p_pin, v_row.pin_hash) then
    raise exception 'Incorrect PIN';
  end if;

  id := v_row.id;
  name := v_row.name;
  verification_status := v_row.verification_status;
  active := v_row.active;
  access_token := v_row.access_token;
  return next;
end;
$$;

revoke all on function public.vendor_login(text, text) from public;
grant execute on function public.vendor_login(text, text) to anon, authenticated;

comment on function public.vendor_login(text, text) is
  'Vendor sign-in. Verifies phone + bcrypt PIN; returns id/name/status/active/access_token (never pin_hash).';

-- -----------------------------------------------------------------------------
-- 3) get_vendor_orders — token → open orders for this vendor
-- -----------------------------------------------------------------------------
create or replace function public.get_vendor_orders(p_token text)
returns setof public.orders
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_vendor public.vendors%rowtype;
begin
  if p_token is null or btrim(p_token) = '' then
    raise exception 'Missing vendor access token.';
  end if;

  select * into v_vendor
  from public.vendors
  where access_token::text = btrim(p_token)
  limit 1;

  if not found then
    raise exception 'Invalid vendor access token.';
  end if;

  return query
  select o.*
  from public.orders o
  where o.vendor_id = v_vendor.id::text
    and o.status not in ('delivered', 'cancelled')
  order by o.created_at asc;
end;
$$;

revoke all on function public.get_vendor_orders(text) from public;
grant execute on function public.get_vendor_orders(text) to anon, authenticated;

comment on function public.get_vendor_orders(text) is
  'Vendor portal: list open orders for the vendor identified by access_token.';

-- -----------------------------------------------------------------------------
-- 4) update_order_status_by_vendor — allowlist: preparing | ready_for_pickup
--
-- Pipeline notes (enforce_order_status_pipeline still applies):
--   pickup:   confirmed → preparing → ready_for_pickup → (passkey) delivered
--   delivery: … → rider_assigned → preparing → (passkey) picked_up
--             ready_for_pickup is NOT a valid delivery status — rejected here
--             and by the pipeline. Delivery preparing also requires rider_id.
-- -----------------------------------------------------------------------------
create or replace function public.update_order_status_by_vendor(
  p_token text,
  p_id text,
  p_new_status text
)
returns public.orders
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_vendor public.vendors%rowtype;
  v_order public.orders%rowtype;
  v_status text;
begin
  if p_token is null or btrim(p_token) = '' then
    raise exception 'Missing vendor access token.';
  end if;
  if p_id is null or btrim(p_id) = '' then
    raise exception 'Missing order id.';
  end if;
  if p_new_status is null or btrim(p_new_status) = '' then
    raise exception 'Missing new status.';
  end if;

  v_status := btrim(p_new_status);

  if v_status not in ('preparing', 'ready_for_pickup') then
    raise exception
      'Vendors can only set status to preparing or ready_for_pickup. Got: %',
      v_status;
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
  limit 1;

  if not found then
    raise exception 'Order not found.';
  end if;

  if v_order.vendor_id is distinct from v_vendor.id::text then
    raise exception 'This order does not belong to this vendor.';
  end if;

  -- ready_for_pickup is pickup-only (delivery kitchen handoff uses passkey → picked_up)
  if v_status = 'ready_for_pickup' and v_order.fulfillment is distinct from 'pickup' then
    raise exception
      'ready_for_pickup is only valid for pickup orders (order % is %).',
      v_order.id, v_order.fulfillment;
  end if;

  update public.orders
  set
    status = v_status,
    vendor_confirmed = true
  where id = v_order.id
  returning * into v_order;

  return v_order;
end;
$$;

revoke all on function public.update_order_status_by_vendor(text, text, text) from public;
grant execute on function public.update_order_status_by_vendor(text, text, text)
  to anon, authenticated;

comment on function public.update_order_status_by_vendor(text, text, text) is
  'Vendor portal: advance own order to preparing or ready_for_pickup (pickup only). Token + vendor_id ownership required.';

-- -----------------------------------------------------------------------------
-- 5) validate_passkey_and_release_by_vendor
--
-- Authz wrapper only — does NOT set escrow itself.
-- After token + ownership checks, calls validate_passkey_and_release which:
--   - verifies passkey
--   - sets suredrop.allow_passkey_release = on (transaction-local)
--   - advances status (delivery→picked_up / pickup→delivered)
--   - releases escrow + payment_state for transfer (not COD)
-- =============================================================================
create or replace function public.validate_passkey_and_release_by_vendor(
  p_token text,
  p_id text,
  p_passkey text
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
  if p_passkey is null or btrim(p_passkey) = '' then
    raise exception 'Missing passkey.';
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

  -- Single escrow-release implementation (GUC + status/payment updates)
  return public.validate_passkey_and_release(btrim(p_id), btrim(p_passkey));
end;
$$;

revoke all on function public.validate_passkey_and_release_by_vendor(text, text, text)
  from public;
grant execute on function public.validate_passkey_and_release_by_vendor(text, text, text)
  to anon, authenticated;

comment on function public.validate_passkey_and_release_by_vendor(text, text, text) is
  'Vendor portal handoff: token + ownership, then delegates to validate_passkey_and_release (sole escrow release path).';
