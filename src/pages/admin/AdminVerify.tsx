import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDate, getJoiningFeeTotal } from '@/lib/constants';
import { EditPaymentDialog } from '@/components/admin/EditPaymentDialog';
import { 
  FileCheck, 
  Building2, 
  Banknote, 
  CheckCircle2, 
  XCircle, 
  Eye,
  Loader2,
  Download,
  Pencil
} from 'lucide-react';

interface PaymentWithProfile {
  id: string;
  member_user_id: string;
  method: string;
  base_amount: number;
  joining_fee_amount: number;
  late_fine_amount: number;
  cash_fee_amount: number;
  emergency_total_amount: number;
  total_amount: number;
  submitted_at: string;
  status: string;
  proof_file_url: string | null;
  notes: string | null;
  profile: {
    full_name: string;
    membership_slots: number;
    joining_fee_paid_total: number;
  } | null;
}

export default function AdminVerify() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = useState<PaymentWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<PaymentWithProfile | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentWithProfile | null>(null);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .in('status', ['submitted', 'pending_verification'])
      .order('submitted_at', { ascending: true });

    if (error) {
      console.error('Error fetching payments:', error);
    } else {
      // Fetch profiles separately with slots info
      const paymentsWithProfiles = await Promise.all(
        (data || []).map(async (payment) => {
          const { data: profile } = await supabase
            .from('member_profiles')
            .select('full_name, membership_slots, joining_fee_paid_total')
            .eq('user_id', payment.member_user_id)
            .maybeSingle();
          return { ...payment, profile };
        })
      );
      setPayments(paymentsWithProfiles as PaymentWithProfile[]);
    }
    setIsLoading(false);
  };

  const handleVerify = async (paymentId: string) => {
    if (!user) return;
    setProcessingId(paymentId);

    try {
      const payment = payments.find(p => p.id === paymentId);
      if (!payment) throw new Error('Payment not found');

      const { error } = await supabase
        .from('payments')
        .update({
          status: 'verified',
          verified_by: user.id,
          verified_at: new Date().toISOString(),
        })
        .eq('id', paymentId);

      if (error) throw error;

      // Update joining fee paid total if this payment includes joining fee
      if (payment && Number(payment.joining_fee_amount) > 0 && payment.profile) {
        const slots = payment.profile.membership_slots || 1;
        const currentPaidTotal = payment.profile.joining_fee_paid_total || 0;
        const newPaidTotal = currentPaidTotal + Number(payment.joining_fee_amount);
        const joiningFeeTotal = getJoiningFeeTotal(slots);
        
        await supabase
          .from('member_profiles')
          .update({ 
            joining_fee_paid_total: newPaidTotal,
            joining_fee_paid: newPaidTotal >= joiningFeeTotal 
          })
          .eq('user_id', payment.member_user_id);
      }

      toast({
        title: 'Payment verified',
        description: 'The payment has been marked as verified',
      });

      fetchPayments();
    } catch (error: any) {
      toast({
        title: 'Verification failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (paymentId: string) => {
    if (!user || !rejectReason.trim()) {
      toast({
        title: 'Reason required',
        description: 'Please provide a rejection reason',
        variant: 'destructive',
      });
      return;
    }

    setProcessingId(paymentId);

    try {
      const { error } = await supabase
        .from('payments')
        .update({
          status: 'rejected',
          verified_by: user.id,
          verified_at: new Date().toISOString(),
          rejection_reason: rejectReason.trim(),
        })
        .eq('id', paymentId);

      if (error) throw error;

      toast({
        title: 'Payment rejected',
        description: 'The member will be notified',
      });

      setRejectReason('');
      setSelectedPayment(null);
      fetchPayments();
    } catch (error: any) {
      toast({
        title: 'Rejection failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getMethodIcon = (method: string) => {
    return method === 'eft' ? (
      <Building2 className="h-4 w-4 text-info" />
    ) : (
      <Banknote className="h-4 w-4 text-warning" />
    );
  };

  return (
    <AppLayout requireAdmin>
      <PageHeader 
        title="Verify Payments" 
        subtitle={`${payments.length} pending verification`}
        showBack 
      />

      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-32 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : payments.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileCheck className="h-12 w-12 text-success mx-auto mb-4" />
              <h3 className="font-semibold mb-2">All caught up!</h3>
              <p className="text-sm text-muted-foreground">
                No payments pending verification
              </p>
            </CardContent>
          </Card>
        ) : (
          payments.map((payment, index) => (
            <Card 
              key={payment.id}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getMethodIcon(payment.method)}
                    <div>
                      <p className="font-medium">{payment.profile?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(payment.submitted_at)}
                      </p>
                    </div>
                  </div>
                  <p className="text-lg font-bold">{formatCurrency(Number(payment.total_amount))}</p>
                </div>

                {/* Breakdown */}
                <div className="space-y-1 text-xs text-muted-foreground mb-3">
                  <div className="flex justify-between">
                    <span>Weekly</span>
                    <span>{formatCurrency(Number(payment.base_amount))}</span>
                  </div>
                  {Number(payment.joining_fee_amount) > 0 && (
                    <div className="flex justify-between text-accent">
                      <span>Joining fee</span>
                      <span>{formatCurrency(Number(payment.joining_fee_amount))}</span>
                    </div>
                  )}
                  {Number(payment.cash_fee_amount) > 0 && (
                    <div className="flex justify-between">
                      <span>Cash/ATM fee</span>
                      <span>{formatCurrency(Number(payment.cash_fee_amount))}</span>
                    </div>
                  )}
                  {Number(payment.emergency_total_amount) > 0 && (
                    <div className="flex justify-between text-warning">
                      <span>Emergency</span>
                      <span>{formatCurrency(Number(payment.emergency_total_amount))}</span>
                    </div>
                  )}
                </div>

                {payment.notes && (
                  <p className="text-xs text-muted-foreground mb-3 italic">"{payment.notes}"</p>
                )}

                {/* Proof and Actions */}
                <div className="flex items-center gap-2">
                  {payment.proof_file_url && (
                    <a
                      href={payment.proof_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-info hover:underline"
                    >
                      <Eye className="h-3 w-3" />
                      View Proof
                    </a>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingPayment(payment);
                      setEditDialogOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  
                  <div className="flex-1" />
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={() => setSelectedPayment(payment)}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Reject Payment</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <Textarea
                          placeholder="Reason for rejection..."
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          rows={3}
                        />
                        <Button
                          variant="destructive"
                          className="w-full"
                          onClick={() => payment && handleReject(payment.id)}
                          disabled={processingId === payment.id}
                        >
                          {processingId === payment.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Confirm Rejection'
                          )}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button 
                    size="sm"
                    className="bg-success text-success-foreground hover:bg-success/90"
                    onClick={() => handleVerify(payment.id)}
                    disabled={processingId === payment.id}
                  >
                    {processingId === payment.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Verify
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <EditPaymentDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        payment={editingPayment}
        onSaved={fetchPayments}
      />
    </AppLayout>
  );
}