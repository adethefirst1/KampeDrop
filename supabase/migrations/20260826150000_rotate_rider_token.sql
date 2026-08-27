-- =============================================================================
-- KampeDrop: rotate_rider_token — invalidate private link (logout everywhere)
-- REVIEW BEFORE APPLYING
--
-- Validates the current access_token, replaces it with a fresh uuid text
-- (same default as riders.access_token), so old /rider?token=… links and
-- browser-back URLs stop working immediately.
--
-- PIN login (rider_login) always returns the current token — unaffected.
-- =============================================================================

create or replace function public.rotate_rider_token(p_token text)
returns void
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
  for update;

  if not found then
    raise exception 'Invalid rider access token.';
  end if;

  if v.status = 'suspended' then
    raise exception 'This rider account is suspended.';
  end if;

  update public.riders
  set access_token = (gen_random_uuid())::text
  where id = v.id;
end;
$$;

revoke all on function public.rotate_rider_token(text) from public;
grant execute on function public.rotate_rider_token(text)
  to anon, authenticated, service_role;

comment on function public.rotate_rider_token(text) is
  'Rider portal: invalidate current private link by rotating access_token. Old tokens stop working; rider_login returns the new one.';
