-- =============================================================================
-- KampeDrop: Paystack payout RPCs
-- REVIEW BEFORE APPLYING — financial; show grants carefully.
--
-- Contents:
--   1) Helper: reserved (not-yet-debited) withdrawal total
--   2) get_vendor_wallet — available math for pending/processing/needs_otp
--   3) request_withdrawal — bank required + auto_payout_threshold split
--   4) record_payout_initiated — SERVICE_ROLE ONLY (Edge after Paystack accept)
--   5) finalize_withdrawal_paid — SERVICE_ROLE ONLY (webhook success)
--   6) fail_withdrawal_payout — SERVICE_ROLE ONLY (webhook fail/reverse)
--   7) mark_withdrawal_paid — ops manual override (authenticated is_ops)
--   8) reject_withdrawal — pending only (before money moves)
--
-- Privilege rule for (4)(5)(6):
--   Confirmed real money movement. Callable only from Edge Functions via
--   SUPABASE_SERVICE_ROLE_KEY. Never grant to anon or authenticated.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Reserved amount: in-flight rows that have NOT yet debited wallet_balance
--    (no paystack_transfer_code yet). After initiate, balance is already down;
--    do not double-subtract processing/needs_otp from available.
-- -----------------------------------------------------------------------------
create or replace function public._wallet_reserved_undebited(p_vendor_id uuid)
returns integer
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(sum(amount), 0)::integer
  from public.wallet_withdrawals
  where vendor_id = p_vendor_id
    and status in ('pending', 'processing', 'needs_otp')
    and paystack_transfer_code is null;
$$;

revoke all on function public._wallet_reserved_undebited(uuid) from public;
-- Internal helper — not granted to anon/authenticated.

comment on function public._wallet_reserved_undebited(uuid) is
  'Sum of pending/processing/needs_otp amounts not yet debited (no transfer_code).';

