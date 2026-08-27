-- =============================================================================
-- KampeDrop: structured vendor open/close times (WAT)
--
-- hours (text) stays as a human display string vendors/ops can edit.
-- open_time / close_time are the ONLY source of truth for is-open checks.
--
-- Ops fills open_time/close_time per vendor manually — no automated parse
-- of free-text hours in this migration.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Columns
-- -----------------------------------------------------------------------------
alter table public.vendors
  add column if not exists open_time time without time zone,
  add column if not exists close_time time without time zone;

alter table public.vendors
  drop constraint if exists vendors_open_close_pair;

alter table public.vendors
  add constraint vendors_open_close_pair
  check (
    (open_time is null and close_time is null)
    or (open_time is not null and close_time is not null)
  );

comment on column public.vendors.hours is
  'Free-text display string only (e.g. “Mon–Sat · 10:00 – 21:00”). Never used for open/closed logic.';

comment on column public.vendors.open_time is
  'Local opening time in Africa/Lagos (WAT). Paired with close_time. Null = not configured → treated as closed for ordering.';

comment on column public.vendors.close_time is
  'Local closing time in Africa/Lagos (WAT). May be earlier than open_time when hours cross midnight (e.g. 18:00–02:00).';

-- -----------------------------------------------------------------------------
-- 2) is_open — West Africa Time, midnight-safe
--
-- Same-day window:   open_time <= close_time  →  open if open_time <= now < close_time
-- Overnight window:  open_time >  close_time  →  open if now >= open_time OR now < close_time
-- Missing either time → false (ops must set both before the shop can take orders by clock)
-- -----------------------------------------------------------------------------
create or replace function public.is_vendor_open_at(
  p_open_time time,
  p_close_time time,
  p_at timestamptz default now()
)
returns boolean
language sql
stable
as $$
  select case
    when p_open_time is null or p_close_time is null then false
    when p_open_time = p_close_time then false  -- ambiguous; refuse rather than invent 24h
    when p_open_time < p_close_time then
      -- e.g. 09:00–21:00
      (p_at at time zone 'Africa/Lagos')::time >= p_open_time
      and (p_at at time zone 'Africa/Lagos')::time < p_close_time
    else
      -- overnight e.g. 18:00–02:00: open from open until midnight, and from midnight until close
      (p_at at time zone 'Africa/Lagos')::time >= p_open_time
      or (p_at at time zone 'Africa/Lagos')::time < p_close_time
  end;
$$;

revoke all on function public.is_vendor_open_at(time, time, timestamptz) from public;
grant execute on function public.is_vendor_open_at(time, time, timestamptz)
  to anon, authenticated, service_role;

comment on function public.is_vendor_open_at(time, time, timestamptz) is
  'True when local Africa/Lagos clock is inside [open, close), including overnight windows. Null times → false.';

-- Convenience: row-level helper for RPCs / SQL Editor checks
create or replace function public.is_vendor_open(p_vendor_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select public.is_vendor_open_at(v.open_time, v.close_time, now())
  from public.vendors v
  where v.id = p_vendor_id;
$$;

revoke all on function public.is_vendor_open(uuid) from public;
grant execute on function public.is_vendor_open(uuid)
  to anon, authenticated, service_role;

comment on function public.is_vendor_open(uuid) is
  'Whether this vendor is open right now (WAT). False if vendor missing or times unset.';

-- -----------------------------------------------------------------------------
-- 3) Ops notes (manual backfill — not automated)
-- -----------------------------------------------------------------------------
-- For each live vendor, set both times in SQL Editor or ops UI, e.g.:
--
--   update public.vendors
--   set open_time = time '10:00', close_time = time '21:00'
--   where id = '…';
--
-- Overnight:
--   update public.vendors
--   set open_time = time '18:00', close_time = time '02:00'
--   where id = '…';
--
-- hours text can stay as-is for display until ops rewrites it.
