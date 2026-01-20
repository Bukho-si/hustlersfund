-- Create enums for the application
CREATE TYPE public.app_role AS ENUM ('member', 'admin');
CREATE TYPE public.member_status AS ENUM ('pending', 'active', 'suspended', 'exited');
CREATE TYPE public.payment_method AS ENUM ('eft', 'cash_atm');
CREATE TYPE public.payment_status AS ENUM ('submitted', 'pending_verification', 'verified', 'rejected');
CREATE TYPE public.loan_type AS ENUM ('petrol', 'personal');
CREATE TYPE public.loan_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.emergency_type AS ENUM ('funeral', 'accident');
CREATE TYPE public.emergency_event_status AS ENUM ('active', 'closed');
CREATE TYPE public.emergency_due_status AS ENUM ('unpaid', 'paid');

-- Create member_profiles table
CREATE TABLE public.member_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  vehicle_reg TEXT,
  uber_driver_id TEXT,
  status member_status NOT NULL DEFAULT 'pending',
  joining_fee_paid BOOLEAN NOT NULL DEFAULT false,
  join_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table for role management (security best practice)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create contribution_cycles table
CREATE TABLE public.contribution_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  closes_on TIMESTAMP WITH TIME ZONE NOT NULL,
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cycle_id UUID REFERENCES public.contribution_cycles(id),
  method payment_method NOT NULL,
  base_amount DECIMAL(10,2) NOT NULL DEFAULT 150.00,
  joining_fee_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  late_fine_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  cash_fee_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  emergency_total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(10,2) NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status payment_status NOT NULL DEFAULT 'submitted',
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  proof_file_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create loans table
CREATE TABLE public.loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type loan_type NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  reason TEXT,
  repayment_plan TEXT,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status loan_status NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  outstanding_balance DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create loan_repayments table
CREATE TABLE public.loan_repayments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID REFERENCES public.loans(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  recorded_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create emergency_events table
CREATE TABLE public.emergency_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type emergency_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  amount_per_member DECIMAL(10,2) NOT NULL,
  status emergency_event_status NOT NULL DEFAULT 'active',
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create emergency_dues table
CREATE TABLE public.emergency_dues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.emergency_events(id) ON DELETE CASCADE NOT NULL,
  member_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount_due DECIMAL(10,2) NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status emergency_due_status NOT NULL DEFAULT 'unpaid',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (event_id, member_user_id)
);

-- Create audit_log table
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.member_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contribution_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_repayments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_dues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- RLS Policies for member_profiles
CREATE POLICY "Users can view their own profile"
  ON public.member_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON public.member_profiles FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can insert their own profile"
  ON public.member_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.member_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can update all profiles"
  ON public.member_profiles FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.is_admin(auth.uid()));

-- RLS Policies for contribution_cycles
CREATE POLICY "Authenticated users can view cycles"
  ON public.contribution_cycles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage cycles"
  ON public.contribution_cycles FOR ALL
  USING (public.is_admin(auth.uid()));

-- RLS Policies for payments
CREATE POLICY "Users can view their own payments"
  ON public.payments FOR SELECT
  USING (auth.uid() = member_user_id);

CREATE POLICY "Admins can view all payments"
  ON public.payments FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can insert their own payments"
  ON public.payments FOR INSERT
  WITH CHECK (auth.uid() = member_user_id);

CREATE POLICY "Admins can update payments"
  ON public.payments FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- RLS Policies for loans
CREATE POLICY "Users can view their own loans"
  ON public.loans FOR SELECT
  USING (auth.uid() = member_user_id);

CREATE POLICY "Admins can view all loans"
  ON public.loans FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can insert their own loan requests"
  ON public.loans FOR INSERT
  WITH CHECK (auth.uid() = member_user_id);

CREATE POLICY "Admins can update loans"
  ON public.loans FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- RLS Policies for loan_repayments
CREATE POLICY "Users can view repayments on their loans"
  ON public.loan_repayments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.loans 
    WHERE loans.id = loan_repayments.loan_id 
    AND loans.member_user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage repayments"
  ON public.loan_repayments FOR ALL
  USING (public.is_admin(auth.uid()));

-- RLS Policies for emergency_events
CREATE POLICY "Authenticated users can view events"
  ON public.emergency_events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage events"
  ON public.emergency_events FOR ALL
  USING (public.is_admin(auth.uid()));

-- RLS Policies for emergency_dues
CREATE POLICY "Users can view their own dues"
  ON public.emergency_dues FOR SELECT
  USING (auth.uid() = member_user_id);

CREATE POLICY "Admins can manage dues"
  ON public.emergency_dues FOR ALL
  USING (public.is_admin(auth.uid()));

-- RLS Policies for audit_log
CREATE POLICY "Admins can view audit logs"
  ON public.audit_log FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert audit logs"
  ON public.audit_log FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

-- Create function to automatically add member role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'member');
  RETURN NEW;
END;
$$;

-- Create trigger to add member role on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add updated_at triggers
CREATE TRIGGER update_member_profiles_updated_at
  BEFORE UPDATE ON public.member_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_loans_updated_at
  BEFORE UPDATE ON public.loans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_emergency_events_updated_at
  BEFORE UPDATE ON public.emergency_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_emergency_dues_updated_at
  BEFORE UPDATE ON public.emergency_dues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for payment proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false);

-- Storage policies for payment proofs
CREATE POLICY "Users can upload their own proofs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own proofs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all proofs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'payment-proofs' AND public.is_admin(auth.uid()));