import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/constants';
import { format } from 'date-fns';
import {
  Users, FileCheck, AlertTriangle, Wallet, ChevronRight,
  TrendingUp, Shield, BarChart3, Calendar, Clock,
  Settings2, RefreshCw, UserPlus, UserCog
} from 'lucide-react';
import { ContributionsChart } from '@/components/reports/ContributionsChart';
import { LoanDistributionChart } from '@/components/reports/LoanDistributionChart';
import { useWeeklyContributions, useLoanDistribution } from '@/hooks/useFinancialReports';

interface Stats {
  activeMembers: number;
  pendingVerifications: number;
  weeklyContributions: number;
  totalLoanBalance: number;
  activeEmergencyEvents: number;
}

export default function SuperAdminDashboard() {
  const { data: contributionsData, isLoading: contribLoading } = useWeeklyContributions();
  const { data: loanDistData, isLoading: loanDistLoading } = useLoanDistribution();
  const [stats, setStats] = useState<Stats>({
    activeMembers: 0,
    pendingVerifications: 0,
    weeklyContributions: 0,
    totalLoanBalance: 0,
    activeEmergencyEvents: 0,
  });
  const [currentCycle, setCurrentCycle] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [members, verifications, loans, events, cycle, contributions] = await Promise.all([
        supabase.from('member_profiles').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('payments').select('*', { count: 'exact', head: true }).in('status', ['submitted', 'pending_verification']),
        supabase.from('loans').select('outstanding_balance').eq('status', 'approved'),
        supabase.from('emergency_events').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('contribution_cycles').select('*').eq('is_closed', false).order('week_start_date', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('payments').select('total_amount').eq('status', 'verified'),
      ]);

      const totalLoanBalance = loans.data?.reduce((s, l) => s + Number(l.outstanding_balance), 0) || 0;
      const weeklyContributions = contributions.data?.reduce((s, p) => s + Number(p.total_amount), 0) || 0;

      setStats({
        activeMembers: members.count || 0,
        pendingVerifications: verifications.count || 0,
        weeklyContributions,
        totalLoanBalance,
        activeEmergencyEvents: events.count || 0,
      });
      setCurrentCycle(cycle.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = [
    { label: 'Active Members', value: stats.activeMembers.toString(), icon: Users, color: 'text-success', bgColor: 'bg-success/10', href: '/admin/members' },
    { label: 'Pending Verification', value: stats.pendingVerifications.toString(), icon: FileCheck, color: 'text-warning', bgColor: 'bg-warning/10', href: '/admin/verify', urgent: stats.pendingVerifications > 0 },
    { label: 'Outstanding Loans', value: formatCurrency(stats.totalLoanBalance), icon: Wallet, color: 'text-info', bgColor: 'bg-info/10', href: '/admin/petrol-loans' },
    { label: 'Emergency Events', value: stats.activeEmergencyEvents.toString(), icon: AlertTriangle, color: 'text-destructive', bgColor: 'bg-destructive/10', href: '/admin/events' },
  ];

  return (
    <AppLayout requireAdmin>
      <PageHeader
        title="Super Admin Dashboard"
        subtitle="Full stokvel operations overview"
        action={
          <Link to="/dashboard" className="text-xs text-muted-foreground hover:text-foreground">← Member View</Link>
        }
      />

      {/* Header Card */}
      <Card className="mb-4 bg-primary text-primary-foreground">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center">
            <Shield className="h-6 w-6 text-accent-foreground" />
          </div>
          <div>
            <h2 className="font-bold text-lg">Hustlers Admin</h2>
            <p className="text-primary-foreground/70 text-sm">Super Admin Panel</p>
          </div>
        </CardContent>
      </Card>

      {/* Current Cycle */}
      {currentCycle && (
        <Card className="mb-4 animate-fade-in border-accent/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center">
                <Calendar className="h-4 w-4 text-accent-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Active Contribution Cycle</h3>
                <p className="text-xs text-muted-foreground">Members can submit payments</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Week Period</p>
                <p className="font-medium text-sm">
                  {format(new Date(currentCycle.week_start_date), 'MMM d')} – {format(new Date(currentCycle.week_end_date), 'MMM d, yyyy')}
                </p>
              </div>
              <div className="bg-warning/10 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" />Payment Deadline
                </p>
                <p className="font-medium text-sm text-warning">
                  {format(new Date(currentCycle.deadline), 'EEE, MMM d')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weekly Contributions Summary */}
      <Card className="mb-4 animate-fade-in">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-muted-foreground">Total Verified Contributions</p>
            <TrendingUp className="h-4 w-4 text-success" />
          </div>
          <p className="text-2xl font-bold">{formatCurrency(stats.weeklyContributions)}</p>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {statCards.map((stat, i) => (
          <Link key={stat.label} to={stat.href} className="block animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
            <Card className={`h-full hover:shadow-card-hover transition-shadow ${stat.urgent ? 'ring-2 ring-warning' : ''}`}>
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

      {/* Charts */}
      <Card className="mb-4 animate-fade-in">
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            Contributions Trend
          </h3>
          <ContributionsChart data={contributionsData} isLoading={contribLoading} />
        </CardContent>
      </Card>

      <Card className="mb-4 animate-fade-in">
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            Loan Distribution
          </h3>
          <LoanDistributionChart data={loanDistData} isLoading={loanDistLoading} />
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="animate-fade-in">
        <CardContent className="p-4">
          <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            Quick Actions
          </h3>
          <div className="space-y-2">
            {[
              { to: '/admin/members', icon: UserPlus, label: 'Add Member', color: 'text-success' },
              { to: '/admin/events', icon: AlertTriangle, label: 'Create Emergency Event', color: 'text-destructive' },
              { to: '/admin/roles', icon: UserCog, label: 'Manage Roles', color: 'text-info' },
              { to: '/admin/verify', icon: FileCheck, label: 'Verify Payments', color: 'text-warning', badge: stats.pendingVerifications },
              { to: '/admin/reports', icon: BarChart3, label: 'View Reports', color: 'text-primary' },
              { to: '/admin/contribution-settings', icon: Settings2, label: 'Contribution Settings', color: 'text-accent' },
              { to: '/admin/cycles', icon: RefreshCw, label: 'Manage Cycles', color: 'text-info' },
            ].map((action) => (
              <Link key={action.to} to={action.to} className="flex items-center justify-between p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                <div className="flex items-center gap-2">
                  <action.icon className={`h-4 w-4 ${action.color}`} />
                  <span className="text-sm font-medium">{action.label}</span>
                </div>
                {action.badge ? (
                  <span className="text-xs font-medium bg-warning text-warning-foreground px-2 py-0.5 rounded-full">{action.badge}</span>
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
