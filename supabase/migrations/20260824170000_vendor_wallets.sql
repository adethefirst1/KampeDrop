-- =============================================================================
-- KampeDrop: vendor wallets (ledger + withdrawals)
-- REVIEW BEFORE APPLYING — financial tracking; designed for idempotent credits.
--
-- Model:
--   • wallet_balance on vendors = spendable NGN integer (what the portal shows)
--   • wallet_transactions = immutable posted ledger (credits + paid withdrawals)
--   • wallet_withdrawals = request workflow (pending → paid | rejected)
--   • Request does NOT touch wallet_balance (avoids fake “paid” accounting)
--   • Available to request = wallet_balance − sum(pending withdrawal amounts)
--   • Credit = full order.subtotal at escrow release (0% commission; delivery stays ours)
--   • COD passkey does NOT credit (cash already with vendor; escrow never releases)
--
-- Double-credit shields (stacked):
--   1) Early return if escrow_state already 'released'
--   2) Credit only inside the branch that flips escrow → released in THIS call
--   3) UNIQUE (order_id) WHERE type = 'order_credit' — one credit row per order forever
--   4) INSERT … ON CONFLICT DO NOTHING; bump balance ONLY if the insert created a row
--   5) FOR UPDATE on order + vendor rows in the same transaction
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) vendors.wallet_balance
-- -----------------------------------------------------------------------------
alter table public.vendors
  add column if not exists wallet_balance integer not null default 0
  constraint vendors_wallet_balance_nonnegative check (wallet_balance >= 0);

comment on column public.vendors.wallet_balance is
  'Spendable NGN kobo-free integer. Increased on order_credit at escrow release; decreased only when ops marks a withdrawal paid.';

-- -----------------------------------------------------------------------------
-- 2) wallet_transactions — posted ledger only
-- -----------------------------------------------------------------------------
create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete restrict,
  order_id text references public.orders (id) on delete restrict,
  withdrawal_id uuid, -- filled for withdrawal_paid rows (FK added after withdrawals table)
  amount integer not null,
  type text not null
    check (type in ('order_credit', 'withdrawal_paid')),
  note text,
  created_at timestamptz not null default now(),
  constraint wallet_transactions_amount_nonzero check (amount <> 0),
  constraint wallet_transactions_credit_positive
    check (type <> 'order_credit' or amount > 0),
  constraint wallet_transactions_withdrawal_negative
    check (type <> 'withdrawal_paid' or amount < 0),
  constraint wallet_transactions_credit_has_order
    check (type <> 'order_credit' or order_id is not null),
  constraint wallet_transactions_paid_has_withdrawal
    check (type <> 'withdrawal_paid' or withdrawal_id is not null)
);

-- ★ Idempotency key: at most one order_credit per order, ever.
create unique index if not exists wallet_transactions_one_credit_per_order
  on public.wallet_transactions (order_id)
  where type = 'order_credit' and order_id is not null;

create index if not exists wallet_transactions_vendor_created_idx
  on public.wallet_transactions (vendor_id, created_at desc);

comment on table public.wallet_transactions is
  'Immutable posted wallet ledger. order_credit once per order; withdrawal_paid when ops confirms bank transfer.';

-- -----------------------------------------------------------------------------
-- 3) wallet_withdrawals — request workflow (balance untouched until paid)
-- -----------------------------------------------------------------------------
create table if not exists public.wallet_withdrawals (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete restrict,
  amount integer not null check (amount > 0),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'rejected')),
  note text,
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by text, -- ops identifier / email if you have one; nullable
  constraint wallet_withdrawals_resolved_coherence check (
    (status = 'pending' and resolved_at is null)
    or (status in ('paid', 'rejected') and resolved_at is not null)
  )
);

create index if not exists wallet_withdrawals_vendor_status_idx
  on public.wallet_withdrawals (vendor_id, status);

create index if not exists wallet_withdrawals_pending_idx
  on public.wallet_withdrawals (status, requested_at)
  where status = 'pending';

comment on table public.wallet_withdrawals is
  'Vendor withdrawal requests. Pending does not reduce wallet_balance; mark_withdrawal_paid does.';

alter table public.wallet_transactions
  drop constraint if exists wallet_transactions_withdrawal_id_fkey;

alter table public.wallet_transactions
  add constraint wallet_transactions_withdrawal_id_fkey
  foreign key (withdrawal_id) references public.wallet_withdrawals (id) on delete restrict;

