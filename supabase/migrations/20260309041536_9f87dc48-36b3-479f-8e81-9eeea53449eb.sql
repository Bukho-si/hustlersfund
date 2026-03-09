
-- Create wallet transaction type enum
CREATE TYPE public.wallet_transaction_type AS ENUM (
  'joining_fee_payment',
  'weekly_contribution',
  'petrol_loan_issued',
  'petrol_loan_repayment',
  'personal_loan_issued',
  'personal_loan_repayment',
  'funeral_contribution',
  'accident_contribution',
  'emergency_contribution',
  'late_fee',
  'cash_fee'
);

-- Create member_wallets table
CREATE TABLE public.member_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_user_id uuid NOT NULL UNIQUE,
  contribution_balance numeric NOT NULL DEFAULT 0,
  petrol_loan_balance numeric NOT NULL DEFAULT 0,
  personal_loan_balance numeric NOT NULL DEFAULT 0,
  emergency_contributions_total numeric NOT NULL DEFAULT 0,
  joining_fee_balance numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create wallet_transactions table
CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_user_id uuid NOT NULL,
  transaction_type wallet_transaction_type NOT NULL,
  amount numeric NOT NULL,
  description text,
  reference_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.member_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- RLS for member_wallets
CREATE POLICY "Users can view their own wallet" ON public.member_wallets FOR SELECT USING (auth.uid() = member_user_id);
CREATE POLICY "Admins can view all wallets" ON public.member_wallets FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Nobody can delete wallets" ON public.member_wallets FOR DELETE USING (false);

-- RLS for wallet_transactions
CREATE POLICY "Users can view their own wallet transactions" ON public.wallet_transactions FOR SELECT USING (auth.uid() = member_user_id);
CREATE POLICY "Admins can view all wallet transactions" ON public.wallet_transactions FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can insert wallet transactions" ON public.wallet_transactions FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Nobody can update wallet transactions" ON public.wallet_transactions FOR UPDATE USING (false);
CREATE POLICY "Nobody can delete wallet transactions" ON public.wallet_transactions FOR DELETE USING (false);

-- Migrate data from financial_ledger to wallet_transactions
INSERT INTO public.wallet_transactions (id, member_user_id, transaction_type, amount, description, reference_id, created_by, created_at)
SELECT
  id,
  member_user_id,
  CASE transaction_type::text
    WHEN 'joining_fee' THEN 'joining_fee_payment'::wallet_transaction_type
    WHEN 'weekly_contribution' THEN 'weekly_contribution'::wallet_transaction_type
    WHEN 'petrol_loan_issued' THEN 'petrol_loan_issued'::wallet_transaction_type
    WHEN 'petrol_loan_repayment' THEN 'petrol_loan_repayment'::wallet_transaction_type
    WHEN 'personal_loan_issued' THEN 'personal_loan_issued'::wallet_transaction_type
    WHEN 'personal_loan_repayment' THEN 'personal_loan_repayment'::wallet_transaction_type
    WHEN 'emergency_contribution' THEN 'emergency_contribution'::wallet_transaction_type
    WHEN 'late_fee' THEN 'late_fee'::wallet_transaction_type
    WHEN 'cash_fee' THEN 'cash_fee'::wallet_transaction_type
  END,
  amount,
  description,
  reference_id,
  created_by,
  created_at
FROM public.financial_ledger;

