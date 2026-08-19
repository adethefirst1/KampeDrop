-- =============================================================================
-- KampeDrop: orders + riders schema, RPCs, triggers, RLS (LIVE DUMP)
-- Sources:
--   supabase/orders_functions_export.csv  (section 1 — RPCs)
--   supabase/orders_triggers_export.csv   (section 2 — triggers)
--   supabase/section3_export.csv          (section 3 — no new names)
--   supabase/rls_policies_export.csv      (section 4 — RLS)
--   supabase/section5_columns_export.csv  (section 5 — columns)
--   supabase/section5_constraints_export.csv (section 5 — PK / UNIQUE / CHECK)
--   supabase/section6_indexes_export.csv (section 6 — indexes)
--   supabase/section7_grants_export.csv (section 7 — EXECUTE grants)
-- Status: COMPLETE for orders + riders (live dump sections 1–7 + claim_transfer_paid)
--
-- Included from live DB:
--   Tables: public.orders, public.riders (columns + constraints from section 5)
--           PK: orders_pkey (id), riders_pkey (id)
--           UNIQUE: riders_access_token_key
--           CHECK: orders_fulfillment_check, orders_payment_check, riders_status_check
--           Indexes: orders_rider_id_idx, riders_status_idx
--                    (+ PK/UNIQUE indexes via constraints)
--   RPCs: is_ops, get_order_by_id, validate_passkey_and_release,
--         get_rider_orders, update_order_status_by_rider
--   + claim_transfer_paid (authored; was absent live)
--   Triggers on public.orders:
--         trg_enforce_escrow_release_path
--         trg_enforce_order_phone_rate_limit
--         trg_enforce_order_status_pipeline
--   RLS (section 4):
--         orders: anon_insert_orders, ops_select_orders, ops_update_orders
--         riders: ops_insert_riders, ops_select_riders, ops_update_riders
--   Grants (section 7): guest/rider RPCs → anon+authenticated;
--         validate_passkey_and_release → authenticated only (anon denied)
--
-- Bodies below are verbatim from Supabase where exported; claim_transfer_paid
-- is newly authored to match app guards (dollar-quote style normalized to $$).
-- =============================================================================

-- =============================================================================
-- SECTION 5 — Tables + constraints + indexes
-- (columns, constraints, indexes from section 5–6 CSVs)
-- create table if not exists so live projects that already have tables are safe.
-- =============================================================================

create table if not exists public.orders (
  id text not null,
  created_at timestamp with time zone not null default now(),
  customer_name text not null,
  phone text not null,
  address text not null,
  note text not null default ''::text,
  payment text not null,
  fulfillment text not null,
  status text not null,
  passkey text not null,
  escrow_state text not null,
  payment_state text not null,
  delivery_fee integer not null default 0,
  subtotal integer not null,
  total integer not null,
  lines jsonb not null default '[]'::jsonb,
  place_name text,
  place_id text,
  place_lat double precision,
  place_lng double precision,
  vendor_id text,
  vendor_confirmed boolean not null default false,
  rider_id text,
  cancelled_at timestamp with time zone,
  cancel_reason text,
  problem_reason text,
  has_problem boolean not null default false
);

create table if not exists public.riders (
  id uuid not null default gen_random_uuid(),
  name text not null,
  phone text not null,
  vehicle_info text,
  status text not null default 'trial'::text,
  access_token text not null default (gen_random_uuid())::text,
  created_at timestamp with time zone not null default now()
);

-- Constraints (from section5_constraints_export.csv)
-- Use DO blocks so re-runs on an existing live DB don't fail.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'orders_pkey'
  ) then
    alter table public.orders add constraint orders_pkey primary key (id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'orders_fulfillment_check'
  ) then
    alter table public.orders
      add constraint orders_fulfillment_check
      check (fulfillment = any (array['delivery'::text, 'pickup'::text]));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'orders_payment_check'
  ) then
    alter table public.orders
      add constraint orders_payment_check
      check (payment = any (array['cod'::text, 'transfer'::text]));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'riders_pkey'
  ) then
    alter table public.riders add constraint riders_pkey primary key (id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'riders_access_token_key'
  ) then
    alter table public.riders
      add constraint riders_access_token_key unique (access_token);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'riders_status_check'
  ) then
    alter table public.riders
      add constraint riders_status_check
      check (status = any (array['trial'::text, 'active'::text, 'suspended'::text]));
  end if;