-- One posted ledger row per paid withdrawal
create unique index if not exists wallet_transactions_one_paid_per_withdrawal
  on public.wallet_transactions (withdrawal_id)
  where type = 'withdrawal_paid' and withdrawal_id is not null;

-- -----------------------------------------------------------------------------
-- 4) RLS — vendors never write ledger/balance directly; RPCs are SECURITY DEFINER
-- -----------------------------------------------------------------------------
alter table public.wallet_transactions enable row level security;
alter table public.wallet_withdrawals enable row level security;

drop policy if exists "ops_select_wallet_transactions" on public.wallet_transactions;
drop policy if exists "ops_select_wallet_withdrawals" on public.wallet_withdrawals;
drop policy if exists "ops_update_wallet_withdrawals" on public.wallet_withdrawals;

create policy "ops_select_wallet_transactions"
  on public.wallet_transactions
  for select
  to authenticated
  using (public.is_ops());

create policy "ops_select_wallet_withdrawals"
  on public.wallet_withdrawals
  for select
  to authenticated
  using (public.is_ops());

-- Ops may reject via table update if desired; paid path should use RPC only.
create policy "ops_update_wallet_withdrawals"
  on public.wallet_withdrawals
  for update
  to authenticated
  using (public.is_ops())
  with check (public.is_ops());

grant select on public.wallet_transactions to authenticated;
grant select, update on public.wallet_withdrawals to authenticated;

-- -----------------------------------------------------------------------------
-- 5) Helper: credit vendor for an order (idempotent)
--    Returns true if a NEW credit was posted; false if already credited.
-- -----------------------------------------------------------------------------
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
    -- Nothing to credit (should be rare); treat as success / no-op.
    return false;
  end if;

  -- Lock vendor so concurrent credits serialize on balance.
  perform 1 from public.vendors where id = p_vendor_id for update;
  if not found then
    raise exception 'wallet credit: vendor % not found (order %)', p_vendor_id, p_order_id
      using errcode = 'P0001';
  end if;

  -- Unique index wallet_transactions_one_credit_per_order makes this safe under retries.
  insert into public.wallet_transactions (vendor_id, order_id, amount, type, note)
  values (
    p_vendor_id,
    p_order_id,
    p_subtotal,
    'order_credit',
    'Escrow released — vendor share (full subtotal, 0% commission)'
  )
  on conflict (order_id) where (type = 'order_credit')
  do nothing
  returning id into inserted_id;

  if inserted_id is null then
    -- Already credited for this order (retry / duplicate passkey call).
    return false;
  end if;

  update public.vendors
  set wallet_balance = wallet_balance + p_subtotal
  where id = p_vendor_id;

  return true;
end;
$$;

revoke all on function public._wallet_credit_order(uuid, text, integer) from public;
-- Internal helper only — not granted to anon/authenticated.

comment on function public._wallet_credit_order(uuid, text, integer) is
  'Idempotent order_credit + balance bump. ON CONFLICT on unique(order_id) for order_credit.';

-- -----------------------------------------------------------------------------
-- 6) validate_passkey_and_release — escrow release + wallet credit (same txn)
-- -----------------------------------------------------------------------------
create or replace function public.validate_passkey_and_release(p_id text, p_passkey text)
returns public.orders
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  o public.orders;
  v_vendor_uuid uuid;
  v_should_credit boolean := false;
begin
  select * into o from public.orders where id = p_id for update;
  if not found then
    raise exception 'Order % not found', p_id using errcode = 'P0001';
  end if;

  if o.status = 'cancelled' then
    raise exception 'Order % is cancelled', p_id using errcode = 'P0001';
  end if;

  if trim(p_passkey) is distinct from o.passkey then
    raise exception 'Wrong passkey for order %', p_id using errcode = 'P0001';
  end if;

  -- ★ Shield 1: already released → do not re-flip escrow; still run idempotent
  -- credit so a rare "released but credit failed" case can heal on retry.
  if o.escrow_state = 'released' then
    if o.payment is distinct from 'cod' and o.vendor_id is not null then
      begin
        v_vendor_uuid := o.vendor_id::uuid;
        perform public._wallet_credit_order(v_vendor_uuid, o.id, o.subtotal);
      exception
        when invalid_text_representation then
          null; -- leave as-is; ops can investigate bad vendor_id
      end;
    end if;
    return o;
  end if;

  perform set_config('suredrop.allow_passkey_release', 'on', true);

  if o.fulfillment = 'delivery' then
    if o.payment = 'cod' then
      -- Cash with vendor — no KampeDrop-held funds to credit.
      update public.orders
      set status = 'picked_up'
      where id = p_id
      returning * into o;
    else
      update public.orders
      set
        status = 'picked_up',
        escrow_state = 'released',
        payment_state = 'released'
      where id = p_id
      returning * into o;
      v_should_credit := true;
    end if;

  elsif o.fulfillment = 'pickup' then
    if o.payment = 'cod' then
      update public.orders
      set status = 'delivered'
      where id = p_id
      returning * into o;
    else
      update public.orders
      set
        status = 'delivered',
        escrow_state = 'released',
        payment_state = 'released'
      where id = p_id
      returning * into o;
      v_should_credit := true;
    end if;

  else
    raise exception 'Unknown fulfillment on order %', p_id using errcode = 'P0001';
  end if;

  -- ★ Shield 2–5: credit only when THIS call released escrow; helper is idempotent.
  if v_should_credit then
    begin
      v_vendor_uuid := o.vendor_id::uuid;
    exception
      when invalid_text_representation then
        raise exception 'wallet credit: order % has invalid vendor_id %', p_id, o.vendor_id
          using errcode = 'P0001';
    end;

    perform public._wallet_credit_order(v_vendor_uuid, o.id, o.subtotal);
  end if;

  return o;
