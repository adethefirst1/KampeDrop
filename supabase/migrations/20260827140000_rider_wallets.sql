-- =============================================================================
-- KampeDrop: rider wallets (ledger + withdrawals) — SQL stage
-- REVIEW BEFORE APPLYING — financial; mirrors vendor wallets with different
-- credit timing and amount.
--
-- Model (same shape as vendors, separate tables — never share):
--   • riders.wallet_balance = spendable NGN integer
--   • rider_wallet_transactions = immutable posted ledger
--   • rider_wallet_withdrawals = request workflow (pending → paid | rejected)
--   • Request does NOT touch wallet_balance until ops marks paid
--   • Available = wallet_balance − sum(pending undebited withdrawals)
--
-- Credit (≠ vendor):
--   • Fires inside update_order_status_by_rider when status → delivered
--   • Amount = orders.delivery_fee (flat ₦2000 today)
--   • ONLY payment in ('card', 'transfer') — COD excluded (cash already with rider)
--   • Idempotent: UNIQUE (order_id) WHERE type = 'order_credit'
--
-- Payouts:
--   • Automated Paystack paused (same CAC reason as vendors)
--   • All requests start as pending; ops mark_rider_withdrawal_paid (manual)
--   • Bank columns + paystack_recipient_code reserved for later Edge flip-on
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) riders.wallet_balance + bank fields (for manual payout / future Edge)
-- -----------------------------------------------------------------------------
alter table public.riders
  add column if not exists wallet_balance integer not null default 0
  constraint riders_wallet_balance_nonnegative check (wallet_balance >= 0);

comment on column public.riders.wallet_balance is
  'Spendable NGN integer. Increased on delivery_fee credit at delivered (card/transfer only); decreased when ops marks a withdrawal paid.';

alter table public.riders
  add column if not exists bank_name text,
  add column if not exists bank_code text,
  add column if not exists account_number text,
  add column if not exists account_name text,
  add column if not exists paystack_recipient_code text;

comment on column public.riders.bank_name is
  'Display bank name (e.g. Access Bank).';
comment on column public.riders.bank_code is
  'Paystack bank code — used when rider-save-bank Edge ships.';
comment on column public.riders.account_number is
  'NUBAN account number (digits).';
comment on column public.riders.account_name is
  'Resolved account holder name — not free-typed.';
comment on column public.riders.paystack_recipient_code is
  'Paystack RCP_… — filled by future rider-save-bank Edge; not required for manual mark-paid.';

-- -----------------------------------------------------------------------------
-- 2) rider_wallet_transactions — posted ledger only
-- -----------------------------------------------------------------------------
create table if not exists public.rider_wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references public.riders (id) on delete restrict,
  order_id text references public.orders (id) on delete restrict,
  withdrawal_id uuid,
  amount integer not null,
  type text not null
    check (type in ('order_credit', 'withdrawal_paid', 'withdrawal_reversal')),
  note text,
  created_at timestamptz not null default now(),
  constraint rider_wallet_transactions_amount_nonzero check (amount <> 0),
  constraint rider_wallet_transactions_credit_positive
    check (type <> 'order_credit' or amount > 0),
  constraint rider_wallet_transactions_withdrawal_negative
    check (type <> 'withdrawal_paid' or amount < 0),
  constraint rider_wallet_transactions_credit_has_order
    check (type <> 'order_credit' or order_id is not null),
  constraint rider_wallet_transactions_paid_has_withdrawal
    check (type <> 'withdrawal_paid' or withdrawal_id is not null)
);

-- ★ Idempotency: at most one delivery credit per order, ever.
create unique index if not exists rider_wallet_transactions_one_credit_per_order
  on public.rider_wallet_transactions (order_id)
  where type = 'order_credit' and order_id is not null;

create index if not exists rider_wallet_transactions_rider_created_idx
  on public.rider_wallet_transactions (rider_id, created_at desc);

comment on table public.rider_wallet_transactions is
  'Immutable rider wallet ledger. order_credit = delivery_fee at delivered (card/transfer); withdrawal_paid when ops confirms payout.';

