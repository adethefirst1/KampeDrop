-- =============================================================================
-- KampeDrop: dump live orders + riders DDL for migration export
-- Run in Supabase SQL Editor → copy the full result set(s) back to the agent.
-- Anon/publishable keys cannot read pg_catalog this way from the app — this
-- must be run as a privileged SQL Editor session.
-- =============================================================================

-- 1) Functions we care about (definitions)
select
  n.nspname as schema,
  p.proname as name,
  pg_get_function_identity_arguments(p.oid) as args,
  pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'is_ops',
    'get_order_by_id',
    'validate_passkey_and_release',
    'claim_transfer_paid',
    'get_rider_orders',
    'update_order_status_by_rider'
  )
order by p.proname, 3;

-- 2) Triggers on orders (+ any related)
select
  c.relname as table_name,
  t.tgname as trigger_name,
  pg_get_triggerdef(t.oid, true) as definition,
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
where n.nspname = 'public'
  and not t.tgisinternal
  and (
    c.relname in ('orders', 'riders')
    or p.proname ilike '%order%'
    or p.proname ilike '%escrow%'
    or p.proname ilike '%rate%limit%'
    or p.proname ilike '%phone%'
    or t.tgname ilike '%order%'
    or t.tgname ilike '%escrow%'
    or t.tgname ilike '%rate%'
    or t.tgname ilike '%phone%'
  )
order by c.relname, t.tgname;

-- 3) ALL public trigger functions that look order/escrow/rate related
--    (catches renamed helpers)
select
  p.proname as name,
  pg_get_function_identity_arguments(p.oid) as args,
  pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and (
    p.proname ilike '%order%status%'
    or p.proname ilike '%escrow%'
    or p.proname ilike '%rate%limit%'
    or p.proname ilike '%phone%order%'
    or p.proname ilike 'enforce_%'
    or p.proname ilike '%passkey%'
    or p.proname ilike '%claim_transfer%'
  )
order by p.proname;

-- 4) RLS policies on orders + riders
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('orders', 'riders')
order by tablename, policyname;

-- 5) Table DDL-ish: columns + constraints for orders + riders
select
  c.relname as table_name,
  a.attname as column_name,
  pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type,
  a.attnotnull as not_null,
  pg_get_expr(ad.adbin, ad.adrelid) as default_expr
from pg_attribute a
join pg_class c on c.oid = a.attrelid
join pg_namespace n on n.oid = c.relnamespace
left join pg_attrdef ad on ad.adrelid = a.attrelid and ad.adnum = a.attnum
where n.nspname = 'public'
  and c.relname in ('orders', 'riders')
  and a.attnum > 0
  and not a.attisdropped
order by c.relname, a.attnum;

select
  con.conname,
  c.relname as table_name,
  pg_get_constraintdef(con.oid, true) as definition
from pg_constraint con
join pg_class c on c.oid = con.conrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('orders', 'riders')
order by c.relname, con.conname;

-- 6) Indexes on orders + riders
select
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('orders', 'riders')
order by tablename, indexname;

-- 7) Grants on the functions above
select
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as args,
  r.rolname as grantee,
  has_function_privilege(r.oid, p.oid, 'EXECUTE') as can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join pg_roles r
where n.nspname = 'public'
  and p.proname in (
    'is_ops',
    'get_order_by_id',
    'validate_passkey_and_release',
    'claim_transfer_paid',
    'get_rider_orders',
    'update_order_status_by_rider'
  )
  and r.rolname in ('anon', 'authenticated', 'service_role', 'postgres')
order by p.proname, r.rolname;
