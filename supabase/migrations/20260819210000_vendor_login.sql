-- =============================================================================
-- KampeDrop: vendor_login (SECURITY DEFINER)
-- Phone normalize matches submit_vendor_application → 0XXXXXXXXXX.
-- Returns id/name/status/active only — never pin_hash.
-- =============================================================================

create or replace function public.vendor_login(
  p_phone text,
  p_pin text
)
returns table (
  id uuid,
  name text,
  verification_status text,
  active boolean
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
  return next;
end;
$$;

revoke all on function public.vendor_login(text, text) from public;

grant execute on function public.vendor_login(text, text) to anon, authenticated;

comment on function public.vendor_login(text, text) is
  'Vendor board sign-in. Verifies phone + bcrypt PIN; returns id/name/verification_status/active (never pin_hash).';
