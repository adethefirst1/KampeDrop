-- =============================================================================
-- KampeDrop: Paystack payout schema (SQL / settings only — no RPC or Edge yet)
-- REVIEW BEFORE APPLYING
--
-- Prepares tables for automated bank payouts. Does NOT change request/approve
-- behaviour yet (that is the RPC + Edge step). Existing pending → paid|rejected
-- flows keep working after this migration.
--
-- Paystack doc note (How Transfers Work):
--   On initiate, Paystack checks balance then deducts amount + fee from the
--   merchant Paystack balance. If OTP is required, status becomes `otp` AFTER
--   that deduction. Unused OTP within 30 minutes → `abandoned` (funds returned
--   on Paystack’s side). Therefore our debit-on-initiate rule applies equally
--   when Initiate returns status `otp` / we set needs_otp.
--   Sources:
--     https://paystack.com/docs/transfers/how-transfers-work/
--     https://paystack.com/docs/transfers/managing-transfers/
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) app_settings — key/value knobs (threshold editable via SQL later)
-- -----------------------------------------------------------------------------
create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

comment on table public.app_settings is
  'Simple key/value app config. Ops may change via SQL; RPCs read at runtime.';

alter table public.app_settings enable row level security;

drop policy if exists "ops_select_app_settings" on public.app_settings;
drop policy if exists "ops_update_app_settings" on public.app_settings;

-- Ops can read; writes stay SQL / service_role for v1 (no accidental UI edits).
create policy "ops_select_app_settings"
  on public.app_settings
  for select
  to authenticated
  using (public.is_ops());

grant select on public.app_settings to authenticated;
grant select, insert, update on public.app_settings to service_role;

insert into public.app_settings (key, value)
values ('auto_payout_threshold', '20000')
on conflict (key) do nothing;

-- -----------------------------------------------------------------------------
-- 2) vendors — verified bank + Paystack recipient
-- -----------------------------------------------------------------------------
alter table public.vendors
  add column if not exists bank_name text,
  add column if not exists bank_code text,
  add column if not exists account_number text,
  add column if not exists account_name text,
  add column if not exists paystack_recipient_code text;

comment on column public.vendors.bank_name is
  'Display bank name chosen by vendor (e.g. Access Bank).';
comment on column public.vendors.bank_code is
  'Paystack bank code used for resolve + recipient create.';
comment on column public.vendors.account_number is
  'NUBAN account number (digits).';
comment on column public.vendors.account_name is
  'Account holder name returned by Paystack Resolve Account — not free-typed.';
comment on column public.vendors.paystack_recipient_code is
  'Paystack transfer recipient code (RCP_…). Required before any payout.';

-- -----------------------------------------------------------------------------
-- 3) wallet_withdrawals — new statuses + Paystack transfer fields
--
-- Status machine (enforced later in RPCs/Edge; check allows all now):
--   pending     → ops review (≥ threshold) OR waiting before initiate
--   processing  → Paystack accepted initiate; money in flight (we debited)
--   needs_otp   → Paystack status otp; debit already applied; ops must finalize
--   paid        → transfer.success OR emergency manual override
--   failed      → transfer.failed / reversed / abandoned after debit; balance restored
--   rejected    → ops rejected while still pending (no money moved)
-- -----------------------------------------------------------------------------
alter table public.wallet_withdrawals
  drop constraint if exists wallet_withdrawals_status_check;

alter table public.wallet_withdrawals
  add constraint wallet_withdrawals_status_check
  check (status in (
    'pending',
    'processing',
    'needs_otp',
    'paid',
    'failed',
    'rejected'
  ));

alter table public.wallet_withdrawals
  drop constraint if exists wallet_withdrawals_resolved_coherence;

alter table public.wallet_withdrawals
  add constraint wallet_withdrawals_resolved_coherence check (
    (
      status in ('pending', 'processing', 'needs_otp')
      and resolved_at is null
    )
    or (
      status in ('paid', 'failed', 'rejected')
      and resolved_at is not null
    )
  );

