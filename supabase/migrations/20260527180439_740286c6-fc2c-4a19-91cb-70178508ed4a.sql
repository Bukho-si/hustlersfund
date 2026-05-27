
-- 1. Restrict public read on sensitive config/fund tables to authenticated only
DROP POLICY IF EXISTS "Authenticated users can view settings" ON public.contribution_settings;
CREATE POLICY "Authenticated users can view settings"
  ON public.contribution_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can view loan settings" ON public.loan_settings;
CREATE POLICY "Authenticated users can view loan settings"
  ON public.loan_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can view personal loan fund" ON public.personal_loan_fund;
CREATE POLICY "Authenticated users can view personal loan fund"
  ON public.personal_loan_fund FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can view petrol fund" ON public.petrol_fund;
CREATE POLICY "Authenticated users can view petrol fund"
  ON public.petrol_fund FOR SELECT TO authenticated USING (true);

-- 2. Restrict user_roles mutations to super_admin only (regular admins can't escalate)
DROP POLICY IF EXISTS "Super admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can view all roles" ON public.user_roles;

CREATE POLICY "Super admins can view all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can insert roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can update roles"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can delete roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- 3. Allow members to view their own emergency contributor payment records
CREATE POLICY "Members can view their own contributor payments"
  ON public.emergency_contributor_payments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.emergency_contributors ec
      WHERE ec.id = emergency_contributor_payments.contributor_id
        AND ec.member_user_id = auth.uid()
    )
  );