-- -----------------------------------------------------------------------------
-- 3) rider_wallet_withdrawals — request workflow
-- -----------------------------------------------------------------------------
create table if not exists public.rider_wallet_withdrawals (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references public.riders (id) on delete restrict,
  amount integer not null check (amount > 0),
  status text not null default 'pending'
    check (status in (
      'pending',
      'processing',
      'needs_otp',
      'paid',
      'failed',
      'rejected'
    )),
  note text,
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by text,
  paystack_transfer_code text,
  paystack_reference text,
  paystack_transfer_status text,
  initiated_at timestamptz,
  paid_via text
    check (paid_via is null or paid_via in ('paystack', 'manual')),
  constraint rider_wallet_withdrawals_resolved_coherence check (
    (
      status in ('pending', 'processing', 'needs_otp')
      and resolved_at is null
    )
    or (
      status in ('paid', 'failed', 'rejected')
      and resolved_at is not null
    )
  )
);

create index if not exists rider_wallet_withdrawals_rider_status_idx
  on public.rider_wallet_withdrawals (rider_id, status);

create index if not exists rider_wallet_withdrawals_pending_idx
  on public.rider_wallet_withdrawals (status, requested_at)
  where status = 'pending';

create unique index if not exists rider_wallet_withdrawals_paystack_transfer_code_uidx
  on public.rider_wallet_withdrawals (paystack_transfer_code)
  where paystack_transfer_code is not null;

create unique index if not exists rider_wallet_withdrawals_paystack_reference_uidx
  on public.rider_wallet_withdrawals (paystack_reference)
  where paystack_reference is not null;

comment on table public.rider_wallet_withdrawals is
  'Rider withdrawal requests. While Paystack is paused, all requests stay pending until ops mark_rider_withdrawal_paid (manual).';

alter table public.rider_wallet_transactions
  drop constraint if exists rider_wallet_transactions_withdrawal_id_fkey;

alter table public.rider_wallet_transactions
  add constraint rider_wallet_transactions_withdrawal_id_fkey
  foreign key (withdrawal_id) references public.rider_wallet_withdrawals (id)
  on delete restrict;

create unique index if not exists rider_wallet_transactions_one_paid_per_withdrawal
  on public.rider_wallet_transactions (withdrawal_id)
  where type = 'withdrawal_paid' and withdrawal_id is not null;

-- -----------------------------------------------------------------------------
-- 4) RLS — riders never write ledger/balance directly; RPCs are SECURITY DEFINER
-- -----------------------------------------------------------------------------
alter table public.rider_wallet_transactions enable row level security;
alter table public.rider_wallet_withdrawals enable row level security;

drop policy if exists "ops_select_rider_wallet_transactions"
  on public.rider_wallet_transactions;
drop policy if exists "ops_select_rider_wallet_withdrawals"
  on public.rider_wallet_withdrawals;
drop policy if exists "ops_update_rider_wallet_withdrawals"
  on public.rider_wallet_withdrawals;

create policy "ops_select_rider_wallet_transactions"
  on public.rider_wallet_transactions
  for select
  to authenticated
  using (public.is_ops());

create policy "ops_select_rider_wallet_withdrawals"
  on public.rider_wallet_withdrawals
  for select
  to authenticated
  using (public.is_ops());

create policy "ops_update_rider_wallet_withdrawals"
  on public.rider_wallet_withdrawals
  for update
  to authenticated
  using (public.is_ops())
  with check (public.is_ops());

grant select on public.rider_wallet_transactions to authenticated;
grant select, update on public.rider_wallet_withdrawals to authenticated;

