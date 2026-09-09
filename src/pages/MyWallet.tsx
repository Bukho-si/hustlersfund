import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { useMyWallet, useWalletTransactions, getWalletTransactionLabel, isWalletDebitTransaction } from '@/hooks/useWallet';
import { formatCurrency, formatDateTime } from '@/lib/constants';
import { useContributionSettings, getJoiningFeeTotal, getJoiningFeeRemaining } from '@/hooks/useContributionSettings';
import { ArrowUpRight, ArrowDownLeft, Fuel, DollarSign, AlertTriangle, CheckCircle, PiggyBank, TrendingDown, Wallet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

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

  const { data: activeLoans } = useQuery({
    queryKey: ['my-active-loans', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('loans')
        .select('id, type, amount, outstanding_balance, interest_amount, total_repayable, status')
        .eq('member_user_id', user.id)
        .in('status', ['approved', 'disbursed']);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  const petrolLoans = activeLoans?.filter(l => l.type === 'petrol') || [];
  const personalLoans = activeLoans?.filter(l => l.type === 'personal') || [];

  const petrolLoanTotal = petrolLoans.reduce((sum, l) => sum + Number(l.outstanding_balance), 0);
  const personalLoanTotal = personalLoans.reduce((sum, l) => sum + Number(l.outstanding_balance), 0);
  const totalLoansOwed = petrolLoanTotal + personalLoanTotal;

  const slots = profile?.membership_slots || 1;
  const joiningFeeTotal = getJoiningFeeTotal(slots);
  const joiningFeePaid = wallet?.joining_fee_balance || profile?.joining_fee_paid_total || 0;
  const joiningFeeProgress = joiningFeeTotal > 0 ? Math.min((joiningFeePaid / joiningFeeTotal) * 100, 100) : 0;

  const totalContributions = (wallet?.contribution_balance || 0) + (wallet?.joining_fee_balance || 0);

  if (walletLoading) {
    return (
      <AppLayout>
        <PageHeader title="My Wallet" subtitle="Your financial overview" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-20 w-full rounded-xl" /></CardContent></Card>
          ))}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader title="My Wallet" subtitle="Your financial overview" />

      {/* Total Contributions - Hero Card */}
      <Card className="mb-4 bg-primary text-primary-foreground animate-fade-in overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-accent/10 -translate-y-8 translate-x-8" />
        <CardContent className="p-5 relative">
          <div className="flex items-center gap-3.5 mb-1">
            <div className="fintech-icon-box bg-primary-foreground/10">
              <PiggyBank className="h-5 w-5" />
            </div>
            <div>
              <p className="text-primary-foreground/60 text-xs font-medium">Total Contributions</p>
              <p className="text-2xl font-bold tracking-tight">{formatCurrency(totalContributions)}</p>
            </div>
          </div>
          <p className="text-primary-foreground/40 text-[11px] mt-2">Your member savings — not affected by loans</p>
        </CardContent>
      </Card>

      {/* Joining Fee Progress */}
      <Card className="mb-4 animate-fade-in" style={{ animationDelay: '0.05s' }}>
        <CardContent className="p-5">
          <div className="flex justify-between text-sm mb-2.5">
            <span className="text-muted-foreground font-medium">Joining Fee</span>
            <span className="font-semibold">{formatCurrency(joiningFeePaid)} / {formatCurrency(joiningFeeTotal)}</span>
          </div>
          <Progress value={joiningFeeProgress} className="h-2.5" />
          {joiningFeePaid >= joiningFeeTotal ? (
            <p className="text-xs text-success mt-2 flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5" /> Fully paid</p>
          ) : (
            <p className="text-xs text-muted-foreground mt-2">{formatCurrency(getJoiningFeeRemaining(slots, joiningFeePaid))} remaining</p>
          )}
        </CardContent>
      </Card>

      {/* Loans Owed */}
      <Card className="mb-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="fintech-icon-box-sm bg-destructive/10">
              <TrendingDown className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Loans Owed</p>
              <p className="text-lg font-bold">{totalLoansOwed > 0 ? formatCurrency(totalLoansOwed) : 'R0.00'}</p>
            </div>
          </div>

          {totalLoansOwed > 0 ? (
            <div className="space-y-2.5">
              <Separator className="bg-border/50" />
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2.5">
                  <Fuel className="h-4 w-4 text-warning" />
                  <span className="text-sm">Petrol Loan</span>
                </div>
                <span className="text-sm font-semibold">
                  {petrolLoanTotal > 0 ? formatCurrency(petrolLoanTotal) : 'R0.00'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2.5">
                  <DollarSign className="h-4 w-4 text-info" />
                  <span className="text-sm">Personal Loan</span>
                </div>
                <span className="text-sm font-semibold">
                  {personalLoanTotal > 0 ? formatCurrency(personalLoanTotal) : 'R0.00'}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-success" />
              <span>No outstanding loans</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Emergency Contributions */}
      <Card className="mb-4 animate-fade-in" style={{ animationDelay: '0.15s' }}>
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="fintech-icon-box-sm bg-warning/10">
              <AlertTriangle className="h-4 w-4 text-warning" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Emergency Contributions</p>
              <p className="text-lg font-bold">{formatCurrency(wallet?.emergency_contributions_total || 0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <CardContent className="p-5">
          <div className="fintech-section-header">
            <div className="fintech-icon-box-sm bg-muted">
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-sm">Transaction History</h3>
          </div>
          <div className="space-y-0.5 max-h-[400px] overflow-y-auto">
            {txnLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex justify-between py-3">
                  <Skeleton className="h-4 w-32 rounded" />
                  <Skeleton className="h-4 w-16 rounded" />
                </div>
              ))
            ) : transactions && transactions.length > 0 ? (
              transactions.map((txn) => {
                const isDebit = isWalletDebitTransaction(txn.transaction_type);
                return (
                  <div key={txn.id} className="flex items-center justify-between py-3 border-b border-border/30 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`fintech-icon-box-sm ${isDebit ? 'bg-destructive/8' : 'bg-success/8'}`}>
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
