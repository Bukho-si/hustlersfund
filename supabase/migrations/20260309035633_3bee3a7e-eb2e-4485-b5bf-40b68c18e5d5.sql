
-- Create enum for ledger transaction types
CREATE TYPE public.ledger_transaction_type AS ENUM (
  'joining_fee',
  'weekly_contribution',
  'petrol_loan_issued',
  'petrol_loan_repayment',
  'personal_loan_issued',
  'personal_loan_repayment',
  'emergency_contribution',
  'late_fee',
  'cash_fee'
);

-- Create financial_ledger table
CREATE TABLE public.financial_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_user_id UUID NOT NULL,
  transaction_type ledger_transaction_type NOT NULL,
  amount NUMERIC NOT NULL,
  reference_id UUID,
  description TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.financial_ledger ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can view all ledger entries"
  ON public.financial_ledger FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert ledger entries"
  ON public.financial_ledger FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view their own ledger entries"
  ON public.financial_ledger FOR SELECT
  USING (auth.uid() = member_user_id);

CREATE POLICY "Nobody can update ledger entries"
  ON public.financial_ledger FOR UPDATE
  USING (false);

CREATE POLICY "Nobody can delete ledger entries"
  ON public.financial_ledger FOR DELETE
  USING (false);

-- System insert policy for triggers (SECURITY DEFINER functions bypass RLS, but let's also allow system inserts)

-- Trigger: auto-create ledger entries when a payment is verified
CREATE OR REPLACE FUNCTION public.create_ledger_on_payment_verified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only fire when status changes to 'verified'
  IF NEW.status = 'verified' AND (OLD.status IS DISTINCT FROM 'verified') THEN
    -- Weekly contribution (base_amount)
    IF NEW.base_amount > 0 THEN
      INSERT INTO public.financial_ledger (member_user_id, transaction_type, amount, reference_id, description, created_by)
      VALUES (NEW.member_user_id, 'weekly_contribution', NEW.base_amount, NEW.id, 'Weekly subscription payment', NEW.verified_by);
    END IF;

    -- Joining fee
    IF NEW.joining_fee_amount > 0 THEN
      INSERT INTO public.financial_ledger (member_user_id, transaction_type, amount, reference_id, description, created_by)
      VALUES (NEW.member_user_id, 'joining_fee', NEW.joining_fee_amount, NEW.id, 'Joining fee payment', NEW.verified_by);
    END IF;

    -- Late fine
    IF NEW.late_fine_amount > 0 THEN
      INSERT INTO public.financial_ledger (member_user_id, transaction_type, amount, reference_id, description, created_by)
      VALUES (NEW.member_user_id, 'late_fee', NEW.late_fine_amount, NEW.id, 'Late payment fine', NEW.verified_by);
    END IF;

    -- Cash/ATM fee
    IF NEW.cash_fee_amount > 0 THEN
      INSERT INTO public.financial_ledger (member_user_id, transaction_type, amount, reference_id, description, created_by)
      VALUES (NEW.member_user_id, 'cash_fee', NEW.cash_fee_amount, NEW.id, 'Cash/ATM deposit fee', NEW.verified_by);
    END IF;

    -- Emergency contribution
    IF NEW.emergency_total_amount > 0 THEN
      INSERT INTO public.financial_ledger (member_user_id, transaction_type, amount, reference_id, description, created_by)
      VALUES (NEW.member_user_id, 'emergency_contribution', NEW.emergency_total_amount, NEW.id, 'Emergency contribution', NEW.verified_by);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ledger_on_payment_verified
  AFTER UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.create_ledger_on_payment_verified();

-- Trigger: auto-create ledger entry when a loan is approved
CREATE OR REPLACE FUNCTION public.create_ledger_on_loan_approved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    INSERT INTO public.financial_ledger (member_user_id, transaction_type, amount, reference_id, description, created_by)
    VALUES (
      NEW.member_user_id,
      CASE WHEN NEW.type = 'petrol' THEN 'petrol_loan_issued'::ledger_transaction_type
           ELSE 'personal_loan_issued'::ledger_transaction_type END,
      NEW.amount,
      NEW.id,
      NEW.type || ' loan issued - ' || COALESCE(NEW.reason, 'No reason specified'),
      NEW.approved_by
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ledger_on_loan_approved
  AFTER UPDATE ON public.loans
  FOR EACH ROW
  EXECUTE FUNCTION public.create_ledger_on_loan_approved();

-- Trigger: auto-create ledger entry when a loan repayment is recorded
CREATE OR REPLACE FUNCTION public.create_ledger_on_loan_repayment()
RETURNS TRIGGER
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

  INSERT INTO public.financial_ledger (member_user_id, transaction_type, amount, reference_id, description, created_by)
  VALUES (
    v_member_user_id,
    CASE WHEN v_loan_type = 'petrol' THEN 'petrol_loan_repayment'::ledger_transaction_type
         ELSE 'personal_loan_repayment'::ledger_transaction_type END,
    NEW.amount,
    NEW.loan_id,
    v_loan_type || ' loan repayment',
    NEW.recorded_by
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ledger_on_loan_repayment
  AFTER INSERT ON public.loan_repayments
  FOR EACH ROW
  EXECUTE FUNCTION public.create_ledger_on_loan_repayment();

-- Enable realtime for ledger
ALTER PUBLICATION supabase_realtime ADD TABLE public.financial_ledger;