end
$$;

-- =============================================================================
-- SECTION 6 — Indexes (from section6_indexes_export.csv)
-- PK/UNIQUE indexes (orders_pkey, riders_pkey, riders_access_token_key) are
-- created by the constraints above — only add the extra btree indexes here.
-- =============================================================================

create index if not exists orders_rider_id_idx
  on public.orders using btree (rider_id);

create index if not exists riders_status_idx
  on public.riders using btree (status);

-- -----------------------------------------------------------------------------
-- is_ops — JWT app_metadata.role = ops
-- -----------------------------------------------------------------------------
create or replace function public.is_ops()
returns boolean
language sql
stable
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'ops',
    false
  );
$$;

-- -----------------------------------------------------------------------------
-- get_order_by_id — guest track-by-id (SECURITY DEFINER, one row max)
-- -----------------------------------------------------------------------------
create or replace function public.get_order_by_id(p_id text)
returns setof public.orders
language sql
security definer
set search_path to 'public'
as $$
  select *
  from public.orders
  where id = p_id
  limit 1;
$$;

-- -----------------------------------------------------------------------------
-- validate_passkey_and_release — only path that may set escrow released
-- (pairs with session GUC suredrop.allow_passkey_release for triggers)
-- -----------------------------------------------------------------------------
create or replace function public.validate_passkey_and_release(p_id text, p_passkey text)
returns public.orders
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  o public.orders;
begin
  select * into o from public.orders where id = p_id for update;
  if not found then
    raise exception 'Order % not found', p_id using errcode = 'P0001';
  end if;

  if o.status = 'cancelled' then
    raise exception 'Order % is cancelled', p_id using errcode = 'P0001';
  end if;

  if trim(p_passkey) is distinct from o.passkey then
    raise exception 'Wrong passkey for order %', p_id using errcode = 'P0001';
  end if;

  -- Allow this transaction to set escrow_state = released (+ status jump)
  perform set_config('suredrop.allow_passkey_release', 'on', true);

  if o.fulfillment = 'delivery' then
    if o.payment = 'cod' then
      update public.orders
      set status = 'picked_up'
      where id = p_id
      returning * into o;
    else
      update public.orders
      set
        status = 'picked_up',
        escrow_state = 'released',
        payment_state = 'released'
      where id = p_id
      returning * into o;
    end if;

  elsif o.fulfillment = 'pickup' then
    if o.payment = 'cod' then
      update public.orders
      set status = 'delivered'
      where id = p_id
      returning * into o;
    else
      update public.orders
      set
        status = 'delivered',
        escrow_state = 'released',
        payment_state = 'released'
      where id = p_id
      returning * into o;
    end if;

  else
    raise exception 'Unknown fulfillment on order %', p_id using errcode = 'P0001';
  end if;

  return o;
end;
$$;

-- -----------------------------------------------------------------------------
-- get_rider_orders — token → open assigned orders
-- -----------------------------------------------------------------------------
create or replace function public.get_rider_orders(p_token text)
returns setof public.orders
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_rider public.riders%rowtype;
begin
  if p_token is null or btrim(p_token) = '' then
    raise exception 'Missing rider access token.';
  end if;

  select * into v_rider
  from public.riders
  where access_token = btrim(p_token)
  limit 1;

  if not found then
    raise exception 'Invalid rider access token.';
  end if;

  if v_rider.status = 'suspended' then
    raise exception 'This rider account is suspended.';
  end if;

  return query
  select o.*
  from public.orders o
  where o.rider_id = v_rider.id::text
    and o.status not in ('delivered', 'cancelled')
  order by o.created_at asc;
