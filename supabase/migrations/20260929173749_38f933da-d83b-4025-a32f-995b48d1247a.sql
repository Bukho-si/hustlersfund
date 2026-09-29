CREATE OR REPLACE FUNCTION public.is_member_or_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.member_profiles WHERE user_id = _user_id)
      OR public.has_any_admin_role(_user_id)
$$;

DROP POLICY IF EXISTS "Authenticated users can view cycles" ON public.contribution_cycles;
CREATE POLICY "Members and admins can view cycles" ON public.contribution_cycles FOR SELECT TO authenticated USING (public.is_member_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view settings" ON public.contribution_settings;
CREATE POLICY "Members and admins can view settings" ON public.contribution_settings FOR SELECT TO authenticated USING (public.is_member_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view loan settings" ON public.loan_settings;
CREATE POLICY "Members and admins can view loan settings" ON public.loan_settings FOR SELECT TO authenticated USING (public.is_member_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view events" ON public.emergency_events;
CREATE POLICY "Members and admins can view events" ON public.emergency_events FOR SELECT TO authenticated USING (public.is_member_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view request window" ON public.petrol_request_window;
CREATE POLICY "Members and admins can view request window" ON public.petrol_request_window FOR SELECT TO authenticated USING (public.is_member_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view petrol fund" ON public.petrol_fund;
CREATE POLICY "Admins can view petrol fund" ON public.petrol_fund FOR SELECT TO authenticated USING (public.has_any_admin_role(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view personal loan fund" ON public.personal_loan_fund;
CREATE POLICY "Admins can view personal loan fund" ON public.personal_loan_fund FOR SELECT TO authenticated USING (public.has_any_admin_role(auth.uid()));