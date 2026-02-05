-- Allow admins to delete payments (for correcting duplicate entries)
CREATE POLICY "Admins can delete payments"
ON public.payments
FOR DELETE
USING (is_admin(auth.uid()));