-- Create trigger function to update wallet balances on transaction insert
CREATE OR REPLACE FUNCTION public.update_wallet_on_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Ensure wallet exists
  INSERT INTO member_wallets (member_user_id)
  VALUES (NEW.member_user_id)
  ON CONFLICT (member_user_id) DO NOTHING;

  -- Update balance based on transaction type
  IF NEW.transaction_type = 'weekly_contribution' THEN
    UPDATE member_wallets SET contribution_balance = contribution_balance + NEW.amount, updated_at = now() WHERE member_user_id = NEW.member_user_id;
  ELSIF NEW.transaction_type = 'joining_fee_payment' THEN
    UPDATE member_wallets SET joining_fee_balance = joining_fee_balance + NEW.amount, updated_at = now() WHERE member_user_id = NEW.member_user_id;
  ELSIF NEW.transaction_type = 'petrol_loan_issued' THEN
    UPDATE member_wallets SET petrol_loan_balance = petrol_loan_balance + NEW.amount, updated_at = now() WHERE member_user_id = NEW.member_user_id;
  ELSIF NEW.transaction_type = 'petrol_loan_repayment' THEN
    UPDATE member_wallets SET petrol_loan_balance = petrol_loan_balance - NEW.amount, updated_at = now() WHERE member_user_id = NEW.member_user_id;
  ELSIF NEW.transaction_type = 'personal_loan_issued' THEN
    UPDATE member_wallets SET personal_loan_balance = personal_loan_balance + NEW.amount, updated_at = now() WHERE member_user_id = NEW.member_user_id;
  ELSIF NEW.transaction_type = 'personal_loan_repayment' THEN
    UPDATE member_wallets SET personal_loan_balance = personal_loan_balance - NEW.amount, updated_at = now() WHERE member_user_id = NEW.member_user_id;
  ELSIF NEW.transaction_type IN ('funeral_contribution', 'accident_contribution', 'emergency_contribution') THEN
    UPDATE member_wallets SET emergency_contributions_total = emergency_contributions_total + NEW.amount, updated_at = now() WHERE member_user_id = NEW.member_user_id;
  ELSIF NEW.transaction_type IN ('late_fee', 'cash_fee') THEN
    UPDATE member_wallets SET contribution_balance = contribution_balance + NEW.amount, updated_at = now() WHERE member_user_id = NEW.member_user_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_wallet_on_transaction
  AFTER INSERT ON public.wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_wallet_on_transaction();

-- Populate initial wallet balances from migrated transactions
INSERT INTO member_wallets (member_user_id, contribution_balance, petrol_loan_balance, personal_loan_balance, emergency_contributions_total, joining_fee_balance)
SELECT
  member_user_id,
  COALESCE(SUM(CASE WHEN transaction_type IN ('weekly_contribution', 'late_fee', 'cash_fee') THEN amount ELSE 0 END), 0),
  COALESCE(SUM(CASE WHEN transaction_type = 'petrol_loan_issued' THEN amount WHEN transaction_type = 'petrol_loan_repayment' THEN -amount ELSE 0 END), 0),
  COALESCE(SUM(CASE WHEN transaction_type = 'personal_loan_issued' THEN amount WHEN transaction_type = 'personal_loan_repayment' THEN -amount ELSE 0 END), 0),
  COALESCE(SUM(CASE WHEN transaction_type IN ('funeral_contribution', 'accident_contribution', 'emergency_contribution') THEN amount ELSE 0 END), 0),
  COALESCE(SUM(CASE WHEN transaction_type = 'joining_fee_payment' THEN amount ELSE 0 END), 0)
FROM wallet_transactions
GROUP BY member_user_id
ON CONFLICT (member_user_id) DO UPDATE SET
  contribution_balance = EXCLUDED.contribution_balance,
  petrol_loan_balance = EXCLUDED.petrol_loan_balance,
  personal_loan_balance = EXCLUDED.personal_loan_balance,
  emergency_contributions_total = EXCLUDED.emergency_contributions_total,
  joining_fee_balance = EXCLUDED.joining_fee_balance,
  updated_at = now();

-- Drop old financial_ledger triggers
DROP TRIGGER IF EXISTS trg_ledger_on_payment_verified ON public.payments;
DROP TRIGGER IF EXISTS trg_ledger_on_loan_approved ON public.loans;
DROP TRIGGER IF EXISTS trg_ledger_on_loan_repayment ON public.loan_repayments;

