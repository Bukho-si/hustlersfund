
-- Add new loan statuses for petrol loan workflow
ALTER TYPE loan_status ADD VALUE IF NOT EXISTS 'requested';
ALTER TYPE loan_status ADD VALUE IF NOT EXISTS 'under_review';
ALTER TYPE loan_status ADD VALUE IF NOT EXISTS 'disbursed';
ALTER TYPE loan_status ADD VALUE IF NOT EXISTS 'repaid';

-- Add lock and disbursement columns to loans
ALTER TABLE loans ADD COLUMN IF NOT EXISTS locked_by uuid;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS locked_at timestamptz;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS disbursed_by uuid;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS disbursed_at timestamptz;

-- Activity feed table for petrol loans
CREATE TABLE IF NOT EXISTS petrol_loan_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid REFERENCES loans(id) ON DELETE CASCADE,
  actor_user_id uuid NOT NULL,
  action text NOT NULL,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE petrol_loan_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view petrol loan activity"
  ON petrol_loan_activity FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert petrol loan activity"
  ON petrol_loan_activity FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Nobody can update petrol loan activity"
  ON petrol_loan_activity FOR UPDATE TO authenticated
  USING (false);

CREATE POLICY "Nobody can delete petrol loan activity"
  ON petrol_loan_activity FOR DELETE TO authenticated
  USING (false);

ALTER PUBLICATION supabase_realtime ADD TABLE petrol_loan_activity;

-- Update wallet trigger: petrol loans create txn on 'disbursed', personal on 'approved'
CREATE OR REPLACE FUNCTION public.create_wallet_txn_on_loan_approved()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Personal loans: trigger on approved
  IF NEW.type = 'personal' AND NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    INSERT INTO public.wallet_transactions (member_user_id, transaction_type, amount, reference_id, description, created_by)
    VALUES (
      NEW.member_user_id,
      'personal_loan_issued'::wallet_transaction_type,
      NEW.amount,
      NEW.id,
      'personal loan issued - ' || COALESCE(NEW.reason, 'No reason specified'),
      NEW.approved_by
    );
  END IF;

  -- Petrol loans: trigger on disbursed
  IF NEW.type = 'petrol' AND NEW.status = 'disbursed' AND (OLD.status IS DISTINCT FROM 'disbursed') THEN
    INSERT INTO public.wallet_transactions (member_user_id, transaction_type, amount, reference_id, description, created_by)
    VALUES (
      NEW.member_user_id,
      'petrol_loan_issued'::wallet_transaction_type,
      NEW.amount,
      NEW.id,
      'petrol loan disbursed - ' || COALESCE(NEW.reason, 'No reason specified'),
      NEW.disbursed_by
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Update legacy ledger trigger too
CREATE OR REPLACE FUNCTION public.create_ledger_on_loan_approved()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.type = 'personal' AND NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    INSERT INTO public.financial_ledger (member_user_id, transaction_type, amount, reference_id, description, created_by)
    VALUES (
      NEW.member_user_id,
      'personal_loan_issued'::ledger_transaction_type,
      NEW.amount,
      NEW.id,
      'personal loan issued - ' || COALESCE(NEW.reason, 'No reason specified'),
      NEW.approved_by
    );
  END IF;

  IF NEW.type = 'petrol' AND NEW.status = 'disbursed' AND (OLD.status IS DISTINCT FROM 'disbursed') THEN
    INSERT INTO public.financial_ledger (member_user_id, transaction_type, amount, reference_id, description, created_by)
    VALUES (
      NEW.member_user_id,
      'petrol_loan_issued'::ledger_transaction_type,
      NEW.amount,
      NEW.id,
      'petrol loan disbursed - ' || COALESCE(NEW.reason, 'No reason specified'),
      NEW.disbursed_by
    );
  END IF;

  RETURN NEW;
END;
$function$;
