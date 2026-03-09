
-- Function to recalculate a single member's wallet balances from wallet_transactions
CREATE OR REPLACE FUNCTION public.recalculate_wallet_balance(_member_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_contribution numeric := 0;
  v_joining numeric := 0;
  v_petrol numeric := 0;
  v_personal numeric := 0;
  v_emergency numeric := 0;
  rec record;
BEGIN
  FOR rec IN
    SELECT transaction_type, amount FROM wallet_transactions WHERE member_user_id = _member_user_id
  LOOP
    CASE rec.transaction_type
      WHEN 'weekly_contribution' THEN v_contribution := v_contribution + rec.amount;
      WHEN 'late_fee' THEN v_contribution := v_contribution + rec.amount;
      WHEN 'cash_fee' THEN v_contribution := v_contribution + rec.amount;
      WHEN 'joining_fee_payment' THEN v_joining := v_joining + rec.amount;
      WHEN 'petrol_loan_issued' THEN v_petrol := v_petrol + rec.amount;
      WHEN 'petrol_loan_repayment' THEN v_petrol := v_petrol - rec.amount;
      WHEN 'personal_loan_issued' THEN v_personal := v_personal + rec.amount;
      WHEN 'personal_loan_repayment' THEN v_personal := v_personal - rec.amount;
      WHEN 'funeral_contribution' THEN v_emergency := v_emergency + rec.amount;
      WHEN 'accident_contribution' THEN v_emergency := v_emergency + rec.amount;
      WHEN 'emergency_contribution' THEN v_emergency := v_emergency + rec.amount;
      ELSE NULL;
    END CASE;
  END LOOP;

  INSERT INTO member_wallets (member_user_id, contribution_balance, joining_fee_balance, petrol_loan_balance, personal_loan_balance, emergency_contributions_total, updated_at)
  VALUES (_member_user_id, v_contribution, v_joining, v_petrol, v_personal, v_emergency, now())
  ON CONFLICT (member_user_id) DO UPDATE SET
    contribution_balance = v_contribution,
    joining_fee_balance = v_joining,
    petrol_loan_balance = v_petrol,
    personal_loan_balance = v_personal,
    emergency_contributions_total = v_emergency,
    updated_at = now();
END;
$$;