-- -----------------------------------------------------------------------------
-- 5) Helper: credit rider delivery_fee for an order (idempotent)
-- -----------------------------------------------------------------------------
create or replace function public._rider_wallet_credit_delivery(
  p_rider_id uuid,
  p_order_id text,
  p_delivery_fee integer
)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  inserted_id uuid;
begin
  if p_rider_id is null then
    raise exception 'rider wallet credit: missing rider_id for order %', p_order_id
      using errcode = 'P0001';
  end if;

  if p_delivery_fee is null or p_delivery_fee <= 0 then
    return false;
  end if;

  perform 1 from public.riders where id = p_rider_id for update;
  if not found then
    raise exception 'rider wallet credit: rider % not found (order %)',
      p_rider_id, p_order_id
      using errcode = 'P0001';
  end if;

  insert into public.rider_wallet_transactions (
    rider_id, order_id, amount, type, note
  )
  values (
    p_rider_id,
    p_order_id,
    p_delivery_fee,
    'order_credit',
    'Order delivered — rider delivery fee (card/transfer only)'
  )
  on conflict (order_id)
  where (type = 'order_credit' and order_id is not null)
  do nothing
  returning id into inserted_id;

  if inserted_id is null then
    return false;
  end if;

  update public.riders
  set wallet_balance = wallet_balance + p_delivery_fee
  where id = p_rider_id;

  return true;
end;
$$;

revoke all on function public._rider_wallet_credit_delivery(uuid, text, integer)
  from public;

comment on function public._rider_wallet_credit_delivery(uuid, text, integer) is
  'Internal. Idempotent delivery_fee credit. Returns true only when a NEW ledger row was posted.';

-- Reserved: pending (and future in-flight) not yet debited
create or replace function public._rider_wallet_reserved_undebited(p_rider_id uuid)
returns integer
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(sum(amount), 0)::integer
  from public.rider_wallet_withdrawals
  where rider_id = p_rider_id
    and status in ('pending', 'processing', 'needs_otp')
    and paystack_transfer_code is null;
$$;

revoke all on function public._rider_wallet_reserved_undebited(uuid) from public;

comment on function public._rider_wallet_reserved_undebited(uuid) is
  'Sum of pending/processing/needs_otp rider withdrawals not yet debited.';

-- -----------------------------------------------------------------------------
-- 6) update_order_status_by_rider — deliver + wallet credit (card/transfer)
-- -----------------------------------------------------------------------------
create or replace function public.update_order_status_by_rider(
  p_token text,
  p_id text,
  p_new_status text
)
returns public.orders
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_rider public.riders%rowtype;
  v_order public.orders%rowtype;
  v_status text;
  v_prev_status text;
begin
  if p_token is null or btrim(p_token) = '' then
    raise exception 'Missing rider access token.';
  end if;
  if p_id is null or btrim(p_id) = '' then
    raise exception 'Missing order id.';
  end if;
  if p_new_status is null or btrim(p_new_status) = '' then
    raise exception 'Missing new status.';
  end if;

  v_status := btrim(p_new_status);

  if v_status not in ('on_the_way', 'delivered') then
    raise exception
      'Riders can only set status to on_the_way or delivered. Got: %', v_status;
  end if;

  select * into v_rider
  from public.riders
  where access_token = btrim(p_token)
  limit 1;

  if not found then
    raise exception 'Invalid rider access token.';
  end if;

  if v_rider.status = 'suspended' then
    raise exception 'This rider account is suspended.';
  end if;

  select * into v_order
  from public.orders
  where id = btrim(p_id)
  for update;

  if not found then
    raise exception 'Order not found.';
  end if;

  if v_order.rider_id is distinct from v_rider.id::text then
    raise exception 'This order is not assigned to this rider.';
  end if;

  v_prev_status := v_order.status;

  update public.orders
  set status = v_status
  where id = v_order.id
  returning * into v_order;

  -- Credit delivery_fee once when first transitioning into delivered,
  -- card/transfer only (COD cash already with the rider at the door).
  if v_status = 'delivered'
     and v_prev_status is distinct from 'delivered'
     and v_order.payment in ('card', 'transfer')
  then
    perform public._rider_wallet_credit_delivery(
      v_rider.id,
      v_order.id,
      v_order.delivery_fee
    );
  end if;

  return v_order;
end;
$$;

revoke all on function public.update_order_status_by_rider(text, text, text)
  from public;
grant execute on function public.update_order_status_by_rider(text, text, text)
  to anon, authenticated, service_role;