-- New trigger: payment verified → wallet_transactions
CREATE OR REPLACE FUNCTION public.create_wallet_txn_on_payment_verified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'verified' AND (OLD.status IS DISTINCT FROM 'verified') THEN
    IF NEW.base_amount > 0 THEN
      INSERT INTO public.wallet_transactions (member_user_id, transaction_type, amount, reference_id, description, created_by)
      VALUES (NEW.member_user_id, 'weekly_contribution', NEW.base_amount, NEW.id, 'Weekly subscription payment', NEW.verified_by);
    END IF;

    IF NEW.joining_fee_amount > 0 THEN
      INSERT INTO public.wallet_transactions (member_user_id, transaction_type, amount, reference_id, description, created_by)
      VALUES (NEW.member_user_id, 'joining_fee_payment', NEW.joining_fee_amount, NEW.id, 'Joining fee payment', NEW.verified_by);
    END IF;

    IF NEW.late_fine_amount > 0 THEN
      INSERT INTO public.wallet_transactions (member_user_id, transaction_type, amount, reference_id, description, created_by)
      VALUES (NEW.member_user_id, 'late_fee', NEW.late_fine_amount, NEW.id, 'Late payment fine', NEW.verified_by);
    END IF;

    IF NEW.cash_fee_amount > 0 THEN
      INSERT INTO public.wallet_transactions (member_user_id, transaction_type, amount, reference_id, description, created_by)
      VALUES (NEW.member_user_id, 'cash_fee', NEW.cash_fee_amount, NEW.id, 'Cash/ATM deposit fee', NEW.verified_by);
    END IF;

    IF NEW.emergency_total_amount > 0 THEN
      INSERT INTO public.wallet_transactions (member_user_id, transaction_type, amount, reference_id, description, created_by)
      VALUES (NEW.member_user_id, 'emergency_contribution', NEW.emergency_total_amount, NEW.id, 'Emergency contribution', NEW.verified_by);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_wallet_on_payment_verified
  AFTER UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION create_wallet_txn_on_payment_verified();

-- New trigger: loan approved → wallet_transactions
CREATE OR REPLACE FUNCTION public.create_wallet_txn_on_loan_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    INSERT INTO public.wallet_transactions (member_user_id, transaction_type, amount, reference_id, description, created_by)
    VALUES (
      NEW.member_user_id,
      CASE WHEN NEW.type = 'petrol' THEN 'petrol_loan_issued'::wallet_transaction_type
           ELSE 'personal_loan_issued'::wallet_transaction_type END,
      NEW.amount,
      NEW.id,
      NEW.type || ' loan issued - ' || COALESCE(NEW.reason, 'No reason specified'),
      NEW.approved_by
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_wallet_on_loan_approved
  AFTER UPDATE ON public.loans
  FOR EACH ROW
  EXECUTE FUNCTION create_wallet_txn_on_loan_approved();

-- New trigger: loan repayment → wallet_transactions
CREATE OR REPLACE FUNCTION public.create_wallet_txn_on_loan_repayment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_loan_type loan_type;
  v_member_user_id uuid;
BEGIN
  SELECT type, member_user_id INTO v_loan_type, v_member_user_id
  FROM public.loans WHERE id = NEW.loan_id;

  INSERT INTO public.wallet_transactions (member_user_id, transaction_type, amount, reference_id, description, created_by)
  VALUES (
    v_member_user_id,
    CASE WHEN v_loan_type = 'petrol' THEN 'petrol_loan_repayment'::wallet_transaction_type
         ELSE 'personal_loan_repayment'::wallet_transaction_type END,
    NEW.amount,
    NEW.loan_id,
    v_loan_type || ' loan repayment',
    NEW.recorded_by
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_wallet_on_loan_repayment
  AFTER INSERT ON public.loan_repayments
  FOR EACH ROW
  EXECUTE FUNCTION create_wallet_txn_on_loan_repayment();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.member_wallets;
