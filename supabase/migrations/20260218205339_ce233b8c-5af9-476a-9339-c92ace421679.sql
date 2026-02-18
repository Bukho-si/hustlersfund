
-- Fix 1: Add server-side file validation to payment-proofs bucket
UPDATE storage.buckets 
SET 
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'application/pdf'],
  file_size_limit = 5242880
WHERE id = 'payment-proofs';

-- Fix 2: Explicitly deny UPDATE and DELETE on audit_log for everyone
CREATE POLICY "Nobody can update audit logs"
ON public.audit_log
FOR UPDATE
USING (false);

CREATE POLICY "Nobody can delete audit logs"
ON public.audit_log
FOR DELETE
USING (false);