comment on function public.update_order_status_by_rider(text, text, text) is
  'Rider portal: on_the_way | delivered. On first delivered for card/transfer, credits delivery_fee to rider wallet (idempotent).';

-- -----------------------------------------------------------------------------
-- 7) get_rider_wallet — token RPC
-- -----------------------------------------------------------------------------
create or replace function public.get_rider_wallet(p_token text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v public.riders%rowtype;
  v_reserved integer;
  v_available integer;
begin
  if p_token is null or btrim(p_token) = '' then
    raise exception 'Missing rider access token.';
  end if;

  select * into v
  from public.riders
  where access_token = btrim(p_token)
  limit 1;

  if not found then
    raise exception 'Invalid rider access token.';
  end if;

  if v.status = 'suspended' then
    raise exception 'This rider account is suspended.';
  end if;

  v_reserved := public._rider_wallet_reserved_undebited(v.id);
  v_available := v.wallet_balance - v_reserved;
  if v_available < 0 then
    v_available := 0;
  end if;

  return jsonb_build_object(
    'rider_id', v.id,
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
        from public.rider_wallet_transactions wt
        where wt.rider_id = v.id
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
          'paid_via', ww.paid_via
        ) as w
        from public.rider_wallet_withdrawals ww
        where ww.rider_id = v.id
        order by ww.requested_at desc
        limit 50
      ) s
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_rider_wallet(text) from public;
grant execute on function public.get_rider_wallet(text)
  to anon, authenticated, service_role;

comment on function public.get_rider_wallet(text) is
  'Rider portal: balance, available, bank summary, recent ledger + withdrawals.';

-- -----------------------------------------------------------------------------
-- 8) request_rider_withdrawal — always pending while Paystack paused
-- -----------------------------------------------------------------------------
create or replace function public.request_rider_withdrawal(
  p_token text,
  p_amount integer
)
returns public.rider_wallet_withdrawals
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v public.riders%rowtype;
  v_reserved integer;
  v_available integer;
  w public.rider_wallet_withdrawals;
begin
  if p_token is null or btrim(p_token) = '' then
    raise exception 'Missing rider access token.';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Withdrawal amount must be a positive integer (NGN).';
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

  -- Manual payout needs a destination. Recipient code optional until Edge exists.
  if v.account_number is null
     or btrim(v.account_number) = ''
     or v.account_name is null
     or btrim(v.account_name) = ''
     or v.bank_code is null
     or btrim(v.bank_code) = ''
  then
    raise exception 'Add verified bank details before requesting a withdrawal.'
      using errcode = 'P0001';
  end if;

  v_reserved := public._rider_wallet_reserved_undebited(v.id);
  v_available := v.wallet_balance - v_reserved;

  if p_amount > v_available then
    raise exception
      'Requested % NGN exceeds available % NGN (balance % − reserved %).',
      p_amount, v_available, v.wallet_balance, v_reserved
      using errcode = 'P0001';
  end if;

  -- Paystack automation paused: always pending for ops manual mark-paid.
  insert into public.rider_wallet_withdrawals (rider_id, amount, status, note)
  values (
    v.id,
    p_amount,
    'pending',
    'Rider-requested withdrawal — awaiting ops manual payout'
  )
  returning * into w;

  return w;
end;
$$;

revoke all on function public.request_rider_withdrawal(text, integer) from public;
grant execute on function public.request_rider_withdrawal(text, integer)
  to anon, authenticated, service_role;

comment on function public.request_rider_withdrawal(text, integer) is
  'Rider token RPC. Requires bank NUBAN fields. Always pending while Paystack payouts are paused.';

-- -----------------------------------------------------------------------------
-- 9) mark_rider_withdrawal_paid — ops MANUAL path (primary while paused)
-- -----------------------------------------------------------------------------
create or replace function public.mark_rider_withdrawal_paid(
  p_withdrawal_id uuid,
  p_note text default null
)
returns public.rider_wallet_withdrawals
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  w public.rider_wallet_withdrawals;
  inserted_id uuid;
  v_already_debited boolean;
