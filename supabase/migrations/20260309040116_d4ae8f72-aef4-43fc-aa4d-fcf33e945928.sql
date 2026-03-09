
-- Step 2: Update functions to include new roles
CREATE OR REPLACE FUNCTION public.has_any_admin_role(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'super_admin', 'emergency_admin', 'petrol_loan_admin', 'personal_loan_admin', 'accident_admin', 'funeral_admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'super_admin', 'emergency_admin', 'petrol_loan_admin', 'personal_loan_admin', 'accident_admin', 'funeral_admin')
  )
$$;