-- -----------------------------------------------------------------------------
-- 2) get_vendor_wallet
-- -----------------------------------------------------------------------------
create or replace function public.get_vendor_wallet(p_token text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v public.vendors%rowtype;
  v_reserved integer;
  v_available integer;
begin
  if p_token is null or btrim(p_token) = '' then
    raise exception 'Missing vendor access token.';
  end if;

  select * into v
  from public.vendors
  where access_token::text = btrim(p_token)
  limit 1;

  if not found then
    raise exception 'Invalid vendor access token.';
  end if;

  v_reserved := public._wallet_reserved_undebited(v.id);
  v_available := v.wallet_balance - v_reserved;
  if v_available < 0 then
    v_available := 0;
  end if;

  return jsonb_build_object(
    'vendor_id', v.id,
    'wallet_balance', v.wallet_balance,
    'pending_withdrawal_total', v_reserved,
    'available_to_withdraw', v_available,
    'bank', jsonb_build_object(
      'bank_name', v.bank_name,
      'bank_code', v.bank_code,
      'account_number', v.account_number,
      'account_name', v.account_name,
      'has_recipient', v.paystack_recipient_code is not null
    ),
    'transactions', coalesce((
      select jsonb_agg(t order by t->>'created_at' desc)
      from (
        select jsonb_build_object(
          'id', wt.id,
          'order_id', wt.order_id,
          'withdrawal_id', wt.withdrawal_id,
          'amount', wt.amount,
          'type', wt.type,
          'note', wt.note,
          'created_at', wt.created_at
        ) as t
        from public.wallet_transactions wt
        where wt.vendor_id = v.id
        order by wt.created_at desc
        limit 50
      ) s
    ), '[]'::jsonb),
    'withdrawals', coalesce((
      select jsonb_agg(w order by w->>'requested_at' desc)
      from (
        select jsonb_build_object(
          'id', ww.id,
          'amount', ww.amount,
          'status', ww.status,
          'note', ww.note,
          'requested_at', ww.requested_at,
          'resolved_at', ww.resolved_at,
          'paid_via', ww.paid_via,
          'paystack_transfer_code', ww.paystack_transfer_code,
          'paystack_reference', ww.paystack_reference
        ) as w
        from public.wallet_withdrawals ww
        where ww.vendor_id = v.id
        order by ww.requested_at desc
        limit 50
      ) s
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_vendor_wallet(text) from public;
grant execute on function public.get_vendor_wallet(text) to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 3) request_withdrawal — bank gate + threshold → pending | processing
-- -----------------------------------------------------------------------------
create or replace function public.request_withdrawal(p_token text, p_amount integer)
returns public.wallet_withdrawals
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v public.vendors%rowtype;
  v_reserved integer;
  v_available integer;
  v_threshold integer;
  v_status text;
  w public.wallet_withdrawals;
begin
  if p_token is null or btrim(p_token) = '' then
    raise exception 'Missing vendor access token.';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Withdrawal amount must be a positive integer (NGN).';
  end if;

  select * into v
  from public.vendors
  where access_token::text = btrim(p_token)
  for update;

  if not found then
    raise exception 'Invalid vendor access token.';
  end if;

  if v.paystack_recipient_code is null or btrim(v.paystack_recipient_code) = '' then
    raise exception 'Add verified bank details before requesting a withdrawal.'
      using errcode = 'P0001';
  end if;

  v_reserved := public._wallet_reserved_undebited(v.id);
  v_available := v.wallet_balance - v_reserved;

  if p_amount > v_available then
    raise exception
      'Requested % NGN exceeds available % NGN (balance % − reserved %).',
      p_amount, v_available, v.wallet_balance, v_reserved
      using errcode = 'P0001';
  end if;

  select coalesce(nullif(btrim(value), '')::integer, 20000)
  into v_threshold
  from public.app_settings
  where key = 'auto_payout_threshold';

  if v_threshold is null then
    v_threshold := 20000;
  end if;

  -- Under threshold → processing (client should call paystack-payout next)
  -- At/above threshold → pending (ops Approve → same payout Edge)
  if p_amount < v_threshold then
    v_status := 'processing';
  else
    v_status := 'pending';
  end if;

  insert into public.wallet_withdrawals (vendor_id, amount, status, note)
  values (
    v.id,
    p_amount,
    v_status,
    case
      when v_status = 'processing' then 'Auto payout — awaiting Paystack initiate'
      else 'Vendor-requested withdrawal — awaiting ops review'
    end
  )
  returning * into w;

  return w;
end;
$$;

revoke all on function public.request_withdrawal(text, integer) from public;
grant execute on function public.request_withdrawal(text, integer)
  to anon, authenticated, service_role;

comment on function public.request_withdrawal(text, integer) is
  'Vendor token RPC. Requires recipient_code. < threshold → processing; else pending. Balance debited only on payout initiate / manual pay.';

-- -----------------------------------------------------------------------------
-- 4) record_payout_initiated — SERVICE_ROLE ONLY
--    Called by paystack-payout after Paystack returns transfer_code
--    (including status otp — funds already deducted on Paystack side).
-- -----------------------------------------------------------------------------
create or replace function public.record_payout_initiated(
  p_withdrawal_id uuid,
  p_transfer_code text,
  p_reference text,
  p_paystack_status text default null
)
returns public.wallet_withdrawals
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  w public.wallet_withdrawals;
  inserted_id uuid;
  v_next_status text;
  v_ps text;
begin
  if p_withdrawal_id is null then
    raise exception 'withdrawal_id required';
  end if;
  if p_transfer_code is null or btrim(p_transfer_code) = '' then
    raise exception 'transfer_code required';
  end if;
  if p_reference is null or btrim(p_reference) = '' then
    raise exception 'reference required';
  end if;

  select * into w
  from public.wallet_withdrawals
  where id = p_withdrawal_id
  for update;

  if not found then
    raise exception 'Withdrawal % not found', p_withdrawal_id using errcode = 'P0001';
  end if;

  -- Idempotent: already recorded this initiate
  if w.paystack_transfer_code is not null
     and w.paystack_transfer_code = btrim(p_transfer_code)
     and w.status in ('processing', 'needs_otp', 'paid') then
    return w;
  end if;

  if w.status in ('paid', 'rejected', 'failed') then
    raise exception 'Withdrawal % is terminal (%)', p_withdrawal_id, w.status
      using errcode = 'P0001';
  end if;

  if w.status not in ('pending', 'processing') then
    raise exception 'Withdrawal % cannot initiate from status %', p_withdrawal_id, w.status
      using errcode = 'P0001';
  end if;

  if w.paystack_transfer_code is not null
     and w.paystack_transfer_code is distinct from btrim(p_transfer_code) then
    raise exception 'Withdrawal % already has a different transfer_code', p_withdrawal_id
      using errcode = 'P0001';
  end if;

  v_ps := lower(btrim(coalesce(p_paystack_status, '')));
  if v_ps = 'otp' then
    v_next_status := 'needs_otp';
  else
    v_next_status := 'processing';
  end if;

  -- Heal partial failure: debit ledger may exist without transfer_code on the row.
  if not exists (
    select 1 from public.wallet_transactions
    where withdrawal_id = w.id and type = 'withdrawal_paid'
  ) then
    perform 1 from public.vendors where id = w.vendor_id for update;

    update public.vendors
    set wallet_balance = wallet_balance - w.amount
    where id = w.vendor_id and wallet_balance >= w.amount;

    if not found then
      raise exception
        'Insufficient wallet_balance to debit withdrawal %',
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
      'Paystack transfer initiated — funds in flight'
    )
    on conflict (withdrawal_id)
    where (type = 'withdrawal_paid' and withdrawal_id is not null)
    do nothing
    returning id into inserted_id;

    if inserted_id is null then
      -- Concurrent insert won the race; do not double-debit — undo our bump.
      update public.vendors
      set wallet_balance = wallet_balance + w.amount
      where id = w.vendor_id;
    end if;
  end if;

  update public.wallet_withdrawals
  set
    status = v_next_status,
    paystack_transfer_code = btrim(p_transfer_code),
    paystack_reference = btrim(p_reference),
    paystack_transfer_status = nullif(v_ps, ''),
    initiated_at = coalesce(initiated_at, now()),
    note = case
      when v_next_status = 'needs_otp' then
        'Paystack requires OTP — complete in Paystack dashboard'
      else note
    end
  where id = w.id
  returning * into w;

  return w;
end;
$$;

-- ★ SERVICE_ROLE ONLY — real money debit after Paystack accepted initiate
revoke all on function public.record_payout_initiated(uuid, text, text, text) from public;
revoke all on function public.record_payout_initiated(uuid, text, text, text)
  from anon, authenticated;
grant execute on function public.record_payout_initiated(uuid, text, text, text)
  to service_role;

comment on function public.record_payout_initiated(uuid, text, text, text) is
  'SERVICE_ROLE ONLY. Debit wallet + ledger when Paystack returns transfer_code (incl. otp).';

-- -----------------------------------------------------------------------------
-- 5) finalize_withdrawal_paid — SERVICE_ROLE ONLY (webhook transfer.success)
-- -----------------------------------------------------------------------------
create or replace function public.finalize_withdrawal_paid(
  p_withdrawal_id uuid,
  p_paystack_status text default 'success'
)
returns public.wallet_withdrawals
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  w public.wallet_withdrawals;
begin
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

  if w.status not in ('processing', 'needs_otp') then
    raise exception
      'Withdrawal % cannot finalize paid from status %',
      p_withdrawal_id, w.status
      using errcode = 'P0001';
  end if;

  -- Debit must already exist (record_payout_initiated)
  if not exists (
    select 1 from public.wallet_transactions
    where withdrawal_id = w.id and type = 'withdrawal_paid'
  ) then
    raise exception
      'Withdrawal % has no debit ledger — cannot finalize paid',
      p_withdrawal_id
      using errcode = 'P0001';
  end if;

  update public.wallet_withdrawals
  set
    status = 'paid',
    paid_via = 'paystack',
    resolved_at = now(),
    paystack_transfer_status = coalesce(nullif(btrim(p_paystack_status), ''), paystack_transfer_status),
    note = coalesce(note, 'Paystack transfer.success')
  where id = w.id
  returning * into w;

  return w;
