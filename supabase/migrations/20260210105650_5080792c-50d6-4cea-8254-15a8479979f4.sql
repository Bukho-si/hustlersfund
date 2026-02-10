
CREATE OR REPLACE FUNCTION public.sync_joining_fee_on_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total numeric;
  v_slots integer;
  v_fee_per_slot numeric;
BEGIN
  -- Only act when status changes to 'verified'
  IF NEW.status = 'verified' AND (OLD.status IS DISTINCT FROM 'verified') AND NEW.joining_fee_amount > 0 THEN
    -- Sum all verified joining fees for this member
    SELECT COALESCE(SUM(joining_fee_amount), 0) INTO v_total
    FROM payments
    WHERE member_user_id = NEW.member_user_id
      AND status = 'verified';

    -- Get member slots and joining fee amount
    SELECT membership_slots INTO v_slots
    FROM member_profiles
    WHERE user_id = NEW.member_user_id;

    SELECT joining_fee_amount INTO v_fee_per_slot
    FROM contribution_settings
    LIMIT 1;

    -- Update profile
    UPDATE member_profiles
    SET joining_fee_paid_total = v_total,
        joining_fee_paid = (v_total >= (COALESCE(v_slots, 1) * COALESCE(v_fee_per_slot, 200)))
    WHERE user_id = NEW.member_user_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_joining_fee_on_verify
AFTER UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.sync_joining_fee_on_verification();
