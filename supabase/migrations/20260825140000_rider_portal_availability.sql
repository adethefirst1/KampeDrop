-- =============================================================================
-- KampeDrop: rider portal — availability / zone + history RPCs
-- REVIEW BEFORE APPLYING
--
-- Token pattern (confirm):
--   Vendors: phone+PIN login → access_token stored in browser session.
--   Riders:  no login. Private link carries riders.access_token
--            (e.g. /rider?token=<access_token>). Same SECURITY DEFINER
--            RPCs already used by get_rider_orders / update_order_status_by_rider.
--
-- This migration:
--   1) riders.available + riders.current_zone (+ zone_updated_at)
--   2) get_rider_me — profile for portal shell
--   3) set_rider_availability — available + zone from curated landmark id
--   4) get_rider_order_history — delivered only (mirrors get_vendor_order_history)
--   Existing get_rider_orders / update_order_status_by_rider unchanged.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Availability + current zone
--    current_zone = curated landmark id from src/data/places.ts
--    (e.g. 'ajara-junction', 'ibereko'). Frontend constrains the picker;
--    RPC requires a non-empty zone when going available.
-- -----------------------------------------------------------------------------
alter table public.riders
  add column if not exists available boolean not null default false;

alter table public.riders
  add column if not exists current_zone text;

alter table public.riders
  add column if not exists zone_updated_at timestamptz;

comment on column public.riders.available is
  'Rider marked themselves on-duty for new assignments. Ops filters on this.';
comment on column public.riders.current_zone is
  'Curated landmark id (checkout PlacePicker list). Null/ignored when not available.';
comment on column public.riders.zone_updated_at is
  'Last time available or current_zone changed via set_rider_availability.';

create index if not exists riders_available_zone_idx
  on public.riders (available, current_zone)
  where available = true;

-- -----------------------------------------------------------------------------
-- 2) get_rider_me — name + availability for portal header
-- -----------------------------------------------------------------------------
create or replace function public.get_rider_me(p_token text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v public.riders%rowtype;
begin
  if p_token is null or btrim(p_token) = '' then
    raise exception 'Missing rider access token.';
  end if;

  select * into v
  from public.riders
  where access_token = btrim(p_token)
  limit 1;

  if not found then
    raise exception 'Invalid rider access token.';
  end if;

  if v.status = 'suspended' then
    raise exception 'This rider account is suspended.';
  end if;

  return jsonb_build_object(
    'id', v.id,
    'name', v.name,
    'phone', v.phone,
    'vehicle_info', v.vehicle_info,
    'status', v.status,
    'available', v.available,
    'current_zone', v.current_zone,
    'zone_updated_at', v.zone_updated_at
  );
end;
$$;

revoke all on function public.get_rider_me(text) from public;
grant execute on function public.get_rider_me(text)
  to anon, authenticated, service_role;

comment on function public.get_rider_me(text) is
  'Rider portal: profile + availability for the access_token in the private link.';

-- -----------------------------------------------------------------------------
-- 3) set_rider_availability — Available + zone (or go offline)
-- -----------------------------------------------------------------------------
create or replace function public.set_rider_availability(
  p_token text,
  p_available boolean,
  p_zone text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v public.riders%rowtype;
  v_zone text;
begin
  if p_token is null or btrim(p_token) = '' then
    raise exception 'Missing rider access token.';
  end if;

  if p_available is null then
    raise exception 'available must be true or false.';
  end if;

  v_zone := nullif(btrim(coalesce(p_zone, '')), '');

  if p_available and v_zone is null then
    raise exception 'Pick your current area before going available.'
      using errcode = 'P0001';
  end if;

  select * into v
  from public.riders
  where access_token = btrim(p_token)
  for update;

  if not found then
    raise exception 'Invalid rider access token.';
  end if;

  if v.status = 'suspended' then
    raise exception 'This rider account is suspended.';
  end if;

  update public.riders
  set
    available = p_available,
    -- Keep last zone when going offline so ops can see last known area;
    -- require a zone when going available (may update it).
    current_zone = case
      when p_available then v_zone
      else current_zone
    end,
    zone_updated_at = now()
  where id = v.id
  returning * into v;

  return jsonb_build_object(
    'id', v.id,
    'name', v.name,
    'available', v.available,
    'current_zone', v.current_zone,
    'zone_updated_at', v.zone_updated_at
  );
end;
$$;

revoke all on function public.set_rider_availability(text, boolean, text) from public;
grant execute on function public.set_rider_availability(text, boolean, text)
  to anon, authenticated, service_role;

comment on function public.set_rider_availability(text, boolean, text) is
  'Rider portal: set on-duty + curated landmark id, or go offline (keeps last zone).';

-- -----------------------------------------------------------------------------
-- 4) get_rider_order_history — delivered only (read-only)
-- -----------------------------------------------------------------------------
create or replace function public.get_rider_order_history(p_token text)
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
    and o.status = 'delivered'
  order by o.created_at desc
  limit 100;
end;
$$;

revoke all on function public.get_rider_order_history(text) from public;
grant execute on function public.get_rider_order_history(text)
  to anon, authenticated, service_role;

comment on function public.get_rider_order_history(text) is
  'Rider portal: delivered orders for this access_token (newest first).';

-- -----------------------------------------------------------------------------
-- Ops "Available riders" view needs no new RPC:
--   ops already has SELECT on public.riders via is_ops() RLS.
--   Frontend: .from('riders').select('id,name,phone,available,current_zone,zone_updated_at,status')
--             .eq('available', true)
--   access_token remains readable by ops (for copying private /rider?token= links).
-- -----------------------------------------------------------------------------
