CREATE POLICY "Admins can insert loans for members"
ON public.loans
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));