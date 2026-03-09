
-- Trigger: auto-recalculate outstanding_balance and status when a repayment is inserted
CREATE OR REPLACE FUNCTION public.recalculate_loan_on_repayment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_total_repayable numeric;
  v_total_repaid numeric;
  v_remaining numeric;
  v_due_date timestamp with time zone;
BEGIN
  -- Get loan details
  SELECT total_repayable, due_date INTO v_total_repayable, v_due_date
  FROM loans WHERE id = NEW.loan_id;

  -- Sum all repayments for this loan
  SELECT COALESCE(SUM(amount), 0) INTO v_total_repaid
  FROM loan_repayments WHERE loan_id = NEW.loan_id;

  v_remaining := GREATEST(0, COALESCE(v_total_repayable, 0) - v_total_repaid);

  -- Update outstanding_balance and status
  IF v_remaining <= 0 THEN
    UPDATE loans SET outstanding_balance = 0, status = 'repaid', updated_at = now()
    WHERE id = NEW.loan_id;
  ELSE
    UPDATE loans SET outstanding_balance = v_remaining, updated_at = now()
    WHERE id = NEW.loan_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop if exists to avoid duplicate
DROP TRIGGER IF EXISTS trg_recalculate_loan_on_repayment ON public.loan_repayments;

CREATE TRIGGER trg_recalculate_loan_on_repayment
  AFTER INSERT ON public.loan_repayments
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_loan_on_repayment();
