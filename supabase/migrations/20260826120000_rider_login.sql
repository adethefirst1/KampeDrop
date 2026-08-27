-- =============================================================================
-- KampeDrop: rider phone + PIN login (mirrors vendor_login)
-- REVIEW BEFORE APPLYING
--
-- 1) riders.pin_hash — bcrypt via crypt(pin, gen_salt('bf'))
-- 2) rider_login(p_phone, p_pin) — normalize phone, verify PIN, return
--    access_token / name / status (never pin_hash)
-- 3) ops_create_rider / ops_set_rider_pin — is_ops() helpers so PIN is
--    hashed server-side (no admin UI yet; table insert can't safely set
--    pin_hash from the client once SELECT on pin_hash is revoked)
--
-- Direct /rider?token=… stays valid — this is additive.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) pin_hash + phone uniqueness (login key)
-- -----------------------------------------------------------------------------
alter table public.riders
  add column if not exists pin_hash text;

comment on column public.riders.pin_hash is
  'bcrypt via crypt(pin, gen_salt(''bf'')). Set only inside ops RPCs — never store plaintext.';

-- Login looks up by normalized 0XXXXXXXXXX. Enforce uniqueness when possible.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'riders_phone_unique'
  ) then
    alter table public.riders
      add constraint riders_phone_unique unique (phone);
  end if;
end
$$;

-- Harden: anon/authenticated must not read pin_hash (ops RLS SELECT still
-- cannot project this column). access_token stays selectable by ops for
-- private-link copy on the Available riders panel.
revoke select (pin_hash) on table public.riders from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2) rider_login — same shape as vendor_login
--    Auth failures use one message (stricter than vendor_login, which still
--    distinguishes missing phone vs wrong PIN).
-- -----------------------------------------------------------------------------
create or replace function public.rider_login(
  p_phone text,
  p_pin text
)
returns table (
  id uuid,
  name text,
  status text,
  access_token text
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_phone text;
  v_national text;
  v_row public.riders%rowtype;
begin
  -- Normalize phone → 0XXXXXXXXXX (same as vendor_login / submit_vendor_application)
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
  from public.riders
  where phone = v_phone;

  -- Unified failure — do not reveal whether phone or PIN was wrong.
  if not found
     or v_row.pin_hash is null
     or v_row.pin_hash <> crypt(p_pin, v_row.pin_hash) then
    raise exception 'Invalid phone or PIN.';
  end if;

  if v_row.status = 'suspended' then
    raise exception 'This rider account is suspended.';
  end if;

  id := v_row.id;
  name := v_row.name;
  status := v_row.status;
  access_token := v_row.access_token;
  return next;
end;
$$;

revoke all on function public.rider_login(text, text) from public;
grant execute on function public.rider_login(text, text) to anon, authenticated;

comment on function public.rider_login(text, text) is
  'Rider sign-in. Verifies phone + bcrypt PIN; returns id/name/status/access_token (never pin_hash).';

-- -----------------------------------------------------------------------------
-- 3) Ops helpers — create rider / set PIN (is_ops session)
--    There is no admin create-rider UI yet; use these instead of raw INSERT
--    so pin_hash is always bcrypt and phone is normalized.
-- -----------------------------------------------------------------------------
create or replace function public.ops_create_rider(
  p_name text,
  p_phone text,
  p_pin text,
  p_vehicle_info text default null,
  p_status text default 'trial'
)
returns table (
  id uuid,
  name text,
  phone text,
  status text,
  access_token text
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_phone text;
  v_national text;
  v_status text;
  v_row public.riders%rowtype;
begin
  if not public.is_ops() then
    raise exception 'Ops only.';
  end if;

  if p_name is null or btrim(p_name) = '' then
    raise exception 'Name is required.';
  end if;

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

  v_status := coalesce(nullif(btrim(p_status), ''), 'trial');
  if v_status not in ('trial', 'active', 'suspended') then
    raise exception 'Invalid rider status.';
  end if;

  insert into public.riders (name, phone, pin_hash, vehicle_info, status)
  values (
    btrim(p_name),
    v_phone,
    crypt(p_pin, gen_salt('bf')),
    nullif(btrim(coalesce(p_vehicle_info, '')), ''),
    v_status
  )
  returning * into v_row;

  id := v_row.id;
  name := v_row.name;
  phone := v_row.phone;
  status := v_row.status;
  access_token := v_row.access_token;
  return next;
end;
$$;

revoke all on function public.ops_create_rider(text, text, text, text, text) from public;
grant execute on function public.ops_create_rider(text, text, text, text, text)
  to authenticated;

comment on function public.ops_create_rider(text, text, text, text, text) is
  'Ops: create rider with bcrypt PIN. Returns access_token for /rider?token=… link.';

create or replace function public.ops_set_rider_pin(
  p_rider_id uuid,
  p_pin text
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.is_ops() then
    raise exception 'Ops only.';
  end if;

  if p_rider_id is null then
    raise exception 'Missing rider id.';
  end if;

  if p_pin is null or p_pin !~ '^[0-9]{4}$' then
    raise exception 'PIN must be exactly 4 digits.';
  end if;

  update public.riders
  set pin_hash = crypt(p_pin, gen_salt('bf'))
  where id = p_rider_id;

  if not found then
    raise exception 'Rider not found.';
  end if;
end;
$$;

revoke all on function public.ops_set_rider_pin(uuid, text) from public;
grant execute on function public.ops_set_rider_pin(uuid, text) to authenticated;

comment on function public.ops_set_rider_pin(uuid, text) is
  'Ops: set / reset a rider bcrypt PIN (for existing rows created before login).';
