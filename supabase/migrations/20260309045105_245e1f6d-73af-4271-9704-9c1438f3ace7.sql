
-- Create emergency_contributors table for both member and external contributors
CREATE TABLE public.emergency_contributors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.emergency_events(id) ON DELETE CASCADE,
  member_user_id uuid NULL,
  external_name text NULL,
  external_phone text NULL,
  contributor_type text NOT NULL DEFAULT 'member' CHECK (contributor_type IN ('member', 'external')),
  amount_due numeric NOT NULL DEFAULT 0,
  amount_paid numeric NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid')),
  recorded_by_admin uuid NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.emergency_contributors ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage contributors" ON public.emergency_contributors FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Users can view their own contributor records" ON public.emergency_contributors FOR SELECT USING (auth.uid() = member_user_id);

-- Updated_at trigger
CREATE TRIGGER update_emergency_contributors_updated_at
  BEFORE UPDATE ON public.emergency_contributors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
