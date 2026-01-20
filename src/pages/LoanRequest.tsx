import { useState } from 'react';
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
import { formatCurrency, PETROL_LOAN_MAX, PERSONAL_LOAN_MAX } from '@/lib/constants';
import { Fuel, User, Loader2, AlertCircle } from 'lucide-react';

export default function LoanRequest() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [type, setType] = useState<'petrol' | 'personal'>('petrol');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [repaymentPlan, setRepaymentPlan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const maxAmount = type === 'petrol' ? PETROL_LOAN_MAX : PERSONAL_LOAN_MAX;
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
      const { error } = await supabase
        .from('loans')
        .insert({
          member_user_id: user.id,
          type: type,
          amount: amountNum,
          reason: reason.trim(),
          repayment_plan: repaymentPlan.trim() || null,
          status: 'pending',
          outstanding_balance: amountNum,
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
                    <p className="text-xs text-muted-foreground">Max {formatCurrency(PETROL_LOAN_MAX)} per week</p>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-input hover:border-accent transition-colors">
                <RadioGroupItem value="personal" id="personal" />
                <Label htmlFor="personal" className="flex items-center gap-2 cursor-pointer flex-1">
                  <User className="h-5 w-5 text-info" />
                  <div>
                    <p className="font-medium">Personal Loan</p>
                    <p className="text-xs text-muted-foreground">Max {formatCurrency(PERSONAL_LOAN_MAX)} per month</p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

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
          disabled={isSubmitting || !isValidAmount}
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
