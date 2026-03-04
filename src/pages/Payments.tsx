import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatDate } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { Plus, CreditCard, Building2, Banknote, XCircle, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Payment {
  id: string;
  method: string;
  base_amount: number;
  joining_fee_amount: number;
  late_fine_amount: number;
  cash_fee_amount: number;
  emergency_total_amount: number;
  total_amount: number;
  submitted_at: string;
  status: string;
  notes: string | null;
}

export default function Payments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchPayments();
    }
  }, [user]);

  const fetchPayments = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('member_user_id', user.id)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Error fetching payments:', error);
    } else {
      setPayments(data || []);
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

  const handleWithdraw = async (paymentId: string) => {
    setWithdrawingId(paymentId);
    try {
      const { error } = await supabase
        .from('payments')
        .update({ status: 'withdrawn' as any })
        .eq('id', paymentId)
        .eq('member_user_id', user!.id);

      if (error) throw error;

      toast({ title: 'Payment withdrawn', description: 'You can now submit a new payment.' });
      fetchPayments();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Could not withdraw payment', variant: 'destructive' });
    } finally {
      setWithdrawingId(null);
    }
  };

  return (
    <AppLayout>
      <PageHeader 
        title="Payments" 
        subtitle="Your payment history"
        action={
          <Link to="/payments/submit">
            <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 gap-1">
              <Plus className="h-4 w-4" />
              Pay Now
            </Button>
          </Link>
        }
      />

      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-16 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : payments.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No payments yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Submit your first weekly contribution to get started
              </p>
              <Link to="/payments/submit">
                <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                  Submit Payment
                </Button>
              </Link>
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
                      <p className="font-medium text-sm">
                        {payment.method === 'eft' ? 'EFT / Bank Transfer' : 'Cash / ATM Deposit'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(payment.submitted_at)}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={payment.status} variant="payment" />
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Weekly subscription</span>
                    <span>{formatCurrency(Number(payment.base_amount))}</span>
                  </div>
                  {Number(payment.joining_fee_amount) > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Joining fee</span>
                      <span>{formatCurrency(Number(payment.joining_fee_amount))}</span>
                    </div>
                  )}
                  {Number(payment.late_fine_amount) > 0 && (
                    <div className="flex justify-between text-destructive">
                      <span>Late fine</span>
                      <span>{formatCurrency(Number(payment.late_fine_amount))}</span>
                    </div>
                  )}
                  {Number(payment.cash_fee_amount) > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Cash/ATM fee</span>
                      <span>{formatCurrency(Number(payment.cash_fee_amount))}</span>
                    </div>
                  )}
                  {Number(payment.emergency_total_amount) > 0 && (
                    <div className="flex justify-between text-warning">
                      <span>Emergency dues</span>
                      <span>{formatCurrency(Number(payment.emergency_total_amount))}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold pt-2 border-t">
                    <span>Total</span>
                    <span>{formatCurrency(Number(payment.total_amount))}</span>
                  </div>
                </div>

                {payment.notes && (
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    "{payment.notes}"
                  </p>
                )}

                {payment.status === 'submitted' && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-3 text-destructive border-destructive/30 hover:bg-destructive/10 gap-2"
                        disabled={withdrawingId === payment.id}
                      >
                        {withdrawingId === payment.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        Withdraw Payment
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Withdraw this payment?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will cancel your submitted payment of {formatCurrency(Number(payment.total_amount))}. You'll be able to submit a new payment afterwards.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep Payment</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleWithdraw(payment.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Yes, Withdraw
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </AppLayout>
  );
}
