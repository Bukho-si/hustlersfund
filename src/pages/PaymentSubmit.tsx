import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, getWeeklySubscription, getJoiningFeeRemaining, WEEKLY_SUBSCRIPTION, JOINING_FEE, CASH_ATM_FEE } from '@/lib/constants';
import { Upload, Building2, Banknote, Loader2, CheckCircle2, Info } from 'lucide-react';

// First week of stokvel operations - joining fees only
const JOINING_FEE_ONLY_WEEK_START = '2026-02-02';

export default function PaymentSubmit() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const paymentType = searchParams.get('type');
  const loanAmount = parseFloat(searchParams.get('amount') || '0');
  const isLoanRepayment = paymentType === 'loan_repayment' && loanAmount > 0;

  const [method, setMethod] = useState<'eft' | 'cash_atm'>('eft');
  const [notes, setNotes] = useState(isLoanRepayment ? 'Loan repayment' : '');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [membershipSlots, setMembershipSlots] = useState(1);
  const [joiningFeePaidTotal, setJoiningFeePaidTotal] = useState(0);
  const [emergencyDuesTotal, setEmergencyDuesTotal] = useState(0);
  const [isJoiningFeeOnlyWeek, setIsJoiningFeeOnlyWeek] = useState(false);
  const [currentCycleId, setCurrentCycleId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      checkProfileAndDues();
      checkCurrentCycle();
    }
  }, [user]);

  const checkCurrentCycle = async () => {
    const { data: cycle } = await supabase
      .from('contribution_cycles')
      .select('id, week_start_date')
      .eq('is_closed', false)
      .order('week_start_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cycle) {
      setCurrentCycleId(cycle.id);
      // Check if this is the first week (joining fees only)
      setIsJoiningFeeOnlyWeek(cycle.week_start_date === JOINING_FEE_ONLY_WEEK_START);
    }
  };

  const checkProfileAndDues = async () => {
    if (!user) return;

    // Check profile for slots and joining fee
    const { data: profile } = await supabase
      .from('member_profiles')
      .select('membership_slots, joining_fee_paid_total')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profile) {
      setMembershipSlots(profile.membership_slots || 1);
      setJoiningFeePaidTotal(profile.joining_fee_paid_total || 0);
    }

    // Get emergency dues
    const { data: dues } = await supabase
      .from('emergency_dues')
      .select('amount_due, amount_paid')
      .eq('member_user_id', user.id)
      .eq('status', 'unpaid');

    const total = dues?.reduce((sum, due) => sum + (Number(due.amount_due) - Number(due.amount_paid)), 0) || 0;
    setEmergencyDuesTotal(total);
  };

  // Calculate totals
  const cashFeeAmount = method === 'cash_atm' ? CASH_ATM_FEE : 0;

  let baseAmount: number;
  let joiningFeeAmount: number;
  let totalAmount: number;

  if (isLoanRepayment) {
    baseAmount = loanAmount;
    joiningFeeAmount = 0;
    totalAmount = loanAmount + cashFeeAmount;
  } else {
    baseAmount = isJoiningFeeOnlyWeek ? 0 : getWeeklySubscription(membershipSlots);
    joiningFeeAmount = getJoiningFeeRemaining(membershipSlots, joiningFeePaidTotal);
    totalAmount = baseAmount + joiningFeeAmount + cashFeeAmount + emergencyDuesTotal;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload a JPG, PNG, or PDF file',
          variant: 'destructive',
        });
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please upload a file smaller than 5MB',
          variant: 'destructive',
        });
        return;
      }
      setProofFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    if (!proofFile) {
      toast({
        title: 'Proof required',
        description: 'Please upload proof of payment',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload proof file
      const fileExt = proofFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(fileName, proofFile);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(fileName);

      // Create payment record with cycle_id
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          member_user_id: user.id,
          method: method,
          cycle_id: currentCycleId,
          base_amount: baseAmount,
          joining_fee_amount: joiningFeeAmount,
          late_fine_amount: 0,
          cash_fee_amount: cashFeeAmount,
          emergency_total_amount: emergencyDuesTotal,
          total_amount: totalAmount,
          proof_file_url: publicUrl,
          notes: notes || null,
          status: 'submitted',
        });

      if (paymentError) {
        throw paymentError;
      }

      toast({
        title: 'Payment submitted!',
        description: 'Your payment is pending verification',
      });

      navigate('/payments');
    } catch (error: any) {
      console.error('Error submitting payment:', error);
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
      <PageHeader title={isLoanRepayment ? "Submit Loan Repayment" : "Submit Payment"} showBack />

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Payment Method */}
        <Card>
          <CardContent className="p-4">
            <Label className="text-sm font-medium mb-3 block">Payment Method</Label>
            <RadioGroup 
              value={method} 
              onValueChange={(v) => setMethod(v as 'eft' | 'cash_atm')}
              className="space-y-3"
            >
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-input hover:border-accent transition-colors">
                <RadioGroupItem value="eft" id="eft" />
                <Label htmlFor="eft" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Building2 className="h-5 w-5 text-info" />
                  <div>
                    <p className="font-medium">EFT / Bank Transfer</p>
                    <p className="text-xs text-muted-foreground">No additional fees</p>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-input hover:border-accent transition-colors">
                <RadioGroupItem value="cash_atm" id="cash_atm" />
                <Label htmlFor="cash_atm" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Banknote className="h-5 w-5 text-warning" />
                  <div>
                    <p className="font-medium">Cash / ATM Deposit</p>
                    <p className="text-xs text-muted-foreground">+R10 processing fee</p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Amount Breakdown */}
        <Card>
          <CardContent className="p-4">
            <Label className="text-sm font-medium mb-3 block">Amount Breakdown</Label>
            
            {isLoanRepayment ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Loan repayment</span>
                  <span>{formatCurrency(loanAmount)}</span>
                </div>
                {method === 'cash_atm' && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Cash/ATM processing fee</span>
                    <span>{formatCurrency(cashFeeAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-3 border-t">
                  <span>Total</span>
                  <span className="text-accent">{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            ) : (
              <>
                {/* Joining Fee Only Week Notice */}
                {isJoiningFeeOnlyWeek && (
                  <div className="flex items-start gap-2 p-3 bg-info/10 rounded-lg mb-3 text-info">
                    <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium">Joining Fees Only This Week</p>
                      <p className="text-info/80 text-xs">Weekly subscriptions start from next week.</p>
                    </div>
                  </div>
                )}

                <div className="space-y-2 text-sm">
                  {!isJoiningFeeOnlyWeek && (
                    <div className="flex justify-between">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Weekly subscription</span>
                        {membershipSlots > 1 && (
                          <span className="text-xs text-muted-foreground/70">R{WEEKLY_SUBSCRIPTION} × {membershipSlots} slots</span>
                        )}
                      </div>
                      <span>{formatCurrency(baseAmount)}</span>
                    </div>
                  )}
                  {joiningFeeAmount > 0 && (
                    <div className="flex justify-between text-accent">
                      <div className="flex flex-col">
                        <span>Joining fee {isJoiningFeeOnlyWeek ? '' : '(remaining)'}</span>
                        {membershipSlots > 1 && (
                          <span className="text-xs text-accent/70">R{JOINING_FEE} × {membershipSlots} total</span>
                        )}
                      </div>
                      <span>{formatCurrency(joiningFeeAmount)}</span>
                    </div>
                  )}
                  {joiningFeeAmount === 0 && isJoiningFeeOnlyWeek && (
                    <div className="flex justify-between text-success">
                      <span>Joining fee</span>
                      <span>Paid ✓</span>
                    </div>
                  )}
                  {method === 'cash_atm' && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Cash/ATM processing fee</span>
                      <span>{formatCurrency(cashFeeAmount)}</span>
                    </div>
                  )}
                  {emergencyDuesTotal > 0 && (
                    <div className="flex justify-between text-warning">
                      <span>Emergency dues</span>
                      <span>{formatCurrency(emergencyDuesTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg pt-3 border-t">
                    <span>Total</span>
                    <span className="text-accent">{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Proof Upload */}
        <Card>
          <CardContent className="p-4">
            <Label className="text-sm font-medium mb-3 block">Proof of Payment</Label>
            <div 
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                proofFile ? 'border-success bg-success/5' : 'border-input hover:border-accent'
              }`}
            >
              {proofFile ? (
                <div className="flex items-center justify-center gap-2 text-success">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">{proofFile.name}</span>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-1">
                    Upload screenshot or PDF
                  </p>
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG or PDF (max 5MB)
                  </p>
                </>
              )}
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                style={{ position: 'relative' }}
              />
            </div>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleFileChange}
              className="mt-2 w-full text-sm"
            />
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardContent className="p-4">
            <Label htmlFor="notes" className="text-sm font-medium mb-3 block">
              Notes (optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button 
          type="submit" 
          className="w-full h-12 bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            `Submit Payment (${formatCurrency(totalAmount)})`
          )}
        </Button>
      </form>
    </AppLayout>
  );
}