end;
$$;

revoke all on function public.finalize_withdrawal_paid(uuid, text) from public;
revoke all on function public.finalize_withdrawal_paid(uuid, text)
  from anon, authenticated;
grant execute on function public.finalize_withdrawal_paid(uuid, text)
  to service_role;

comment on function public.finalize_withdrawal_paid(uuid, text) is
  'SERVICE_ROLE ONLY. Webhook transfer.success → paid (no second debit).';

-- -----------------------------------------------------------------------------
-- 6) fail_withdrawal_payout — SERVICE_ROLE ONLY (webhook fail/reverse)
-- -----------------------------------------------------------------------------
create or replace function public.fail_withdrawal_payout(
  p_withdrawal_id uuid,
  p_note text default null,
  p_paystack_status text default null
)
returns public.wallet_withdrawals
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  w public.wallet_withdrawals;
  v_had_debit boolean;
  inserted_id uuid;
begin
  select * into w
  from public.wallet_withdrawals
  where id = p_withdrawal_id
  for update;

  if not found then
    raise exception 'Withdrawal % not found', p_withdrawal_id using errcode = 'P0001';
  end if;

  if w.status = 'failed' then
    -- Idempotent: ensure reversal exists if we had debited
    return w;
  end if;

  if w.status = 'rejected' then
    raise exception 'Withdrawal % was rejected', p_withdrawal_id using errcode = 'P0001';
  end if;

  -- Allow fail from in-flight; also from paid (rare reverse after success)
  if w.status not in ('pending', 'processing', 'needs_otp', 'paid') then
    raise exception
      'Withdrawal % cannot fail from status %',
      p_withdrawal_id, w.status
      using errcode = 'P0001';
  end if;

  v_had_debit := exists (
    select 1 from public.wallet_transactions
    where withdrawal_id = w.id and type = 'withdrawal_paid'
  );

  if v_had_debit then
    perform 1 from public.vendors where id = w.vendor_id for update;

    insert into public.wallet_transactions (
      vendor_id, order_id, withdrawal_id, amount, type, note
    )
    values (
      w.vendor_id,
      null,
      w.id,
      w.amount,
      'withdrawal_reversal',
      coalesce(p_note, 'Paystack transfer failed/reversed — balance restored')
    )
    on conflict (withdrawal_id)
    where (type = 'withdrawal_reversal' and withdrawal_id is not null)
    do nothing
    returning id into inserted_id;

    if inserted_id is not null then
      update public.vendors
      set wallet_balance = wallet_balance + w.amount
      where id = w.vendor_id;
    end if;
    -- If inserted_id is null, reversal already posted — do not double-credit
  end if;

  update public.wallet_withdrawals
  set
    status = 'failed',
    resolved_at = coalesce(resolved_at, now()),
    paystack_transfer_status = coalesce(
      nullif(btrim(p_paystack_status), ''),
      paystack_transfer_status
    ),
    note = coalesce(p_note, note)
  where id = w.id
  returning * into w;

  return w;
