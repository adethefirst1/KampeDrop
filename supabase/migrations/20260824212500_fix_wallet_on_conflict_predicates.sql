-- =============================================================================
-- Fix ON CONFLICT predicates to match partial unique indexes exactly.
-- Postgres 42P10: inference WHERE must equal the index predicate.
-- =============================================================================

create or replace function public._wallet_credit_order(
  p_vendor_id uuid,
  p_order_id text,
  p_subtotal integer
)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  inserted_id uuid;
begin
  if p_vendor_id is null then
    raise exception 'wallet credit: missing vendor_id for order %', p_order_id
      using errcode = 'P0001';
  end if;

  if p_subtotal is null or p_subtotal <= 0 then
    return false;
  end if;

  perform 1 from public.vendors where id = p_vendor_id for update;
  if not found then
    raise exception 'wallet credit: vendor % not found (order %)', p_vendor_id, p_order_id
      using errcode = 'P0001';
  end if;

  insert into public.wallet_transactions (vendor_id, order_id, amount, type, note)
  values (
    p_vendor_id,
    p_order_id,
    p_subtotal,
    'order_credit',
    'Escrow released — vendor share (full subtotal, 0% commission)'
  )
  on conflict (order_id)
  where (type = 'order_credit' and order_id is not null)
  do nothing
  returning id into inserted_id;

  if inserted_id is null then
    return false;
  end if;

  update public.vendors
  set wallet_balance = wallet_balance + p_subtotal
  where id = p_vendor_id;

  return true;
end;
$$;

create or replace function public.mark_withdrawal_paid(
  p_withdrawal_id uuid,
  p_note text default null
)
returns public.wallet_withdrawals
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  w public.wallet_withdrawals;
  inserted_id uuid;
begin
  if not public.is_ops() then
    raise exception 'Ops only.';
  end if;

  select * into w
  from public.wallet_withdrawals
  where id = p_withdrawal_id
  for update;

  if not found then
    raise exception 'Withdrawal % not found', p_withdrawal_id using errcode = 'P0001';
  end if;

  if w.status = 'paid' then
    return w;
  end if;

  if w.status = 'rejected' then
    raise exception 'Withdrawal % was rejected and cannot be marked paid', p_withdrawal_id
      using errcode = 'P0001';
  end if;

  if w.status is distinct from 'pending' then
    raise exception 'Withdrawal % is not pending (status %)', p_withdrawal_id, w.status
      using errcode = 'P0001';
  end if;

  perform 1 from public.vendors where id = w.vendor_id for update;

  update public.vendors
  set wallet_balance = wallet_balance - w.amount
  where id = w.vendor_id and wallet_balance >= w.amount;

  if not found then
    raise exception
      'Insufficient wallet_balance to pay withdrawal % (race or bad data)',
      p_withdrawal_id
      using errcode = 'P0001';
  end if;

  insert into public.wallet_transactions (
    vendor_id, order_id, withdrawal_id, amount, type, note
  )
  values (
    w.vendor_id,
    null,
    w.id,
    -w.amount,
    'withdrawal_paid',
    coalesce(p_note, 'Ops marked bank transfer sent')
  )
  on conflict (withdrawal_id)
  where (type = 'withdrawal_paid' and withdrawal_id is not null)
  do nothing
  returning id into inserted_id;

  if inserted_id is null then
    raise exception 'Ledger row already exists for withdrawal % — investigate before retry',
      p_withdrawal_id
      using errcode = 'P0001';
  end if;

  update public.wallet_withdrawals
  set
    status = 'paid',
    resolved_at = now(),
    note = coalesce(p_note, note)
  where id = w.id
  returning * into w;

  return w;
end;
$$;

comment on function public._wallet_credit_order(uuid, text, integer) is
  'Idempotent order_credit + balance bump. ON CONFLICT predicate matches unique partial index.';

comment on function public.mark_withdrawal_paid(uuid, text) is
  'Ops only. After real bank transfer: decrement wallet_balance, post withdrawal_paid ledger, mark paid.';
