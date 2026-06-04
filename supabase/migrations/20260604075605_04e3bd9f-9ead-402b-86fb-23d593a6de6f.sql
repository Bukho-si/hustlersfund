
-- Fix 1: Restrict loan inserts to pending status only
DROP POLICY IF EXISTS "Users can insert their own loan requests" ON public.loans;
CREATE POLICY "Users can insert their own loan requests"
ON public.loans
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = member_user_id
  AND status = 'pending'
  AND approved_by IS NULL
  AND approved_at IS NULL
  AND disbursed_by IS NULL
  AND disbursed_at IS NULL
);

-- Fix 2: Prevent members from escalating privileged profile fields via trigger
CREATE OR REPLACE FUNCTION public.prevent_member_profile_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Skip checks for admins / service role
  IF public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- Non-admin self-updates: block privileged field changes
  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.joining_fee_paid IS DISTINCT FROM OLD.joining_fee_paid
     OR NEW.joining_fee_paid_total IS DISTINCT FROM OLD.joining_fee_paid_total
     OR NEW.membership_slots IS DISTINCT FROM OLD.membership_slots THEN
    RAISE EXCEPTION 'Members cannot modify privileged profile fields (status, joining_fee_paid, joining_fee_paid_total, membership_slots)';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_member_profile_escalation_trg ON public.member_profiles;
CREATE TRIGGER prevent_member_profile_escalation_trg
BEFORE UPDATE ON public.member_profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_member_profile_escalation();
