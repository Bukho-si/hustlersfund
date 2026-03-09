
-- Add payment_deadline to emergency_events
ALTER TABLE public.emergency_events ADD COLUMN IF NOT EXISTS payment_deadline date;

-- Add partially_paid and overdue to emergency_due_status enum
ALTER TYPE public.emergency_due_status ADD VALUE IF NOT EXISTS 'partially_paid';
ALTER TYPE public.emergency_due_status ADD VALUE IF NOT EXISTS 'overdue';

-- Create emergency_payment_history table for tracking partial payments
CREATE TABLE public.emergency_payment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  due_id uuid NOT NULL REFERENCES public.emergency_dues(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.emergency_events(id) ON DELETE CASCADE,
  member_user_id uuid NOT NULL,
  amount numeric NOT NULL,
  payment_date timestamp with time zone NOT NULL DEFAULT now(),
  recorded_by uuid NOT NULL,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.emergency_payment_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage emergency payment history" ON public.emergency_payment_history FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Users can view their own emergency payment history" ON public.emergency_payment_history FOR SELECT USING (auth.uid() = member_user_id);

-- Also create same table for external contributor payments
CREATE TABLE public.emergency_contributor_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id uuid NOT NULL REFERENCES public.emergency_contributors(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.emergency_events(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  payment_date timestamp with time zone NOT NULL DEFAULT now(),
  recorded_by uuid NOT NULL,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.emergency_contributor_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage contributor payments" ON public.emergency_contributor_payments FOR ALL USING (is_admin(auth.uid()));
