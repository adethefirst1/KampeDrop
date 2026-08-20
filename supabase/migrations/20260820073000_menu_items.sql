-- =============================================================================
-- KampeDrop: public.menu_items + vendor token RPCs
--
-- Buyer visibility: available = true AND parent vendor approved + active
--   (same rule as anon_select_live_vendors).
-- Vendor edits: SECURITY DEFINER RPCs keyed by vendors.access_token —
--   no direct anon/authenticated INSERT/UPDATE/DELETE on the table.
-- Ops: full CRUD via is_ops() RLS policies.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Table
-- -----------------------------------------------------------------------------
create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  name text not null,
  price integer not null,
  description text,
  available boolean not null default true,
  created_at timestamptz not null default now(),
  constraint menu_items_price_nonneg check (price >= 0)
);

create index if not exists menu_items_vendor_id_idx
  on public.menu_items (vendor_id);

create index if not exists menu_items_buyer_visible_idx
  on public.menu_items (vendor_id)
  where available = true;

comment on table public.menu_items is
  'Vendor catalog items. Buyer-visible when available and parent vendor is approved+active. Vendor CRUD via token RPCs only.';
comment on column public.menu_items.price is
  'NGN amount as integer (same unit as orders.subtotal / delivery_fee).';

-- -----------------------------------------------------------------------------
-- 2) RLS
-- -----------------------------------------------------------------------------
alter table public.menu_items enable row level security;

drop policy if exists "anon_select_live_menu_items" on public.menu_items;
drop policy if exists "ops_select_menu_items" on public.menu_items;
drop policy if exists "ops_insert_menu_items" on public.menu_items;
drop policy if exists "ops_update_menu_items" on public.menu_items;
drop policy if exists "ops_delete_menu_items" on public.menu_items;

-- Public: available items whose vendor is buyer-visible
create policy "anon_select_live_menu_items"
  on public.menu_items
  for select
  to anon, authenticated
  using (
    available = true
    and exists (
      select 1
      from public.vendors v
      where v.id = menu_items.vendor_id
        and v.verification_status = 'approved'
        and v.active = true
    )
  );

-- Ops: full access
create policy "ops_select_menu_items"
  on public.menu_items
  for select
  to authenticated
  using (public.is_ops());

create policy "ops_insert_menu_items"
  on public.menu_items
  for insert
  to authenticated
  with check (public.is_ops());

create policy "ops_update_menu_items"
  on public.menu_items
  for update
  to authenticated
  using (public.is_ops())
  with check (public.is_ops());

create policy "ops_delete_menu_items"
  on public.menu_items
  for delete
  to authenticated
  using (public.is_ops());

grant select on public.menu_items to anon, authenticated;
grant insert, update, delete on public.menu_items to authenticated;

-- -----------------------------------------------------------------------------
-- 3) get_vendor_menu_items — portal list (includes unavailable)
-- -----------------------------------------------------------------------------
create or replace function public.get_vendor_menu_items(p_token text)
returns setof public.menu_items
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
  select m.*
  from public.menu_items m
  where m.vendor_id = v_vendor.id
  order by m.created_at asc;
end;
$$;

revoke all on function public.get_vendor_menu_items(text) from public;
grant execute on function public.get_vendor_menu_items(text) to anon, authenticated;

comment on function public.get_vendor_menu_items(text) is
  'Vendor portal: all menu items for this access_token (including unavailable).';

-- -----------------------------------------------------------------------------
-- 4) add_menu_item
-- -----------------------------------------------------------------------------
create or replace function public.add_menu_item(
  p_token text,
  p_name text,
  p_price integer,
  p_description text default null
)
returns public.menu_items
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_vendor public.vendors%rowtype;
  v_name text;
  v_row public.menu_items%rowtype;
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

  v_name := nullif(btrim(coalesce(p_name, '')), '');
  if v_name is null then
    raise exception 'Item name is required.';
  end if;

  if p_price is null or p_price < 0 then
    raise exception 'Price must be a non-negative integer (NGN).';
  end if;

  insert into public.menu_items (vendor_id, name, price, description, available)
  values (
    v_vendor.id,
    v_name,
    p_price,
    nullif(btrim(coalesce(p_description, '')), ''),
    true
  )
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.add_menu_item(text, text, integer, text) from public;
grant execute on function public.add_menu_item(text, text, integer, text)
  to anon, authenticated;