end;
$$;

comment on function public.validate_passkey_and_release(text, text) is
  'Passkey handoff: release escrow (non-COD) and idempotently credit vendor wallet by subtotal.';

-- -----------------------------------------------------------------------------
-- 7) Vendor: get wallet snapshot (balance + available + recent txs + withdrawals)
-- -----------------------------------------------------------------------------
create or replace function public.get_vendor_wallet(p_token text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v public.vendors%rowtype;
  v_pending integer;
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

  select coalesce(sum(amount), 0)::integer into v_pending
  from public.wallet_withdrawals
  where vendor_id = v.id and status = 'pending';

  v_available := v.wallet_balance - v_pending;
  if v_available < 0 then
    v_available := 0;
  end if;

  return jsonb_build_object(
    'vendor_id', v.id,
    'wallet_balance', v.wallet_balance,
    'pending_withdrawal_total', v_pending,
    'available_to_withdraw', v_available,
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
          'resolved_at', ww.resolved_at
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
-- 8) Vendor: request_withdrawal — pending only; does not reduce wallet_balance
-- -----------------------------------------------------------------------------
create or replace function public.request_withdrawal(p_token text, p_amount integer)
returns public.wallet_withdrawals
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v public.vendors%rowtype;
  v_pending integer;
  v_available integer;
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

  select coalesce(sum(amount), 0)::integer into v_pending
  from public.wallet_withdrawals
  where vendor_id = v.id and status = 'pending';

  v_available := v.wallet_balance - v_pending;

  if p_amount > v_available then
    raise exception
      'Requested % NGN exceeds available % NGN (balance % − pending %).',
      p_amount, v_available, v.wallet_balance, v_pending
      using errcode = 'P0001';
  end if;

  insert into public.wallet_withdrawals (vendor_id, amount, status, note)
  values (v.id, p_amount, 'pending', 'Vendor-requested withdrawal')
  returning * into w;

  return w;
end;
$$;

revoke all on function public.request_withdrawal(text, integer) from public;
grant execute on function public.request_withdrawal(text, integer)
  to anon, authenticated, service_role;

comment on function public.request_withdrawal(text, integer) is
  'Vendor token RPC. Creates pending withdrawal; balance reduced only by mark_withdrawal_paid.';

-- -----------------------------------------------------------------------------
-- 9) Ops: mark_withdrawal_paid — sole path that reduces balance for withdrawals
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
    -- Idempotent: already paid.
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

  -- Lock vendor; ensure balance still covers (should, if available math held).
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
  on conflict (withdrawal_id) where (type = 'withdrawal_paid')
  do nothing
  returning id into inserted_id;

  -- If conflict (shouldn’t after status check), roll back balance bump path by failing loud.
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

revoke all on function public.mark_withdrawal_paid(uuid, text) from public;
grant execute on function public.mark_withdrawal_paid(uuid, text)
  to authenticated, service_role;

comment on function public.mark_withdrawal_paid(uuid, text) is
  'Ops only. After real bank transfer: decrement wallet_balance, post withdrawal_paid ledger, mark paid.';

-- Optional: ops reject pending withdrawal (no balance change)
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

  if w.status = 'paid' then
    raise exception 'Withdrawal % already paid', p_withdrawal_id using errcode = 'P0001';
  end if;

  if w.status = 'rejected' then
    return w;
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
