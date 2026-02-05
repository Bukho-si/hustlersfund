import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/constants';
import { Loader2, AlertTriangle } from 'lucide-react';

interface PaymentData {
  id: string;
  member_user_id: string;
  base_amount: number;
  joining_fee_amount: number;
  late_fine_amount: number;
  cash_fee_amount: number;
  emergency_total_amount: number;
  total_amount: number;
  status?: string;
  profile: {
    full_name: string;
  } | null;
}

interface EditPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: PaymentData | null;
  onSaved: () => void;
  requireExplanation?: boolean;
}

export function EditPaymentDialog({
  open,
  onOpenChange,
  payment,
  onSaved,
  requireExplanation = false,
}: EditPaymentDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [baseAmount, setBaseAmount] = useState('');
  const [joiningFeeAmount, setJoiningFeeAmount] = useState('');
  const [lateFineAmount, setLateFineAmount] = useState('');
  const [cashFeeAmount, setCashFeeAmount] = useState('');
  const [emergencyAmount, setEmergencyAmount] = useState('');
  const [explanation, setExplanation] = useState('');

  useEffect(() => {
    if (payment) {
      setBaseAmount(String(payment.base_amount || 0));
      setJoiningFeeAmount(String(payment.joining_fee_amount || 0));
      setLateFineAmount(String(payment.late_fine_amount || 0));
      setCashFeeAmount(String(payment.cash_fee_amount || 0));
      setEmergencyAmount(String(payment.emergency_total_amount || 0));
      setExplanation('');
    }
  }, [payment]);

  const calculateTotal = () => {
    return (
      (parseFloat(baseAmount) || 0) +
      (parseFloat(joiningFeeAmount) || 0) +
      (parseFloat(lateFineAmount) || 0) +
      (parseFloat(cashFeeAmount) || 0) +
      (parseFloat(emergencyAmount) || 0)
    );
  };

  const isVerified = payment?.status === 'verified';
  const needsExplanation = requireExplanation || isVerified;

  const handleSave = async () => {
    if (!payment) return;

    if (needsExplanation && !explanation.trim()) {
      toast.error('Please provide an explanation for this edit');
      return;
    }

    setIsLoading(true);

    try {
      const newTotal = calculateTotal();

      const { error } = await supabase
        .from('payments')
        .update({
          base_amount: parseFloat(baseAmount) || 0,
          joining_fee_amount: parseFloat(joiningFeeAmount) || 0,
          late_fine_amount: parseFloat(lateFineAmount) || 0,
          cash_fee_amount: parseFloat(cashFeeAmount) || 0,
          emergency_total_amount: parseFloat(emergencyAmount) || 0,
          total_amount: newTotal,
        })
        .eq('id', payment.id);

      if (error) throw error;

      // Log to audit with explanation
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('audit_log').insert({
        actor_user_id: user?.id,
        entity_type: 'payment',
        entity_id: payment.id,
        action: isVerified ? 'verified_payment_edited' : 'payment_edited',
        metadata_json: {
          member_name: payment.profile?.full_name,
          previous_total: payment.total_amount,
          new_total: newTotal,
          explanation: explanation.trim() || null,
          previous_values: {
            base_amount: payment.base_amount,
            joining_fee_amount: payment.joining_fee_amount,
            late_fine_amount: payment.late_fine_amount,
            cash_fee_amount: payment.cash_fee_amount,
            emergency_total_amount: payment.emergency_total_amount,
          },
          new_values: {
            base_amount: parseFloat(baseAmount) || 0,
            joining_fee_amount: parseFloat(joiningFeeAmount) || 0,
            late_fine_amount: parseFloat(lateFineAmount) || 0,
            cash_fee_amount: parseFloat(cashFeeAmount) || 0,
            emergency_total_amount: parseFloat(emergencyAmount) || 0,
          },
        },
      });

      toast.success('Payment updated successfully');
      onSaved();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('Failed to update payment');
    } finally {
      setIsLoading(false);
    }
  };

  if (!payment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Payment</DialogTitle>
          <DialogDescription>
            Modify contribution amounts for {payment.profile?.full_name || 'Unknown'}
          </DialogDescription>
        </DialogHeader>

        {isVerified && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-warning/10 border border-warning/30">
            <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
            <p className="text-sm text-warning">
              This payment has already been verified. An explanation is required for any changes.
            </p>
          </div>
        )}

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="base">Weekly Subscription (R)</Label>
            <Input
              id="base"
              type="number"
              step="0.01"
              value={baseAmount}
              onChange={(e) => setBaseAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="joining">Joining Fee (R)</Label>
            <Input
              id="joining"
              type="number"
              step="0.01"
              value={joiningFeeAmount}
              onChange={(e) => setJoiningFeeAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="late">Late Fine (R)</Label>
            <Input
              id="late"
              type="number"
              step="0.01"
              value={lateFineAmount}
              onChange={(e) => setLateFineAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cash">Cash/ATM Fee (R)</Label>
            <Input
              id="cash"
              type="number"
              step="0.01"
              value={cashFeeAmount}
              onChange={(e) => setCashFeeAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="emergency">Emergency (R)</Label>
            <Input
              id="emergency"
              type="number"
              step="0.01"
              value={emergencyAmount}
              onChange={(e) => setEmergencyAmount(e.target.value)}
            />
          </div>

          <div className="rounded-md bg-muted p-3 mt-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Previous Total:</span>
              <span className="text-sm">{formatCurrency(payment.total_amount)}</span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="font-medium">New Total:</span>
              <span className="font-bold text-lg">{formatCurrency(calculateTotal())}</span>
            </div>
          </div>

          {needsExplanation && (
            <div className="space-y-2 mt-4">
              <Label htmlFor="explanation">
                Explanation for Edit <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="explanation"
                placeholder="Explain why this payment is being modified..."
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading || (needsExplanation && !explanation.trim())}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