begin
  if not public.is_ops() then
    raise exception 'Ops only.';
  end if;

  select * into w
  from public.rider_wallet_withdrawals
  where id = p_withdrawal_id
  for update;

  if not found then
    raise exception 'Rider withdrawal % not found', p_withdrawal_id
      using errcode = 'P0001';
  end if;

  if w.status = 'paid' then
    return w;
  end if;

  if w.status in ('rejected', 'failed') then
    raise exception
      'Rider withdrawal % is % and cannot be marked paid',
      p_withdrawal_id, w.status
      using errcode = 'P0001';
  end if;

  if w.status not in ('pending', 'processing', 'needs_otp') then
    raise exception
      'Rider withdrawal % cannot be marked paid from status %',
      p_withdrawal_id, w.status
      using errcode = 'P0001';
  end if;

  v_already_debited := exists (
    select 1 from public.rider_wallet_transactions
    where withdrawal_id = w.id and type = 'withdrawal_paid'
  );

  if not v_already_debited then
    perform 1 from public.riders where id = w.rider_id for update;

    update public.riders
    set wallet_balance = wallet_balance - w.amount
    where id = w.rider_id and wallet_balance >= w.amount;

    if not found then
      raise exception
        'Insufficient rider wallet_balance to pay withdrawal %',
        p_withdrawal_id
        using errcode = 'P0001';
    end if;

    insert into public.rider_wallet_transactions (
      rider_id, order_id, withdrawal_id, amount, type, note
    )
    values (
      w.rider_id,
      null,
      w.id,
      -w.amount,
      'withdrawal_paid',
      coalesce(p_note, 'MANUAL — ops marked rider withdrawal paid')
    )
    on conflict (withdrawal_id)
    where (type = 'withdrawal_paid' and withdrawal_id is not null)
    do nothing
    returning id into inserted_id;

    if inserted_id is null then
      raise exception
        'Ledger row already exists for rider withdrawal % — investigate',
        p_withdrawal_id
        using errcode = 'P0001';
    end if;
  end if;

  update public.rider_wallet_withdrawals
  set
    status = 'paid',
    paid_via = 'manual',
    resolved_at = now(),
    note = coalesce(
      p_note,
      'MANUAL — marked paid by ops (Paystack automation paused)'
    )
  where id = w.id
  returning * into w;

  return w;
end;
$$;

revoke all on function public.mark_rider_withdrawal_paid(uuid, text) from public;
grant execute on function public.mark_rider_withdrawal_paid(uuid, text)
  to authenticated, service_role;

comment on function public.mark_rider_withdrawal_paid(uuid, text) is
  'Ops only. Manual payout path for rider withdrawals while Paystack is paused.';

-- -----------------------------------------------------------------------------
-- 10) reject_rider_withdrawal — pending only
-- -----------------------------------------------------------------------------
create or replace function public.reject_rider_withdrawal(
  p_withdrawal_id uuid,
  p_note text default null
)
returns public.rider_wallet_withdrawals
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  w public.rider_wallet_withdrawals;
begin
  if not public.is_ops() then
    raise exception 'Ops only.';
  end if;

  select * into w
  from public.rider_wallet_withdrawals
  where id = p_withdrawal_id
  for update;

  if not found then
    raise exception 'Rider withdrawal % not found', p_withdrawal_id
      using errcode = 'P0001';
  end if;

  if w.status is distinct from 'pending' then
    raise exception
      'Only pending rider withdrawals can be rejected (got %)',
      w.status
      using errcode = 'P0001';
  end if;

  update public.rider_wallet_withdrawals
  set
    status = 'rejected',
    resolved_at = now(),
    note = coalesce(p_note, 'Rejected by ops')
  where id = w.id
  returning * into w;

  return w;
end;
$$;

revoke all on function public.reject_rider_withdrawal(uuid, text) from public;
grant execute on function public.reject_rider_withdrawal(uuid, text)
  to authenticated, service_role;

comment on function public.reject_rider_withdrawal(uuid, text) is
  'Ops only. Reject pending rider withdrawal (no balance change).';
