CREATE OR REPLACE FUNCTION public.migrate_petrol_loan_to_personal(_petrol_loan_id uuid, _reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
  _petrol loans%ROWTYPE;
  _target loans%ROWTYPE;
  _rate numeric;
  _days integer;
  _principal numeric;
  _interest numeric;
  _total numeric;
  _new_loan_id uuid;
  _sched_id uuid;
BEGIN
  IF _actor IS NULL OR NOT public.has_any_admin_role(_actor) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO _petrol FROM loans WHERE id = _petrol_loan_id FOR UPDATE;
  IF NOT FOUND OR _petrol.type <> 'petrol' THEN
    RAISE EXCEPTION 'Petrol loan not found';
  END IF;
  IF _petrol.status NOT IN ('approved', 'disbursed') THEN
    RAISE EXCEPTION 'Only approved or disbursed petrol loans can be migrated';
  END IF;
  IF COALESCE(_petrol.outstanding_balance, 0) <= 0 THEN
    RAISE EXCEPTION 'This petrol loan has no outstanding balance';
  END IF;

  SELECT COALESCE(personal_interest_rate_percent, 15), COALESCE(personal_repayment_days, 30)
    INTO _rate, _days
  FROM loan_settings ORDER BY created_at LIMIT 1;
  _rate := COALESCE(_rate, 15);
  _days := COALESCE(_days, 30);

  _principal := ROUND(_petrol.outstanding_balance, 2);
  _interest := ROUND(_principal * _rate / 100.0, 2);
  _total := _principal + _interest;

  SELECT * INTO _target
  FROM loans
  WHERE member_user_id = _petrol.member_user_id
    AND type = 'personal'
    AND status IN ('approved', 'disbursed')
    AND COALESCE(outstanding_balance, 0) > 0
  ORDER BY requested_at DESC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    UPDATE loans SET
      amount = amount + _principal,
      interest_amount = COALESCE(interest_amount, 0) + _interest,
      total_repayable = COALESCE(total_repayable, amount) + _total,
      outstanding_balance = outstanding_balance + _total,
      updated_at = now()
    WHERE id = _target.id;
    _new_loan_id := _target.id;

    UPDATE personal_loan_schedule SET
      original_amount = original_amount + _principal,
      current_balance = current_balance + _total,
      status = CASE WHEN status = 'paid' THEN 'pending' ELSE status END,
      updated_at = now()
    WHERE loan_id = _target.id;
  ELSE
    INSERT INTO loans (
      member_user_id, type, amount, reason, status, requested_at,
      approved_by, approved_at, interest_rate_percent, interest_amount,
      total_repayable, outstanding_balance, due_date, repayment_period
    ) VALUES (
      _petrol.member_user_id, 'personal', _principal,
      COALESCE(_reason, 'Migrated from petrol loan'), 'approved', now(),
      _actor, now(), _rate, _interest, _total, _total,
      now() + (_days || ' days')::interval, _days || ' days'
    ) RETURNING id INTO _new_loan_id;

    INSERT INTO personal_loan_schedule (
      loan_id, member_user_id, due_date, original_amount, current_balance, status, months_late
    ) VALUES (
      _new_loan_id, _petrol.member_user_id, (now() + (_days || ' days')::interval)::date,
      _principal, _total, 'pending', 0
    ) RETURNING id INTO _sched_id;
  END IF;

  UPDATE loans SET
    outstanding_balance = 0,
    status = 'repaid',
    updated_at = now()
  WHERE id = _petrol.id;

  INSERT INTO wallet_transactions (member_user_id, transaction_type, amount, description, reference_id, created_by)
  VALUES
    (_petrol.member_user_id, 'petrol_loan_repayment', _principal, 'Petrol loan migrated to personal loan', _petrol.id, _actor),
    (_petrol.member_user_id, 'personal_loan_issued', _total, 'Migrated petrol loan balance plus interest', _new_loan_id, _actor);

  INSERT INTO petrol_loan_activity (loan_id, actor_user_id, action, details)
  VALUES (_petrol.id, _actor, 'migrated_to_personal',
    'Balance ' || _principal::text || ' migrated to personal loan. ' || COALESCE(_reason, ''));

  INSERT INTO personal_loan_activity (loan_id, actor_user_id, action, details)
  VALUES (_new_loan_id, _actor, 'petrol_loan_migrated',
    'Received ' || _principal::text || ' principal + ' || _interest::text || ' interest from petrol loan. ' || COALESCE(_reason, ''));

  INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, metadata_json)
  VALUES (_actor, 'migrate_petrol_loan_to_personal', 'loan', _petrol.id,
    jsonb_build_object(
      'member_user_id', _petrol.member_user_id,
      'petrol_loan_id', _petrol.id,
      'personal_loan_id', _new_loan_id,
      'principal', _principal,
      'interest_rate_percent', _rate,
      'interest', _interest,
      'total_added', _total,
      'merged_into_existing', _target.id IS NOT NULL,
      'reason', _reason
    ));

  RETURN jsonb_build_object(
    'personal_loan_id', _new_loan_id,
    'principal', _principal,
    'interest', _interest,
    'total_added', _total,
    'merged_into_existing', _target.id IS NOT NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.migrate_petrol_loan_to_personal(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.migrate_petrol_loan_to_personal(uuid, text) TO authenticated;