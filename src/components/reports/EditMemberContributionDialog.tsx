import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
import type { MemberBalance } from '@/hooks/useFinancialReports';
import { Loader2 } from 'lucide-react';

interface EditMemberContributionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: MemberBalance | null;
}

export function EditMemberContributionDialog({
  open,
  onOpenChange,
  member,
}: EditMemberContributionDialogProps) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentNotes, setAdjustmentNotes] = useState('');

  const handleSave = async () => {
    if (!member || !adjustmentAmount) {
      toast.error('Please enter an adjustment amount');
      return;
    }

    const amount = parseFloat(adjustmentAmount);
    if (isNaN(amount)) {
      toast.error('Invalid amount');
      return;
    }

    setIsLoading(true);

    try {
      // Get member's user_id from profile
      const { data: profile } = await supabase
        .from('member_profiles')
        .select('user_id')
        .eq('id', member.id)
        .single();

      if (!profile) {
        throw new Error('Member profile not found');
      }

      // Create an adjustment payment record
      const { error } = await supabase.from('payments').insert({
        member_user_id: profile.user_id,
        method: 'eft',
        total_amount: amount,
        base_amount: amount,
        status: 'verified',
        notes: `Admin adjustment: ${adjustmentNotes || 'No notes provided'}`,
        verified_at: new Date().toISOString(),
      });

      if (error) throw error;

      // Log to audit
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('audit_log').insert({
        actor_user_id: user?.id,
        entity_type: 'payment',
        entity_id: profile.user_id,
        action: 'contribution_adjustment',
        metadata_json: {
          member_name: member.fullName,
          adjustment_amount: amount,
          notes: adjustmentNotes,
          previous_total: member.totalContributions,
          new_total: member.totalContributions + amount,
        },
      });

      toast.success(`Contribution adjusted by ${formatCurrency(amount)}`);
      queryClient.invalidateQueries({ queryKey: ['member-balances'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
      queryClient.invalidateQueries({ queryKey: ['payments-ledger'] });
      
      setAdjustmentAmount('');
      setAdjustmentNotes('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error adjusting contribution:', error);
      toast.error('Failed to adjust contribution');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setAdjustmentAmount('');
    setAdjustmentNotes('');
    onOpenChange(false);
  };

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Contribution</DialogTitle>
          <DialogDescription>
            Adjust {member.fullName}'s contribution total. Use negative values to reduce.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Current Total:</span>
              <p className="font-medium text-success">
                {formatCurrency(member.totalContributions)}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Outstanding Loans:</span>
              <p className="font-medium text-info">
                {formatCurrency(member.outstandingLoans)}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adjustment">Adjustment Amount (R)</Label>
            <Input
              id="adjustment"
              type="number"
              step="0.01"
              placeholder="e.g., 150 or -50"
              value={adjustmentAmount}
              onChange={(e) => setAdjustmentAmount(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Positive to add, negative to deduct
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Reason for Adjustment</Label>
            <Textarea
              id="notes"
              placeholder="e.g., Correction for missed payment, refund, etc."
              value={adjustmentNotes}
              onChange={(e) => setAdjustmentNotes(e.target.value)}
              rows={3}
            />
          </div>

          {adjustmentAmount && !isNaN(parseFloat(adjustmentAmount)) && (
            <div className="rounded-md bg-muted p-3">
              <p className="text-sm">
                <span className="text-muted-foreground">New Total: </span>
                <span className="font-medium">
                  {formatCurrency(member.totalContributions + parseFloat(adjustmentAmount))}
                </span>
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading || !adjustmentAmount}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Adjustment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
