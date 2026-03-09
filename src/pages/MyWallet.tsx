import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useMyWallet, useWalletTransactions, getWalletTransactionLabel, isWalletDebitTransaction } from '@/hooks/useWallet';
import { formatCurrency, formatDateTime, getJoiningFeeTotal, getJoiningFeeRemaining } from '@/lib/constants';
import { Wallet, ArrowUpRight, ArrowDownLeft, CreditCard, Fuel, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

export default function MyWallet() {
  const { user } = useAuth();
  const { data: wallet, isLoading: walletLoading } = useMyWallet(user?.id);
  const { data: transactions, isLoading: txnLoading } = useWalletTransactions({
    memberUserId: user?.id,
    limit: 30,
  });

  const [profile, setProfile] = useState<{ membership_slots: number; joining_fee_paid_total: number; joining_fee_paid: boolean } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('member_profiles')
      .select('membership_slots, joining_fee_paid_total, joining_fee_paid')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data));
  }, [user]);

  const slots = profile?.membership_slots || 1;
  const joiningFeeTotal = getJoiningFeeTotal(slots);
  const joiningFeePaid = wallet?.joining_fee_balance || profile?.joining_fee_paid_total || 0;
  const joiningFeeProgress = joiningFeeTotal > 0 ? Math.min((joiningFeePaid / joiningFeeTotal) * 100, 100) : 0;

  if (walletLoading) {
    return (
      <AppLayout>
        <PageHeader title="My Wallet" subtitle="Your financial overview" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      </AppLayout>
    );
  }

  const balanceCards = [
    {
      label: 'Contributions',
      value: wallet?.contribution_balance || 0,
      icon: ArrowUpRight,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      label: 'Petrol Loan',
      value: wallet?.petrol_loan_balance || 0,
      icon: Fuel,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      isDebt: true,
    },
    {
      label: 'Personal Loan',
      value: wallet?.personal_loan_balance || 0,
      icon: DollarSign,
      color: 'text-info',
      bgColor: 'bg-info/10',
      isDebt: true,
    },
    {
      label: 'Emergency Fund',
      value: wallet?.emergency_contributions_total || 0,
      icon: AlertTriangle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
  ];

  return (
    <AppLayout>
      <PageHeader title="My Wallet" subtitle="Your financial overview" />

      {/* Wallet Hero */}
      <Card className="mb-4 bg-primary text-primary-foreground">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-12 w-12 rounded-xl bg-primary-foreground/10 flex items-center justify-center">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <p className="text-primary-foreground/70 text-xs">Total Contributions</p>
              <p className="text-2xl font-bold">{formatCurrency((wallet?.contribution_balance || 0) + (wallet?.joining_fee_balance || 0))}</p>
            </div>
          </div>
          {(wallet?.petrol_loan_balance || 0) > 0 || (wallet?.personal_loan_balance || 0) > 0 ? (
            <div className="flex items-center gap-2 text-sm text-primary-foreground/80">
              <CreditCard className="h-4 w-4" />
              <span>Outstanding Loans: {formatCurrency((wallet?.petrol_loan_balance || 0) + (wallet?.personal_loan_balance || 0))}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-primary-foreground/80">
              <CheckCircle className="h-4 w-4" />
              <span>No outstanding loans</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Joining Fee Progress */}
      <Card className="mb-4 animate-fade-in">
        <CardContent className="p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Joining Fee</span>
            <span className="font-medium">{formatCurrency(joiningFeePaid)} / {formatCurrency(joiningFeeTotal)}</span>
          </div>
          <Progress value={joiningFeeProgress} className="h-2.5" />
          {joiningFeePaid >= joiningFeeTotal ? (
            <p className="text-xs text-success mt-1.5 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Fully paid</p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1.5">{formatCurrency(getJoiningFeeRemaining(slots, joiningFeePaid))} remaining</p>
          )}
        </CardContent>
      </Card>

      {/* Balance Cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {balanceCards.map((card) => (
          <Card key={card.label} className="animate-fade-in">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`h-8 w-8 rounded-lg ${card.bgColor} flex items-center justify-center`}>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className="text-lg font-bold">
                {card.isDebt && card.value > 0 && '-'}
                {formatCurrency(Math.abs(card.value))}
              </p>
              {card.isDebt && card.value > 0 && (
                <Badge variant="outline" className="text-[10px] mt-1 text-destructive border-destructive/30">Outstanding</Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Transaction History */}
      <Card className="animate-fade-in">
        <CardContent className="p-4">
          <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            Transaction History
          </h3>
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {txnLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex justify-between py-2.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))
            ) : transactions && transactions.length > 0 ? (
              transactions.map((txn) => {
                const isDebit = isWalletDebitTransaction(txn.transaction_type);
                return (
                  <div key={txn.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${isDebit ? 'bg-destructive/10' : 'bg-success/10'}`}>
                        {isDebit ? (
                          <ArrowDownLeft className="h-3.5 w-3.5 text-destructive" />
                        ) : (
                          <ArrowUpRight className="h-3.5 w-3.5 text-success" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-medium">{getWalletTransactionLabel(txn.transaction_type)}</p>
                        {txn.description && (
                          <p className="text-[10px] text-muted-foreground truncate max-w-[180px]">{txn.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${isDebit ? 'text-destructive' : 'text-success'}`}>
                        {isDebit ? '-' : '+'}{formatCurrency(txn.amount)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{formatDateTime(txn.created_at)}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No transactions yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
