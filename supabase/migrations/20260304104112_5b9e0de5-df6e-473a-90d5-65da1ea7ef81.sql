CREATE POLICY "Users can withdraw their own submitted payments"
ON public.payments
FOR UPDATE
TO authenticated
USING (
  auth.uid() = member_user_id
  AND status = 'submitted'
)
WITH CHECK (
  auth.uid() = member_user_id
  AND status = 'withdrawn'
);