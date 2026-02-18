-- Add explicit INSERT and DELETE policies to loan_settings
CREATE POLICY "Admins can insert loan settings"
ON public.loan_settings
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete loan settings"
ON public.loan_settings
FOR DELETE
USING (public.is_admin(auth.uid()));