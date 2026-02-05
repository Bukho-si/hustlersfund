import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatDate } from '@/lib/constants';
import { EditPaymentDialog } from './EditPaymentDialog';
import { PaymentHistoryDialog } from './PaymentHistoryDialog';
import { Pencil, CheckCircle2, Building2, Banknote, Loader2, History } from 'lucide-react';

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
  verified_at: string | null;
  status: string;
  notes: string | null;
  profile: {
    full_name: string;
    membership_slots: number;
    joining_fee_paid_total: number;
  } | null;
}

export function VerifiedPaymentsList() {
  const [payments, setPayments] = useState<PaymentWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentWithProfile | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyPayment, setHistoryPayment] = useState<PaymentWithProfile | null>(null);

  useEffect(() => {
    fetchVerifiedPayments();
  }, []);

  const fetchVerifiedPayments = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('status', 'verified')
      .order('verified_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching verified payments:', error);
    } else {
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

  const getMethodIcon = (method: string) => {
    return method === 'eft' ? (
      <Building2 className="h-4 w-4 text-info" />
    ) : (
      <Banknote className="h-4 w-4 text-warning" />
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            Verified Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            Verified Payments (Recent 50)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No verified payments yet
            </p>
          ) : (
            <div className="space-y-2">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getMethodIcon(payment.method)}
                    <div>
                      <p className="font-medium text-sm">
                        {payment.profile?.full_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Verified: {payment.verified_at ? formatDate(payment.verified_at) : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">
                      {formatCurrency(Number(payment.total_amount))}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setHistoryPayment(payment);
                        setHistoryDialogOpen(true);
                      }}
                      title="View edit history"
                    >
                      <History className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingPayment(payment);
                        setEditDialogOpen(true);
                      }}
                      title="Edit payment"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <EditPaymentDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        payment={editingPayment}
        onSaved={fetchVerifiedPayments}
        requireExplanation
      />

      <PaymentHistoryDialog
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
        paymentId={historyPayment?.id || null}
        memberName={historyPayment?.profile?.full_name}
      />
    </>
  );
}
