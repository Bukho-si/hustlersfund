
CREATE OR REPLACE FUNCTION public.set_loan_due_date()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_repayment_days integer;
  v_issue_date timestamp with time zone;
BEGIN
  -- Personal loans: set due_date on approved
  IF NEW.type = 'personal' AND NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    SELECT COALESCE(personal_repayment_days, 30) INTO v_repayment_days FROM loan_settings LIMIT 1;
    v_issue_date := COALESCE(NEW.approved_at, now());
    NEW.due_date := v_issue_date + (v_repayment_days || ' days')::interval;
  END IF;

  -- Petrol loans: set due_date on disbursed
  IF NEW.type = 'petrol' AND NEW.status = 'disbursed' AND (OLD.status IS DISTINCT FROM 'disbursed') THEN
    SELECT COALESCE(petrol_repayment_days, 7) INTO v_repayment_days FROM loan_settings LIMIT 1;
    v_issue_date := COALESCE(NEW.disbursed_at, now());
    NEW.due_date := v_issue_date + (v_repayment_days || ' days')::interval;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_loan_due_date
  BEFORE UPDATE ON public.loans
  FOR EACH ROW
  EXECUTE FUNCTION public.set_loan_due_date();