end;
$$;

revoke all on function public.fail_withdrawal_payout(uuid, text, text) from public;
revoke all on function public.fail_withdrawal_payout(uuid, text, text)
  from anon, authenticated;
grant execute on function public.fail_withdrawal_payout(uuid, text, text)
  to service_role;

comment on function public.fail_withdrawal_payout(uuid, text, text) is
  'SERVICE_ROLE ONLY. Webhook fail/reverse → failed + idempotent balance restore.';

-- -----------------------------------------------------------------------------
-- 7) mark_withdrawal_paid — ops MANUAL OVERRIDE (emergency)
--    Use when Paystack is down / ops paid outside the automated path.
--    Debits only if not already debited by record_payout_initiated.
-- -----------------------------------------------------------------------------
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
  v_already_debited boolean;
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

  if w.status in ('rejected', 'failed') then
    raise exception
      'Withdrawal % is % and cannot be marked paid manually',
      p_withdrawal_id, w.status
      using errcode = 'P0001';
  end if;

  if w.status not in ('pending', 'processing', 'needs_otp') then
    raise exception
      'Withdrawal % cannot be marked paid from status %',
      p_withdrawal_id, w.status
      using errcode = 'P0001';
  end if;

  v_already_debited := exists (
    select 1 from public.wallet_transactions
    where withdrawal_id = w.id and type = 'withdrawal_paid'
  );

  if not v_already_debited then
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
      coalesce(p_note, 'MANUAL OVERRIDE — ops marked paid outside Paystack')
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
  end if;

  update public.wallet_withdrawals
  set
    status = 'paid',
    paid_via = 'manual',
    resolved_at = now(),
    note = coalesce(
      p_note,
      'MANUAL OVERRIDE — marked paid by ops (emergency / Paystack outage)'
    )
  where id = w.id
  returning * into w;

  return w;
end;
$$;

revoke all on function public.mark_withdrawal_paid(uuid, text) from public;
grant execute on function public.mark_withdrawal_paid(uuid, text)
  to authenticated, service_role;

comment on function public.mark_withdrawal_paid(uuid, text) is
  'Ops only MANUAL OVERRIDE. Marks paid with paid_via=manual. Debits only if not already debited. Prefer Approve → paystack-payout.';

-- -----------------------------------------------------------------------------
-- 8) reject_withdrawal — pending only (before money moves)
-- -----------------------------------------------------------------------------
create or replace function public.reject_withdrawal(
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

  if w.status = 'rejected' then
    return w;
  end if;

  if w.status is distinct from 'pending' then
    raise exception
      'Withdrawal % can only be rejected while pending (status %). Money may already be in flight.',
      p_withdrawal_id, w.status
      using errcode = 'P0001';
  end if;

  update public.wallet_withdrawals
  set
    status = 'rejected',
    resolved_at = now(),
    note = coalesce(p_note, note)
  where id = w.id
  returning * into w;

  return w;
end;
$$;

revoke all on function public.reject_withdrawal(uuid, text) from public;
grant execute on function public.reject_withdrawal(uuid, text)
  to authenticated, service_role;

comment on function public.reject_withdrawal(uuid, text) is
  'Ops only. Reject while pending only — before Paystack initiate / debit.';
