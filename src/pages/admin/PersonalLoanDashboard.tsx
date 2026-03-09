import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/constants';
import { format } from 'date-fns';
import {
  DollarSign, ChevronRight, Wallet, FileCheck, BarChart3,
  Clock, CheckCircle, TrendingUp, Banknote, Settings
} from 'lucide-react';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import { usePersonalFund } from '@/hooks/usePersonalFund';
import { PersonalFundLowBanner } from '@/components/personal-loans/PersonalFundBanner';
import { AddFundsDialog } from '@/components/funds/AddFundsDialog';

interface Stats {
  loansIssuedToday: number;
  totalBalance: number;
  pendingRequests: number;
  repaymentsToday: number;
  repaymentAmountToday: number;
}

export default function PersonalLoanDashboard() {
  const [stats, setStats] = useState<Stats>({
    loansIssuedToday: 0, totalBalance: 0, pendingRequests: 0, repaymentsToday: 0, repaymentAmountToday: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const { fund, isLowBalance } = usePersonalFund();

  const stableFetch = useCallback(() => { fetchStats(); }, []);
  useEffect(() => { fetchStats(); }, []);
  useRealtimeRefresh(['loans', 'loan_repayments'], stableFetch);

  const fetchStats = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const [approved, pending, repayments] = await Promise.all([
        supabase.from('loans').select('outstanding_balance, approved_at').eq('type', 'personal').in('status', ['approved', 'disbursed']),
        supabase.from('loans').select('*', { count: 'exact', head: true }).eq('type', 'personal').in('status', ['pending', 'requested']),
        supabase.from('loan_repayments').select('amount, paid_at, loan_id'),
      ]);

      const approvedLoans = approved.data || [];
      const totalBalance = approvedLoans.reduce((s, l) => s + Number(l.outstanding_balance), 0);
      const issuedToday = approvedLoans.filter(l => l.approved_at && l.approved_at.startsWith(today)).length;
      const allRepayments = repayments.data || [];
      const todayRepayments = allRepayments.filter(r => r.paid_at.startsWith(today));

      setStats({
        loansIssuedToday: issuedToday,
        totalBalance,
        pendingRequests: pending.count || 0,
        repaymentsToday: todayRepayments.length,
        repaymentAmountToday: todayRepayments.reduce((s, r) => s + Number(r.amount), 0),
      });
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = [
    { label: 'Personal Loan Fund', value: formatCurrency(fund?.current_balance ?? 0), icon: Banknote, color: 'text-accent', bgColor: 'bg-accent/10', href: '/admin/settings', span: true },
    { label: 'Pending Requests', value: stats.pendingRequests.toString(), icon: Clock, color: 'text-warning', bgColor: 'bg-warning/10', href: '/admin/personal-loans', urgent: stats.pendingRequests > 0 },
    { label: 'Issued Today', value: stats.loansIssuedToday.toString(), icon: CheckCircle, color: 'text-success', bgColor: 'bg-success/10', href: '/admin/personal-loans' },
    { label: 'Repayments Today', value: formatCurrency(stats.repaymentAmountToday), icon: TrendingUp, color: 'text-primary', bgColor: 'bg-primary/10', href: '/admin/personal-loans' },
    { label: 'Total Outstanding', value: formatCurrency(stats.totalBalance), icon: Wallet, color: 'text-info', bgColor: 'bg-info/10', href: '/admin/personal-loans' },
  ];

  return (
    <AppLayout requireAdmin>
      <PageHeader
        title="Personal Loan Dashboard"
        subtitle="Manage personal loan operations"
        action={<Link to="/dashboard" className="text-xs text-muted-foreground hover:text-foreground">← Member View</Link>}
      />

      <Card className="mb-4 bg-primary text-primary-foreground">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center">
            <DollarSign className="h-6 w-6 text-accent-foreground" />
          </div>
          <div>
            <h2 className="font-bold text-lg">Personal Loan Admin</h2>
            <p className="text-primary-foreground/70 text-sm">Personal Loan Operations</p>
          </div>
        </CardContent>
      </Card>

      {fund && isLowBalance && (
        <PersonalFundLowBanner balance={fund.current_balance} threshold={fund.low_balance_threshold} />
      )}

      <div className="grid grid-cols-2 gap-4 mb-4">
        {statCards.map((stat, i) => (
          <Link key={stat.label} to={stat.href} className={`block animate-fade-in ${(stat as any).span ? 'col-span-2' : ''}`} style={{ animationDelay: `${i * 0.05}s` }}>
            <Card className={`h-full hover:shadow-card-hover transition-shadow ${(stat as any).urgent ? 'ring-2 ring-warning' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={`h-8 w-8 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground mb-0.5">{stat.label}</p>
                <p className="text-lg font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="animate-fade-in">
        <CardContent className="p-4">
          <h3 className="font-medium text-sm mb-3">Quick Actions</h3>
          <div className="space-y-2">
            {[
              { to: '/admin/personal-loans', icon: FileCheck, label: 'Approve Personal Loans', color: 'text-success' },
              { to: '/admin/personal-loans', icon: Wallet, label: 'Record Repayments', color: 'text-info' },
              { to: '/admin/personal-loan-reports', icon: BarChart3, label: 'View Personal Loan Reports', color: 'text-primary' },
              { to: '/admin/settings', icon: Settings, label: 'Fund Settings', color: 'text-accent' },
            ].map((a) => (
              <Link key={a.label} to={a.to} className="flex items-center justify-between p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                <div className="flex items-center gap-2">
                  <a.icon className={`h-4 w-4 ${a.color}`} />
                  <span className="text-sm font-medium">{a.label}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
