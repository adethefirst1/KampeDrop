-- =============================================================================
-- KampeDrop: get_vendor_orders — hide unpaid card/transfer until confirmed
-- REVIEW BEFORE APPLYING
--
-- Vendor board only. Ops fetch (fetchAllOrdersFromSupabase / admin inbox) is
-- a direct table SELECT under is_ops() — unchanged.
--
-- Rules:
--   • COD — show immediately (no payment_state gate)
--   • card — only when payment_state in (card_paid, released)
--   • transfer — only when payment_state in (transfer_confirmed, released)
--
-- `released` is included because validate_passkey_and_release flips
-- payment_state to released at handoff while status may still be open
-- (e.g. delivery picked_up / on_the_way). Without it, paid active orders
-- would disappear from the vendor board after passkey.
-- =============================================================================

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
    and (
      o.payment = 'cod'
      or (
        o.payment = 'card'
        and o.payment_state in ('card_paid', 'released')
      )
      or (
        o.payment = 'transfer'
        and o.payment_state in ('transfer_confirmed', 'released')
      )
    )
  order by o.created_at asc;
end;
$$;

revoke all on function public.get_vendor_orders(text) from public;
grant execute on function public.get_vendor_orders(text) to anon, authenticated;

comment on function public.get_vendor_orders(text) is
  'Vendor portal: open orders for this access_token. COD always; card/transfer only after confirmed payment (card_paid / transfer_confirmed / released).';