end;
$$;

-- -----------------------------------------------------------------------------
-- update_order_status_by_rider — allowlist: on_the_way | delivered only
-- -----------------------------------------------------------------------------
create or replace function public.update_order_status_by_rider(
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
  v_rider public.riders%rowtype;
  v_order public.orders%rowtype;
  v_status text;
begin
  if p_token is null or btrim(p_token) = '' then
    raise exception 'Missing rider access token.';
  end if;
  if p_id is null or btrim(p_id) = '' then
    raise exception 'Missing order id.';
  end if;
  if p_new_status is null or btrim(p_new_status) = '' then
    raise exception 'Missing new status.';
  end if;

  v_status := btrim(p_new_status);

  if v_status not in ('on_the_way', 'delivered') then
    raise exception
      'Riders can only set status to on_the_way or delivered. Got: %', v_status;
  end if;

  select * into v_rider
  from public.riders
  where access_token = btrim(p_token)
  limit 1;

  if not found then
    raise exception 'Invalid rider access token.';
  end if;

  if v_rider.status = 'suspended' then
    raise exception 'This rider account is suspended.';
  end if;

  select * into v_order
  from public.orders
  where id = btrim(p_id)
  limit 1;

  if not found then
    raise exception 'Order not found.';
  end if;

  if v_order.rider_id is distinct from v_rider.id::text then
    raise exception 'This order is not assigned to this rider.';
  end if;

  update public.orders
  set status = v_status
  where id = v_order.id
  returning * into v_order;

  return v_order;
end;
$$;

-- -----------------------------------------------------------------------------
-- claim_transfer_paid — guest “I’ve paid” (SECURITY DEFINER)
-- Frontend: ordersApi.claimTransferPaidInSupabase → rpc('claim_transfer_paid', { p_id })
-- Was never present in live DB (sections 1 + 3); authored to match OpsContext guards.
-- -----------------------------------------------------------------------------
create or replace function public.claim_transfer_paid(p_id text)
returns public.orders
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  o public.orders;
begin
  if p_id is null or btrim(p_id) = '' then
    raise exception 'Missing order id.' using errcode = 'P0001';
  end if;

  select * into o
  from public.orders
  where id = btrim(p_id)
  for update;

  if not found then
    raise exception 'Order % not found', p_id using errcode = 'P0001';
  end if;

  if o.payment is distinct from 'transfer' then
    raise exception 'Not a transfer order.' using errcode = 'P0001';
  end if;

  if o.status = 'cancelled' then
    raise exception 'Order is cancelled.' using errcode = 'P0001';
  end if;

  -- Already claimed — idempotent success
  if o.payment_state = 'transfer_seen' then
    return o;
  end if;

  -- Do not move backward from ops-confirmed / released / refunded
  if o.payment_state in ('transfer_confirmed', 'released', 'refunded') then
    raise exception 'Payment already confirmed.' using errcode = 'P0001';
  end if;

  -- Only advance from early transfer states (and legacy 'held' if present)
  if o.payment_state is distinct from 'transfer_pending'
     and o.payment_state is distinct from 'held'
     and o.payment_state is not null
  then
    raise exception
      'Cannot claim transfer from payment_state "%"',
      o.payment_state
      using errcode = 'P0001';
  end if;

  update public.orders
  set payment_state = 'transfer_seen'
  where id = o.id
  returning * into o;

  return o;
end;
$$;

-- EXECUTE grants: see SECTION 7 at end of file

-- =============================================================================
-- SECTION 2 — Order trigger functions + triggers (from orders_triggers_export.csv)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- enforce_escrow_release_path — block escrow_state → released except via passkey RPC
-- -----------------------------------------------------------------------------
create or replace function public.enforce_escrow_release_path()
returns trigger
language plpgsql
as $$
begin
  if new.escrow_state is distinct from old.escrow_state
     and new.escrow_state = 'released'
     and current_setting('suredrop.allow_passkey_release', true) is distinct from 'on'
  then
    raise exception
      'escrow_state can only become released via validate_passkey_and_release() — direct updates are blocked (order %)',
      old.id
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_escrow_release_path on public.orders;
create trigger trg_enforce_escrow_release_path
  before update on public.orders
  for each row
  execute function public.enforce_escrow_release_path();

-- -----------------------------------------------------------------------------
-- enforce_order_phone_rate_limit — max 3 orders / phone / 15 minutes
-- -----------------------------------------------------------------------------
create or replace function public.enforce_order_phone_rate_limit()
returns trigger
language plpgsql
as $$
declare
  recent_count int;
  phone_norm text;
begin
  phone_norm := regexp_replace(coalesce(new.phone, ''), '\D', '', 'g');

  -- Empty phone: still allow (checkout requires phone in the app)
  if phone_norm = '' then
    return new;
  end if;

  select count(*)::int
  into recent_count
  from public.orders
  where regexp_replace(coalesce(phone, ''), '\D', '', 'g') = phone_norm
    and created_at > now() - interval '15 minutes';

  if recent_count >= 3 then
    raise exception
      'Too many orders from this number recently — please wait a few minutes and try again, or contact support'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_order_phone_rate_limit on public.orders;
create trigger trg_enforce_order_phone_rate_limit
  before insert on public.orders
  for each row
  execute function public.enforce_order_phone_rate_limit();

-- -----------------------------------------------------------------------------
-- enforce_order_status_pipeline — no skip / no reverse; passkey GUC may jump
-- -----------------------------------------------------------------------------
create or replace function public.enforce_order_status_pipeline()
returns trigger
language plpgsql
as $$
declare
  old_rank int;
  new_rank int;
  pipe text[];
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if new.fulfillment = 'pickup' then
    pipe := array['confirmed', 'preparing', 'ready_for_pickup', 'delivered'];
  elsif new.fulfillment = 'delivery' then
    pipe := array[
      'finding_rider', 'rider_assigned', 'preparing',
      'picked_up', 'on_the_way', 'delivered'
    ];
  else
    raise exception 'Unknown fulfillment: %', new.fulfillment using errcode = '22023';
  end if;

  if new.status = 'cancelled' then
    if new.fulfillment = 'pickup' and old.status = 'confirmed' then
      return new;
    end if;
    if new.fulfillment = 'delivery' and old.status = 'finding_rider' then
      return new;
    end if;
    raise exception
      'Cannot cancel order % from status "%" (%). Use has_problem instead.',
      old.id, old.status, new.fulfillment
      using errcode = 'P0001';
  end if;

  new_rank := array_position(pipe, new.status);
  old_rank := array_position(pipe, old.status);

  if new_rank is null then
    raise exception 'Invalid status "%" for % order %', new.status, new.fulfillment, old.id
      using errcode = 'P0001';
  end if;
  if old_rank is null then
    raise exception 'Current status "%" is not valid for % order %', old.status, new.fulfillment, old.id
      using errcode = 'P0001';
  end if;

  -- Passkey RPC may jump to handoff statuses
  if current_setting('suredrop.allow_passkey_release', true) = 'on' then
    if new.fulfillment = 'delivery'
       and new.status = 'picked_up'
       and old.status in ('rider_assigned', 'preparing') then
      if coalesce(new.rider_id, old.rider_id) is null then
        raise exception 'Cannot pick up delivery order % without rider_id', old.id
          using errcode = 'P0001';
      end if;
      return new;
    end if;
    if new.fulfillment = 'pickup'
       and new.status = 'delivered'
       and old.status in ('preparing', 'ready_for_pickup') then
      return new;
    end if;
  end if;

  if new_rank < old_rank then
    raise exception 'Cannot move order % backward from "%" to "%"', old.id, old.status, new.status
      using errcode = 'P0001';
  end if;

  if new_rank > old_rank + 1 then
    raise exception
      'Cannot skip steps on order %: "%" → "%" (next allowed is "%")',
      old.id, old.status, new.status, pipe[old_rank + 1]
      using errcode = 'P0001';
  end if;

  if new.fulfillment = 'delivery'
     and new.status = 'preparing'
     and coalesce(new.rider_id, old.rider_id) is null then
    raise exception
      'Cannot set preparing on delivery order % without rider_id',
      old.id
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_order_status_pipeline on public.orders;
create trigger trg_enforce_order_status_pipeline
  before update on public.orders
  for each row
  execute function public.enforce_order_status_pipeline();

-- =============================================================================
-- SECTION 4 — RLS policies (from supabase/rls_policies_export.csv)
-- Guest track/claim uses SECURITY DEFINER RPCs — no anon SELECT/UPDATE on orders.
-- =============================================================================

alter table public.orders enable row level security;
alter table public.riders enable row level security;

-- orders
drop policy if exists "anon_insert_orders" on public.orders;
drop policy if exists "ops_select_orders" on public.orders;
drop policy if exists "ops_update_orders" on public.orders;

create policy "anon_insert_orders"
  on public.orders
  for insert
  to anon, authenticated
  with check (true);

create policy "ops_select_orders"
  on public.orders
  for select
  to authenticated
  using (public.is_ops());

create policy "ops_update_orders"
  on public.orders
  for update
  to authenticated
  using (public.is_ops())
  with check (public.is_ops());

-- riders (ops only — riders use token RPCs, not table access)
drop policy if exists "ops_insert_riders" on public.riders;
drop policy if exists "ops_select_riders" on public.riders;
drop policy if exists "ops_update_riders" on public.riders;

create policy "ops_insert_riders"
  on public.riders
  for insert
  to authenticated
  with check (public.is_ops());

create policy "ops_select_riders"
  on public.riders
  for select
  to authenticated
  using (public.is_ops());

create policy "ops_update_riders"
  on public.riders
  for update
  to authenticated
  using (public.is_ops())
  with check (public.is_ops());

-- Table grants matching policy intent (RLS still applies)
grant insert on public.orders to anon, authenticated;
grant select, update on public.orders to authenticated;
grant select, insert, update on public.riders to authenticated;

-- =============================================================================
-- SECTION 7 — Function EXECUTE grants (from section7_grants_export.csv)
-- Live matrix: anon may call guest/rider RPCs; validate_passkey is ops-only
-- (authenticated). postgres + service_role always granted for completeness.
-- =============================================================================

-- is_ops()
revoke all on function public.is_ops() from public;
grant execute on function public.is_ops() to anon, authenticated, service_role;

-- get_order_by_id(text)
revoke all on function public.get_order_by_id(text) from public;
grant execute on function public.get_order_by_id(text)
  to anon, authenticated, service_role;

-- claim_transfer_paid(text)
revoke all on function public.claim_transfer_paid(text) from public;
grant execute on function public.claim_transfer_paid(text)
  to anon, authenticated, service_role;

-- get_rider_orders(text)
revoke all on function public.get_rider_orders(text) from public;
grant execute on function public.get_rider_orders(text)
  to anon, authenticated, service_role;

-- update_order_status_by_rider(text, text, text)
revoke all on function public.update_order_status_by_rider(text, text, text) from public;
grant execute on function public.update_order_status_by_rider(text, text, text)
  to anon, authenticated, service_role;

-- validate_passkey_and_release(text, text) — authenticated only (anon = false live)
revoke all on function public.validate_passkey_and_release(text, text) from public;
revoke execute on function public.validate_passkey_and_release(text, text) from anon;
grant execute on function public.validate_passkey_and_release(text, text)
  to authenticated, service_role;

-- =============================================================================
-- END — orders + riders migration complete (live dump sections 1–7 + claim_transfer_paid)
-- =============================================================================
