-- =============================================================================
-- KampeDrop: get_order_by_id — include rider name + phone for Track
-- REVIEW BEFORE APPLYING
--
-- RLS note:
--   Guests have no SELECT on public.riders (ops-only policies). They also
--   cannot join riders from the client. Track must get rider contact through
--   this SECURITY DEFINER RPC (same pattern as order fields today).
--
-- Safety:
--   LEFT JOIN riders, but only project r.name + r.phone into the payload.
--   Never expose access_token, pin_hash, available, current_zone, etc.
--
-- Shape change:
--   Was: returns setof public.orders (order columns only; rider_id uuid text).
--   Now: returns jsonb = to_jsonb(order) || { rider_name, rider_phone }.
--   DROP required (return type change). Frontend must read the new keys
--   (next step — not in this migration).
-- =============================================================================

drop function if exists public.get_order_by_id(text);

create function public.get_order_by_id(p_id text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_order public.orders%rowtype;
  v_rider_name text;
  v_rider_phone text;
begin
  if p_id is null or btrim(p_id) = '' then
    return null;
  end if;

  select * into v_order
  from public.orders
  where id = btrim(p_id)
  limit 1;

  if not found then
    return null;
  end if;

  v_rider_name := null;
  v_rider_phone := null;

  if v_order.rider_id is not null and btrim(v_order.rider_id) <> '' then
    select r.name, r.phone
    into v_rider_name, v_rider_phone
    from public.riders r
    where r.id::text = btrim(v_order.rider_id)
    limit 1;
  end if;

  return to_jsonb(v_order) || jsonb_build_object(
    'rider_name', v_rider_name,
    'rider_phone', v_rider_phone
  );
end;
$$;

revoke all on function public.get_order_by_id(text) from public;
grant execute on function public.get_order_by_id(text)
  to anon, authenticated, service_role;

comment on function public.get_order_by_id(text) is
  'Guest track-by-id. Returns one order as jsonb plus rider_name/rider_phone when rider_id is set. Never includes riders.access_token or pin_hash.';