comment on function public.add_menu_item(text, text, integer, text) is
  'Vendor portal: insert a menu item for the vendor identified by access_token.';

-- -----------------------------------------------------------------------------
-- 5) update_menu_item — ownership check required
-- -----------------------------------------------------------------------------
create or replace function public.update_menu_item(
  p_token text,
  p_item_id uuid,
  p_name text,
  p_price integer,
  p_description text,
  p_available boolean
)
returns public.menu_items
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_vendor public.vendors%rowtype;
  v_item public.menu_items%rowtype;
  v_name text;
begin
  if p_token is null or btrim(p_token) = '' then
    raise exception 'Missing vendor access token.';
  end if;
  if p_item_id is null then
    raise exception 'Missing menu item id.';
  end if;

  select * into v_vendor
  from public.vendors
  where access_token::text = btrim(p_token)
  limit 1;

  if not found then
    raise exception 'Invalid vendor access token.';
  end if;

  select * into v_item
  from public.menu_items
  where id = p_item_id
  for update;

  if not found then
    raise exception 'Menu item not found.';
  end if;

  if v_item.vendor_id is distinct from v_vendor.id then
    raise exception 'This menu item does not belong to this vendor.';
  end if;

  v_name := nullif(btrim(coalesce(p_name, '')), '');
  if v_name is null then
    raise exception 'Item name is required.';
  end if;

  if p_price is null or p_price < 0 then
    raise exception 'Price must be a non-negative integer (NGN).';
  end if;

  if p_available is null then
    raise exception 'available must be true or false.';
  end if;

  update public.menu_items
  set
    name = v_name,
    price = p_price,
    description = nullif(btrim(coalesce(p_description, '')), ''),
    available = p_available
  where id = v_item.id
  returning * into v_item;

  return v_item;
end;
$$;

revoke all on function public.update_menu_item(text, uuid, text, integer, text, boolean)
  from public;
grant execute on function public.update_menu_item(text, uuid, text, integer, text, boolean)
  to anon, authenticated;

comment on function public.update_menu_item(text, uuid, text, integer, text, boolean) is
  'Vendor portal: update own menu item (token + vendor_id ownership).';

-- -----------------------------------------------------------------------------
-- 6) delete_menu_item — ownership check required
-- -----------------------------------------------------------------------------
create or replace function public.delete_menu_item(
  p_token text,
  p_item_id uuid
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_vendor public.vendors%rowtype;
  v_item public.menu_items%rowtype;
begin
  if p_token is null or btrim(p_token) = '' then
    raise exception 'Missing vendor access token.';
  end if;
  if p_item_id is null then
    raise exception 'Missing menu item id.';
  end if;

  select * into v_vendor
  from public.vendors
  where access_token::text = btrim(p_token)
  limit 1;

  if not found then
    raise exception 'Invalid vendor access token.';
  end if;

  select * into v_item
  from public.menu_items
  where id = p_item_id
  for update;

  if not found then
    raise exception 'Menu item not found.';
  end if;

  if v_item.vendor_id is distinct from v_vendor.id then
    raise exception 'This menu item does not belong to this vendor.';
  end if;

  delete from public.menu_items where id = v_item.id;
end;
$$;

revoke all on function public.delete_menu_item(text, uuid) from public;
grant execute on function public.delete_menu_item(text, uuid) to anon, authenticated;

comment on function public.delete_menu_item(text, uuid) is
  'Vendor portal: delete own menu item (token + vendor_id ownership).';
