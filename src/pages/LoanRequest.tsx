import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, getPetrolLoanMax, getPersonalLoanMax, PETROL_LOAN_MAX, PERSONAL_LOAN_MAX } from '@/lib/constants';
import { Fuel, User, Loader2, AlertCircle, Users, Clock } from 'lucide-react';
import { InterestCalculator } from '@/components/loans/InterestCalculator';
import { useLoanSettings } from '@/hooks/useLoanSettings';
import { usePetrolRequestWindow } from '@/hooks/usePetrolFund';

export default function LoanRequest() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const { getInterestRate, isLoading: settingsLoading } = useLoanSettings();
  const { window: requestWindow, isWithinWindow } = usePetrolRequestWindow();
  
  const [type, setType] = useState<'petrol' | 'personal'>('petrol');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [repaymentPlan, setRepaymentPlan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [membershipSlots, setMembershipSlots] = useState(1);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  
  const petrolWindowOpen = type === 'petrol' ? isWithinWindow() : true;

  useEffect(() => {
    if (user) {
      fetchMembershipSlots();
    }
  }, [user]);

  const fetchMembershipSlots = async () => {
    if (!user) return;
    
    const { data: profile } = await supabase
      .from('member_profiles')
      .select('membership_slots')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profile) {
      setMembershipSlots(profile.membership_slots || 1);
    }
    setIsLoadingProfile(false);
  };

  const maxPetrolLoan = getPetrolLoanMax(membershipSlots);
  const maxPersonalLoan = getPersonalLoanMax(membershipSlots);
  const maxAmount = type === 'petrol' ? maxPetrolLoan : maxPersonalLoan;
  const interestRate = getInterestRate(type);
  const amountNum = parseFloat(amount) || 0;
  const isValidAmount = amountNum > 0 && amountNum <= maxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    if (!isValidAmount) {
      toast({
        title: 'Invalid amount',
        description: `Maximum ${type} loan is ${formatCurrency(maxAmount)}`,
        variant: 'destructive',
      });
      return;
    }

    if (!reason.trim()) {
      toast({
        title: 'Reason required',
        description: 'Please provide a reason for your loan request',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const interestAmount = amountNum * (interestRate / 100);
      const totalRepayable = amountNum + interestAmount;
      const repaymentPeriod = type === 'petrol' ? 'WEEKLY' : 'MONTHLY';

      const { error } = await supabase
        .from('loans')
        .insert({
          member_user_id: user.id,
          type: type,
          amount: amountNum,
          reason: reason.trim(),
          repayment_plan: repaymentPlan.trim() || null,
          status: type === 'petrol' ? 'requested' : 'pending',
          outstanding_balance: totalRepayable,
          interest_rate_percent: interestRate,
          interest_amount: interestAmount,
          total_repayable: totalRepayable,
          repayment_period: repaymentPeriod,
        });

      if (error) throw error;

      toast({
        title: 'Loan request submitted!',
        description: 'An admin will review your request',
      });

      navigate('/loans');
    } catch (error: any) {
      console.error('Error submitting loan:', error);
      toast({
        title: 'Submission failed',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader title="Request Loan" showBack />

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Loan Type */}
        <Card>
          <CardContent className="p-4">
            <Label className="text-sm font-medium mb-3 block">Loan Type</Label>
            <RadioGroup 
              value={type} 
              onValueChange={(v) => setType(v as 'petrol' | 'personal')}
              className="space-y-3"
            >
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-input hover:border-accent transition-colors">
                <RadioGroupItem value="petrol" id="petrol" />
                <Label htmlFor="petrol" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Fuel className="h-5 w-5 text-warning" />
                  <div>
                    <p className="font-medium">Petrol Loan</p>
                    <p className="text-xs text-muted-foreground">
                      Max {formatCurrency(maxPetrolLoan)} per week
                      {membershipSlots > 1 && (
                        <span className="ml-1 text-accent">({membershipSlots} slots)</span>
                      )}
                    </p>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-input hover:border-accent transition-colors">
                <RadioGroupItem value="personal" id="personal" />
                <Label htmlFor="personal" className="flex items-center gap-2 cursor-pointer flex-1">
                  <User className="h-5 w-5 text-info" />
                  <div>
                    <p className="font-medium">Personal Loan</p>
                    <p className="text-xs text-muted-foreground">
                      Max {formatCurrency(maxPersonalLoan)} per month
                      {membershipSlots > 1 && (
                        <span className="ml-1 text-accent">({membershipSlots} slots)</span>
                      )}
                    </p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Slot-based limits info */}
        {membershipSlots > 1 && (
          <Card className="border-accent/30 bg-accent/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-accent" />
                <span className="font-medium">Your loan limits ({membershipSlots} slots):</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>
                  <span className="block font-medium text-foreground">Petrol:</span>
                  R{PETROL_LOAN_MAX} × {membershipSlots} = {formatCurrency(maxPetrolLoan)}
                </div>
                <div>
                  <span className="block font-medium text-foreground">Personal:</span>
                  R{PERSONAL_LOAN_MAX} × {membershipSlots} = {formatCurrency(maxPersonalLoan)}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Amount */}
        <Card>
          <CardContent className="p-4">
            <Label htmlFor="amount" className="text-sm font-medium mb-3 block">
              Amount (ZAR)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">R</span>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-8 h-12 text-lg"
                min="1"
                max={maxAmount}
                step="0.01"
                required
              />
            </div>
            {amountNum > maxAmount && (
              <div className="flex items-center gap-1 mt-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>Maximum {type} loan is {formatCurrency(maxAmount)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Interest Calculator */}
        {amountNum > 0 && !settingsLoading && (
          <InterestCalculator
            amount={amountNum}
            interestRatePercent={interestRate}
            loanType={type}
          />
        )}

        {/* Reason */}
        <Card>
          <CardContent className="p-4">
            <Label htmlFor="reason" className="text-sm font-medium mb-3 block">
              Reason for Loan
            </Label>
            <Textarea
              id="reason"
              placeholder="Why do you need this loan?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={3}
              required
            />
          </CardContent>
        </Card>

        {/* Repayment Plan */}
        <Card>
          <CardContent className="p-4">
            <Label htmlFor="repayment" className="text-sm font-medium mb-3 block">
              Repayment Plan (optional)
            </Label>
            <Textarea
              id="repayment"
              placeholder="How do you plan to repay this loan?"
              value={repaymentPlan}
              onChange={(e) => setRepaymentPlan(e.target.value)}
              maxLength={500}
              rows={2}
            />
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button 
          type="submit" 
          className="w-full h-12 bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"
          disabled={isSubmitting || !isValidAmount || isLoadingProfile}
        >
          {isSubmitting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            `Request ${formatCurrency(amountNum)} Loan`
          )}
        </Button>
      </form>
    </AppLayout>
  );
}