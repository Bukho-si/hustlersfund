import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/constants';
import { Loader2, Trash2, Eye, History } from 'lucide-react';
import { PaymentHistoryDialog } from './PaymentHistoryDialog';

interface Payment {
  id: string;
  total_amount: number;
  base_amount: number;
  joining_fee_amount: number;
  late_fine_amount: number;
  cash_fee_amount: number;
  emergency_total_amount: number;
  status: string;
  submitted_at: string;
  verified_at: string | null;
  proof_file_url: string | null;
  notes: string | null;
}

interface MemberPaymentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberUserId: string | null;
  memberName: string | null;
  onPaymentDeleted?: () => void;
}

export function MemberPaymentsDialog({
  open,
  onOpenChange,
  memberUserId,
  memberName,
  onPaymentDeleted,
}: MemberPaymentsDialogProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingPayment, setDeletingPayment] = useState<Payment | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [historyPaymentId, setHistoryPaymentId] = useState<string | null>(null);

  useEffect(() => {
    if (open && memberUserId) {
      fetchPayments();
    }
  }, [open, memberUserId]);

  const fetchPayments = async () => {
    if (!memberUserId) return;
    setIsLoading(true);

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('member_user_id', memberUserId)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to load payments');
    } else {
      setPayments(data || []);
    }
    setIsLoading(false);
  };

  const handleDeletePayment = async () => {
    if (!deletingPayment || !deleteReason.trim()) {
      toast.error('Please provide a reason for deleting this payment');
      return;
    }

    setIsDeleting(true);

    try {
      // First, log the deletion to audit
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from('audit_log').insert({
        actor_user_id: user?.id,
        entity_type: 'payment',
        entity_id: deletingPayment.id,
        action: 'payment_deleted',
        metadata_json: {
          member_name: memberName,
          deleted_payment: {
            total_amount: deletingPayment.total_amount,
            base_amount: deletingPayment.base_amount,
            joining_fee_amount: deletingPayment.joining_fee_amount,
            late_fine_amount: deletingPayment.late_fine_amount,
            cash_fee_amount: deletingPayment.cash_fee_amount,
            emergency_total_amount: deletingPayment.emergency_total_amount,
            status: deletingPayment.status,
            submitted_at: deletingPayment.submitted_at,
            verified_at: deletingPayment.verified_at,
          },
          reason: deleteReason.trim(),
        },
      });

      // If this was a verified payment with joining fee, we need to update the member's joining_fee_paid_total
      if (deletingPayment.status === 'verified' && deletingPayment.joining_fee_amount > 0) {
        const { data: profile } = await supabase
          .from('member_profiles')
          .select('joining_fee_paid_total, membership_slots')
          .eq('user_id', memberUserId!)
          .single();

        if (profile) {
          const newTotal = Math.max(0, (profile.joining_fee_paid_total || 0) - deletingPayment.joining_fee_amount);
          const requiredTotal = (profile.membership_slots || 1) * 200;
          
          await supabase
            .from('member_profiles')
            .update({
              joining_fee_paid_total: newTotal,
              joining_fee_paid: newTotal >= requiredTotal,
            })
            .eq('user_id', memberUserId!);
        }
      }

      // Delete the payment
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', deletingPayment.id);

      if (error) throw error;

      toast.success('Payment deleted successfully');
      setDeletingPayment(null);
      setDeleteReason('');
      fetchPayments();
      onPaymentDeleted?.();
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast.error('Failed to delete payment');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-success/20 text-success">Verified</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'submitted':
      case 'pending_verification':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!memberUserId) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>All Payments for {memberName}</DialogTitle>
            <DialogDescription>
              View and manage all payment records for this member
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : payments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No payments found for this member
            </p>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="border rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-lg">
                        {formatCurrency(payment.total_amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Submitted: {formatDate(payment.submitted_at)}
                      </p>
                      {payment.verified_at && (
                        <p className="text-xs text-muted-foreground">
                          Verified: {formatDate(payment.verified_at)}
                        </p>
                      )}
                    </div>
                    {getStatusBadge(payment.status)}
                  </div>

                  <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                    {payment.base_amount > 0 && (
                      <span>Weekly: {formatCurrency(payment.base_amount)}</span>
                    )}
                    {payment.joining_fee_amount > 0 && (
                      <span className="text-accent">
                        Joining: {formatCurrency(payment.joining_fee_amount)}
                      </span>
                    )}
                    {payment.late_fine_amount > 0 && (
                      <span>Late fine: {formatCurrency(payment.late_fine_amount)}</span>
                    )}
                    {payment.cash_fee_amount > 0 && (
                      <span>Cash fee: {formatCurrency(payment.cash_fee_amount)}</span>
                    )}
                    {payment.emergency_total_amount > 0 && (
                      <span className="text-warning">
                        Emergency: {formatCurrency(payment.emergency_total_amount)}
                      </span>
                    )}
                  </div>

                  {payment.notes && (
                    <p className="text-xs italic text-muted-foreground">
                      "{payment.notes}"
                    </p>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    {payment.proof_file_url && (
                      <a
                        href={payment.proof_file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-info hover:underline"
                      >
                        <Eye className="h-3 w-3" />
                        Proof
                      </a>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => setHistoryPaymentId(payment.id)}
                    >
                      <History className="h-3 w-3 mr-1" />
                      History
                    </Button>
                    <div className="flex-1" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeletingPayment(payment)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingPayment} onOpenChange={(open) => !open && setDeletingPayment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to permanently delete this{' '}
              <strong>{deletingPayment?.status === 'verified' ? 'verified' : ''}</strong> payment of{' '}
              <strong>{formatCurrency(deletingPayment?.total_amount || 0)}</strong>.
              {deletingPayment?.status === 'verified' && deletingPayment?.joining_fee_amount > 0 && (
                <span className="block mt-2 text-warning">
                  This will also reduce the member's joining fee paid total by{' '}
                  {formatCurrency(deletingPayment.joining_fee_amount)}.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="delete-reason">
              Reason for deletion <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="delete-reason"
              placeholder="Explain why this payment is being deleted (e.g., duplicate entry, test payment, etc.)"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              rows={3}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePayment}
              disabled={isDeleting || !deleteReason.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PaymentHistoryDialog
        open={!!historyPaymentId}
        onOpenChange={(open) => !open && setHistoryPaymentId(null)}
        paymentId={historyPaymentId}
        memberName={memberName || undefined}
      />
    </>
  );
}
