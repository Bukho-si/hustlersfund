-- Storage: payment-proofs UPDATE/DELETE restricted to admins
CREATE POLICY "Admins can update payment proofs"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'payment-proofs' AND public.is_admin(auth.uid()))
WITH CHECK (bucket_id = 'payment-proofs' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete payment proofs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'payment-proofs' AND public.is_admin(auth.uid()));

-- Realtime: restrict channel subscriptions
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can subscribe to own user channel or admins to any"
ON realtime.messages FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR realtime.topic() = ('user:' || auth.uid()::text)
  OR realtime.topic() = auth.uid()::text
);

CREATE POLICY "Users can broadcast to own user channel or admins to any"
ON realtime.messages FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin(auth.uid())
  OR realtime.topic() = ('user:' || auth.uid()::text)
  OR realtime.topic() = auth.uid()::text
);