alter table public.wallet_withdrawals
  add column if not exists paystack_transfer_code text,
  add column if not exists paystack_reference text,
  add column if not exists paystack_transfer_status text,
  add column if not exists initiated_at timestamptz,
  add column if not exists paid_via text
    check (paid_via is null or paid_via in ('paystack', 'manual'));

comment on column public.wallet_withdrawals.paystack_transfer_code is
  'Paystack transfer_code from Initiate Transfer (TRF_…). Lookup key for webhooks.';
comment on column public.wallet_withdrawals.paystack_reference is
  'Our idempotent transfer reference sent to Paystack (unique per withdrawal).';
comment on column public.wallet_withdrawals.paystack_transfer_status is
  'Last known Paystack status string (pending, otp, success, failed, abandoned, …).';
comment on column public.wallet_withdrawals.initiated_at is
  'When paystack-payout successfully initiated (got transfer_code).';
comment on column public.wallet_withdrawals.paid_via is
  'paystack = webhook success; manual = ops emergency mark-paid (outage path).';

create unique index if not exists wallet_withdrawals_paystack_transfer_code_uidx
  on public.wallet_withdrawals (paystack_transfer_code)
  where paystack_transfer_code is not null;

create unique index if not exists wallet_withdrawals_paystack_reference_uidx
  on public.wallet_withdrawals (paystack_reference)
  where paystack_reference is not null;

create index if not exists wallet_withdrawals_in_flight_idx
  on public.wallet_withdrawals (status, requested_at)
  where status in ('pending', 'processing', 'needs_otp');

comment on table public.wallet_withdrawals is
  'Vendor withdrawal requests. Debit at Paystack initiate (incl. otp); paid via webhook or rare manual override; failed restores balance.';

-- -----------------------------------------------------------------------------
-- 4) wallet_transactions — allow reversal ledger rows
--
-- Types:
--   order_credit         (+) escrow release
--   withdrawal_paid      (−) debit when Paystack initiate succeeds OR manual pay
--   withdrawal_reversal  (+) restore after failed/reversed/abandoned transfer
-- -----------------------------------------------------------------------------
alter table public.wallet_transactions
  drop constraint if exists wallet_transactions_type_check;

alter table public.wallet_transactions
  add constraint wallet_transactions_type_check
  check (type in ('order_credit', 'withdrawal_paid', 'withdrawal_reversal'));

alter table public.wallet_transactions
  drop constraint if exists wallet_transactions_credit_positive;

alter table public.wallet_transactions
  add constraint wallet_transactions_credit_positive
  check (type <> 'order_credit' or amount > 0);

alter table public.wallet_transactions
  drop constraint if exists wallet_transactions_withdrawal_negative;

alter table public.wallet_transactions
  add constraint wallet_transactions_withdrawal_negative
  check (type <> 'withdrawal_paid' or amount < 0);

alter table public.wallet_transactions
  drop constraint if exists wallet_transactions_reversal_positive;

alter table public.wallet_transactions
  add constraint wallet_transactions_reversal_positive
  check (type <> 'withdrawal_reversal' or amount > 0);

alter table public.wallet_transactions
  drop constraint if exists wallet_transactions_paid_has_withdrawal;

alter table public.wallet_transactions
  add constraint wallet_transactions_paid_has_withdrawal
  check (
    (type not in ('withdrawal_paid', 'withdrawal_reversal'))
    or withdrawal_id is not null
  );

-- One reversal row per withdrawal (idempotent failed/reversed webhooks)
create unique index if not exists wallet_transactions_one_reversal_per_withdrawal
  on public.wallet_transactions (withdrawal_id)
  where type = 'withdrawal_reversal' and withdrawal_id is not null;

comment on table public.wallet_transactions is
  'Posted wallet ledger. order_credit; withdrawal_paid (debit on initiate/manual); withdrawal_reversal (restore on fail).';
