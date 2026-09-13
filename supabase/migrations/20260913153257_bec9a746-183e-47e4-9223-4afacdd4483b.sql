CREATE OR REPLACE FUNCTION public.add_manual_petrol_to_personal(
  _member_user_id uuid,
  _amount numeric,
  _rate numeric DEFAULT NULL,
  _note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _actor uuid := auth.uid();
  _days integer;
  _principal numeric;
  _interest numeric;
  _total numeric;
  _due timestamptz;
  _loan_id uuid;
  _reason text;
BEGIN
  IF _actor IS NULL OR NOT public.has_any_admin_role(_actor) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF COALESCE(_amount, 0) <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;

  SELECT COALESCE(personal_repayment_days, 30), COALESCE(_rate, personal_interest_rate_percent, 15)
    INTO _days, _rate
  FROM loan_settings ORDER BY created_at LIMIT 1;

  _days := COALESCE(_days, 30);
  _rate := COALESCE(_rate, 15);

  _principal := ROUND(_amount, 2);
  _interest := ROUND(_principal * _rate / 100.0, 2);
  _total := _principal + _interest;
  _due := now() + (_days || ' days')::interval;
  _reason := COALESCE(NULLIF(btrim(_note), ''), 'Petrol loan captured manually onto personal loan');

  INSERT INTO loans (
    member_user_id, type, amount, reason, status, requested_at,
    approved_by, approved_at, interest_rate_percent, interest_amount,
    total_repayable, outstanding_balance, due_date, repayment_period
  ) VALUES (
    _member_user_id, 'personal', _principal, _reason, 'approved', now(),
    _actor, now(), _rate, _interest, _total, _total, _due, _days || ' days'
  ) RETURNING id INTO _loan_id;

  INSERT INTO personal_loan_schedule (
    loan_id, member_user_id, due_date, original_amount, current_balance, status, months_late
  ) VALUES (
    _loan_id, _member_user_id, _due::date, _principal, _total, 'pending', 0
  );

  INSERT INTO wallet_transactions (member_user_id, transaction_type, amount, description, reference_id, created_by)
  VALUES (_member_user_id, 'personal_loan_issued', _total, _reason, _loan_id, _actor);

  INSERT INTO financial_ledger (member_user_id, transaction_type, amount, reference_id, description, created_by)
  VALUES (_member_user_id, 'personal_loan_issued', _total, _loan_id, _reason, _actor);

  INSERT INTO personal_loan_activity (loan_id, actor_user_id, action, details)
  VALUES (_loan_id, _actor, 'manual_petrol_capture', _reason);

  RETURN jsonb_build_object(
    'loan_id', _loan_id,
    'principal', _principal,
    'interest', _interest,
    'total', _total,
    'due_date', _due
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.add_manual_petrol_to_personal(uuid, numeric, numeric, text) FROM public;
GRANT EXECUTE ON FUNCTION public.add_manual_petrol_to_personal(uuid, numeric, numeric, text) TO authenticated;