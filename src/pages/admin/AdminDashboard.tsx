import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/constants';
import { format } from 'date-fns';
import { 
  Users, 
  FileCheck, 
  AlertTriangle, 
  Wallet,
  ChevronRight,
  TrendingUp,
  Shield,
  BarChart3,
  Calendar,
  Clock,
  Settings2
} from 'lucide-react';

interface ContributionCycle {
  id: string;
  week_start_date: string;
  week_end_date: string;
  deadline: string;
  closes_on: string;
  is_closed: boolean;
}

interface AdminStats {
  activeMembers: number;
  pendingVerifications: number;
  latePaymentsThisWeek: number;
  outstandingEmergencyDues: number;
  totalLoanBalance: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats>({
    activeMembers: 0,
    pendingVerifications: 0,
    latePaymentsThisWeek: 0,
    outstandingEmergencyDues: 0,
    totalLoanBalance: 0,
  });
  const [currentCycle, setCurrentCycle] = useState<ContributionCycle | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchCurrentCycle();
  }, []);

  const fetchCurrentCycle = async () => {
    try {
      const { data, error } = await supabase
        .from('contribution_cycles')
        .select('*')
        .eq('is_closed', false)
        .order('week_start_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setCurrentCycle(data);
    } catch (error) {
      console.error('Error fetching current cycle:', error);
    }
  };

  const fetchStats = async () => {
    try {
      // Active members count
      const { count: activeMembers } = await supabase
        .from('member_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Pending verifications
      const { count: pendingVerifications } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .in('status', ['submitted', 'pending_verification']);

      // Outstanding loans
      const { data: loans } = await supabase
        .from('loans')
        .select('outstanding_balance')
        .eq('status', 'approved');

      const totalLoanBalance = loans?.reduce((sum, loan) => sum + Number(loan.outstanding_balance), 0) || 0;

      // Outstanding emergency dues
      const { data: emergencyDues } = await supabase
        .from('emergency_dues')
        .select('amount_due, amount_paid')
        .eq('status', 'unpaid');

      const outstandingEmergencyDues = emergencyDues?.reduce(
        (sum, due) => sum + (Number(due.amount_due) - Number(due.amount_paid)), 
        0
      ) || 0;

      setStats({
        activeMembers: activeMembers || 0,
        pendingVerifications: pendingVerifications || 0,
        latePaymentsThisWeek: 0, // Would need cycle data
        outstandingEmergencyDues,
        totalLoanBalance,
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = [
    {
      label: 'Active Members',
      value: stats.activeMembers.toString(),
      icon: Users,
      color: 'text-success',
      bgColor: 'bg-success/10',
      href: '/admin/members',
    },
    {
      label: 'Pending Verification',
      value: stats.pendingVerifications.toString(),
      icon: FileCheck,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      href: '/admin/verify',
      urgent: stats.pendingVerifications > 0,
    },
    {
      label: 'Outstanding Loans',
      value: formatCurrency(stats.totalLoanBalance),
      icon: Wallet,
      color: 'text-info',
      bgColor: 'bg-info/10',
      href: '/admin/loans',
    },
    {
      label: 'Emergency Dues',
      value: formatCurrency(stats.outstandingEmergencyDues),
      icon: AlertTriangle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      href: '/admin/events',
    },
  ];

  return (
    <AppLayout requireAdmin>
      <PageHeader 
        title="Admin Dashboard" 
        subtitle="Manage stokvel operations"
        action={
          <Link to="/dashboard" className="text-xs text-muted-foreground hover:text-foreground">
            ← Member View
          </Link>
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
            <p className="text-primary-foreground/70 text-sm">Full management access</p>
          </div>
        </CardContent>
      </Card>

      {/* Current Contribution Cycle Card */}
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
                  <Clock className="h-3 w-3" />
                  Payment Deadline
                </p>
                <p className="font-medium text-sm text-warning">
                  {format(new Date(currentCycle.deadline), 'EEE, MMM d')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(currentCycle.deadline), 'HH:mm')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {statCards.map((stat, index) => (
          <Link 
            key={stat.label} 
            to={stat.href}
            className="block animate-fade-in"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
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

      {/* Contribution Settings Card - Prominent */}
      <Card className="animate-fade-in mb-4 border-primary/30 bg-primary/5" style={{ animationDelay: '0.2s' }}>
        <CardContent className="p-4">
          <Link 
            to="/admin/contribution-settings" 
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
                <Settings2 className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Edit Contribution Amounts</h3>
                <p className="text-xs text-muted-foreground">Manage fees, loan caps & emergency amounts</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Link>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="animate-fade-in" style={{ animationDelay: '0.25s' }}>
        <CardContent className="p-4">
          <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            Quick Actions
          </h3>
          <div className="space-y-2">
            <Link 
              to="/admin/verify" 
              className="flex items-center justify-between p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium">Verify Payments</span>
              </div>
              {stats.pendingVerifications > 0 && (
                <span className="text-xs font-medium bg-warning text-warning-foreground px-2 py-0.5 rounded-full">
                  {stats.pendingVerifications}
                </span>
              )}
            </Link>
            <Link 
              to="/admin/loans" 
              className="flex items-center justify-between p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-info" />
                <span className="text-sm font-medium">Manage Loans</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link 
              to="/admin/events" 
              className="flex items-center justify-between p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium">Emergency Events</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link 
              to="/admin/reports" 
              className="flex items-center justify-between p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Financial Reports</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
