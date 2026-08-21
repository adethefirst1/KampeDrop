-- =============================================================================
-- KampeDrop: vendor portal — fulfilled / cancelled order history
-- Review in SQL Editor, then run (or apply via migration).
-- =============================================================================

create or replace function public.get_vendor_order_history(p_token text)
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
    and o.status in ('delivered', 'cancelled')
  order by o.created_at desc;
end;
$$;

revoke all on function public.get_vendor_order_history(text) from public;
grant execute on function public.get_vendor_order_history(text) to anon, authenticated;

comment on function public.get_vendor_order_history(text) is
  'Vendor portal: delivered + cancelled orders for the vendor identified by access_token (newest first).';
