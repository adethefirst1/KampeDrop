-- =============================================================================
-- KampeDrop: submit_vendor_application (SECURITY DEFINER)
-- Paste and run in Supabase SQL Editor.
-- Requires: public.vendors, pgcrypto (extensions.crypt / gen_salt).
-- =============================================================================

create or replace function public.submit_vendor_application(
  p_name text,
  p_category text,
  p_area text,
  p_phone text,
  p_hours text,
  p_about text,
  p_pin text,
  p_lat double precision default null,
  p_lng double precision default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_phone text;
  v_national text;
  v_name text;
  v_category text;
  v_area text;
  v_id uuid;
begin
  -- Required text fields
  v_name := nullif(btrim(coalesce(p_name, '')), '');
  v_category := nullif(btrim(coalesce(p_category, '')), '');
  v_area := nullif(btrim(coalesce(p_area, '')), '');

  if v_name is null then
    raise exception 'Business name is required.';
  end if;

  if v_category is null or v_category not in ('food', 'mart', 'pharmacy') then
    raise exception 'Category must be food, mart, or pharmacy.';
  end if;

  if v_area is null then
    raise exception 'Area is required.';
  end if;

  -- 1) Normalize phone → 0XXXXXXXXXX (11 digits)
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

  -- 2) PIN: exactly 4 digits
  if p_pin is null or p_pin !~ '^[0-9]{4}$' then
    raise exception 'PIN must be exactly 4 digits.';
  end if;

  -- 3) Phone uniqueness (clear error; unique constraint is the race-safe backstop)
  if exists (select 1 from public.vendors where phone = v_phone) then
    raise exception 'An application with this phone number already exists';
  end if;

  -- 4–6) Insert pending + inactive; hash PIN only in the INSERT expression
  begin
    insert into public.vendors (
      name,
      category,
      area,
      phone,
      hours,
      about,
      lat,
      lng,
      verification_status,
      active,
      pin_hash,
      submitted_at
    )
    values (
      v_name,
      v_category,
      v_area,
      v_phone,
      nullif(btrim(coalesce(p_hours, '')), ''),
      nullif(btrim(coalesce(p_about, '')), ''),
      p_lat,
      p_lng,
      'pending',
      false,
      crypt(p_pin, gen_salt('bf')),
      now()
    )
    returning id into v_id;
  exception
    when unique_violation then
      raise exception 'An application with this phone number already exists';
  end;

  return v_id;
end;
$$;

revoke all on function public.submit_vendor_application(
  text, text, text, text, text, text, text, double precision, double precision
) from public;

grant execute on function public.submit_vendor_application(
  text, text, text, text, text, text, text, double precision, double precision
) to anon, authenticated;

comment on function public.submit_vendor_application(
  text, text, text, text, text, text, text, double precision, double precision
) is
  'Anon/authenticated vendor signup. Inserts pending+inactive row; returns id for applications/{id}/ photo uploads. PIN stored only as bcrypt hash.';
