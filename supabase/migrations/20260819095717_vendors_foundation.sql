-- =============================================================================
-- KampeDrop: vendors table + vendor-photos storage + RLS
-- Paste and run once in Supabase SQL Editor.
-- Assumes: public.is_ops() already exists; pgcrypto already enabled.
-- No application RPCs in this migration.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) vendors
-- -----------------------------------------------------------------------------
create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  area text not null,
  phone text not null,
  hours text,
  about text,
  lat double precision,
  lng double precision,
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'approved', 'needs_info', 'rejected')),
  review_note text,
  active boolean not null default true,
  pin_hash text,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint vendors_phone_unique unique (phone)
);

create index if not exists vendors_verification_status_idx
  on public.vendors (verification_status);

create index if not exists vendors_buyer_visible_idx
  on public.vendors (verification_status, active)
  where verification_status = 'approved' and active = true;

comment on table public.vendors is
  'Partner businesses. Buyer-visible only when approved + active. Signup/login via SECURITY DEFINER RPCs (next step).';
comment on column public.vendors.pin_hash is
  'bcrypt via crypt(pin, gen_salt(''bf'')). Set only inside application RPC — never store plaintext.';
comment on column public.vendors.phone is
  'Unique. Normalize to a single format (e.g. 0XXXXXXXXXX) in the signup RPC before insert.';

-- -----------------------------------------------------------------------------
-- 2) RLS — no anon INSERT/UPDATE; public SELECT only live vendors; ops full read/update
-- -----------------------------------------------------------------------------
alter table public.vendors enable row level security;

drop policy if exists "anon_select_live_vendors" on public.vendors;
drop policy if exists "ops_select_vendors" on public.vendors;
drop policy if exists "ops_update_vendors" on public.vendors;

create policy "anon_select_live_vendors"
  on public.vendors
  for select
  to anon, authenticated
  using (verification_status = 'approved' and active = true);

create policy "ops_select_vendors"
  on public.vendors
  for select
  to authenticated
  using (public.is_ops());

create policy "ops_update_vendors"
  on public.vendors
  for update
  to authenticated
  using (public.is_ops())
  with check (public.is_ops());

grant select on public.vendors to anon, authenticated;
grant update on public.vendors to authenticated;

-- -----------------------------------------------------------------------------
-- 3) Storage: vendor-photos
--    Public read.
--    Anon/authenticated INSERT only under applications/…
--    Ops may INSERT anywhere + UPDATE/DELETE.
--    Path convention: applications/{vendor_id_or_temp}/{n}.jpg
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vendor-photos',
  'vendor-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public_read_vendor_photos" on storage.objects;
drop policy if exists "anon_insert_application_photos" on storage.objects;
drop policy if exists "ops_insert_vendor_photos" on storage.objects;
drop policy if exists "ops_update_vendor_photos" on storage.objects;
drop policy if exists "ops_delete_vendor_photos" on storage.objects;

create policy "public_read_vendor_photos"
  on storage.objects
  for select
  to public
  using (bucket_id = 'vendor-photos');

create policy "anon_insert_application_photos"
  on storage.objects
  for insert
  to anon, authenticated
  with check (
    bucket_id = 'vendor-photos'
    and name like 'applications/%'
  );

create policy "ops_insert_vendor_photos"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'vendor-photos' and public.is_ops());

create policy "ops_update_vendor_photos"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'vendor-photos' and public.is_ops())
  with check (bucket_id = 'vendor-photos' and public.is_ops());

create policy "ops_delete_vendor_photos"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'vendor-photos' and public.is_ops());
