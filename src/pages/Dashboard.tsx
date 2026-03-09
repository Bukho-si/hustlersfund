import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InstallBanner } from '@/components/pwa/InstallBanner';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentCycle } from '@/hooks/useContributionCycles';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/constants';
import { useMyWallet } from '@/hooks/useWallet';
import { useContributionSettings, getWeeklySubscription, getJoiningFeeRemaining } from '@/hooks/useContributionSettings';
import { 
  CreditCard, 
  Wallet, 
  AlertTriangle, 
  ChevronRight, 
  TrendingUp,
  Clock,
  CheckCircle2,
  Shield,
  Users,
  Calendar,
  RefreshCw,
  Info,
  Fuel,
  DollarSign
} from 'lucide-react';
import { format } from 'date-fns';

// Joining fee only week - no subscriptions collected
const JOINING_FEE_ONLY_WEEK_START = '2026-02-02';

interface DashboardData {
  profile: {
    full_name: string;
    status: string;
    joining_fee_paid: boolean;
    membership_slots: number;
    joining_fee_paid_total: number;
  } | null;
  currentWeekPayment: {
    status: string;
    total_amount: number;
  } | null;
  totalLoansOutstanding: number;
  emergencyDuesCount: number;
  emergencyDuesTotal: number;
}

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const { settings } = useContributionSettings();
  const queryClient = useQueryClient();
  const { data: wallet } = useMyWallet(user?.id);
  const { data: currentCycle, refetch: refetchCycle } = useCurrentCycle();
  const [data, setData] = useState<DashboardData>({
    profile: null,
    currentWeekPayment: null,
    totalLoansOutstanding: 0,
    emergencyDuesCount: 0,
    emergencyDuesTotal: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isJoiningFeeOnlyWeek, setIsJoiningFeeOnlyWeek] = useState(false);
  const [isDeadlinePassed, setIsDeadlinePassed] = useState(false);

  // Auto-refresh when deadline is reached
  useEffect(() => {
    if (!currentCycle?.deadline) return;

    const deadlineTime = new Date(currentCycle.deadline).getTime();
    const now = Date.now();
    const timeUntilDeadline = deadlineTime - now;

    // If deadline hasn't passed yet, set a timer to refresh when it does
    if (timeUntilDeadline > 0) {
      const timer = setTimeout(() => {
        refetchCycle();
        queryClient.invalidateQueries({ queryKey: ['current-contribution-cycle'] });
      }, timeUntilDeadline + 1000); // Add 1 second buffer

      return () => clearTimeout(timer);
    }
    
    // Deadline has passed
    setIsDeadlinePassed(true);
  }, [currentCycle?.deadline, refetchCycle, queryClient]);

  // Update joining fee only week flag when cycle changes
  useEffect(() => {
    if (currentCycle) {
      setIsJoiningFeeOnlyWeek(currentCycle.week_start_date === JOINING_FEE_ONLY_WEEK_START);
    }
  }, [currentCycle]);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      fetchDashboardData(currentCycle?.id);
    };
    
    loadData();
  }, [user, currentCycle?.id]);

  // Realtime subscriptions: auto-refresh when payments, loans, or emergency dues change
  useEffect(() => {
    if (!user) return;

    const refreshData = () => fetchDashboardData(currentCycle?.id);

    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'payments',
        filter: `member_user_id=eq.${user.id}`,
      }, refreshData)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'loans',
        filter: `member_user_id=eq.${user.id}`,
      }, refreshData)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'emergency_dues',
        filter: `member_user_id=eq.${user.id}`,
      }, refreshData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, currentCycle?.id]);

  const fetchDashboardData = async (cycleId?: string) => {
    if (!user) return;

    try {
      // Fetch profile
      const { data: profile } = await supabase
        .from('member_profiles')
        .select('full_name, status, joining_fee_paid, membership_slots, joining_fee_paid_total')
        .eq('user_id', user.id)
        .maybeSingle();

      // Fetch current cycle payment (verified = paid for this week)
      let currentWeekPayment = null;
      if (cycleId) {
        // First try to find payment with matching cycle_id
        const { data: cyclePayments } = await supabase
          .from('payments')
          .select('status, total_amount')
          .eq('member_user_id', user.id)
          .eq('cycle_id', cycleId)
          .order('submitted_at', { ascending: false })
          .limit(1);
        
        currentWeekPayment = cyclePayments?.[0] || null;
        
        // If no payment with cycle_id, check for recent payments without cycle_id 
        // that were submitted during this cycle's period
        if (!currentWeekPayment && currentCycle?.week_start_date) {
          const { data: recentPayments } = await supabase
            .from('payments')
            .select('status, total_amount, submitted_at')
            .eq('member_user_id', user.id)
            .is('cycle_id', null)
            .gte('submitted_at', currentCycle.week_start_date)
            .order('submitted_at', { ascending: false })
            .limit(1);
          currentWeekPayment = recentPayments?.[0] || null;
        }
      } else {
        // Fallback to most recent payment if no cycle
        const { data: payments } = await supabase
          .from('payments')
          .select('status, total_amount')
          .eq('member_user_id', user.id)
          .order('submitted_at', { ascending: false })
          .limit(1);
        currentWeekPayment = payments?.[0] || null;
      }

      // Fetch outstanding loans
      const { data: loans } = await supabase
        .from('loans')
        .select('outstanding_balance')
        .eq('member_user_id', user.id)
        .in('status', ['approved', 'disbursed']);

      const totalLoansOutstanding = loans?.reduce((sum, loan) => sum + Number(loan.outstanding_balance), 0) || 0;

      // Fetch emergency dues
      const { data: emergencyDues } = await supabase
        .from('emergency_dues')
        .select('amount_due, amount_paid')
        .eq('member_user_id', user.id)
        .eq('status', 'unpaid');

      const emergencyDuesCount = emergencyDues?.length || 0;
      const emergencyDuesTotal = emergencyDues?.reduce((sum, due) => sum + (Number(due.amount_due) - Number(due.amount_paid)), 0) || 0;

      setData({
        profile,
        currentWeekPayment,
        totalLoansOutstanding,
        emergencyDuesCount,
        emergencyDuesTotal,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate this week's dues with slot multipliers
  const calculateWeeklyDues = () => {
    const slots = data.profile?.membership_slots || 1;
    // During joining fee only week, no subscription is collected
    const weeklyAmount = isJoiningFeeOnlyWeek ? 0 : getWeeklySubscription(slots, settings);
    const joiningFeeRemaining = data.profile 
      ? getJoiningFeeRemaining(slots, data.profile.joining_fee_paid_total, settings)
      : 0;

    let total = weeklyAmount;
    const breakdown: { label: string; amount: number; detail?: string }[] = [];
    
    // Weekly subscription with slot breakdown (only if not joining fee only week)
    if (!isJoiningFeeOnlyWeek) {
      if (slots > 1) {
        breakdown.push({ 
          label: 'Weekly subscription', 
          amount: weeklyAmount,
          detail: `R${settings.weekly_subscription_amount} × ${slots}`
        });
      } else {
        breakdown.push({ label: 'Weekly subscription', amount: weeklyAmount });
      }
    }

    // Joining fee if not fully paid
    if (joiningFeeRemaining > 0) {
      total += joiningFeeRemaining;
      if (slots > 1) {
        breakdown.push({ 
          label: 'Joining fee (remaining)', 
          amount: joiningFeeRemaining,
          detail: `R${settings.joining_fee_amount} × ${slots} total`
        });
      } else {
        breakdown.push({ label: 'Joining fee (once-off)', amount: joiningFeeRemaining });
      }
    }

    // Emergency dues (no slot multiplier)
    if (data.emergencyDuesTotal > 0) {
      total += data.emergencyDuesTotal;
      breakdown.push({ label: `Emergency dues (${data.emergencyDuesCount})`, amount: data.emergencyDuesTotal });
    }

    return { total, breakdown };
  };

  const weeklyDues = calculateWeeklyDues();
  const firstName = data.profile?.full_name?.split(' ')[0] || 'Hustler';
  const slots = data.profile?.membership_slots || 1;
  const isPaid = data.currentWeekPayment?.status === 'verified';

  return (
    <AppLayout>
      {/* Welcome Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-foreground">
            Hey, {firstName}! 👋
          </h1>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => {
                // Clear caches and hard reload
                if ('caches' in window) {
                  caches.keys().then(names => {
                    names.forEach(name => caches.delete(name));
                  });
                }
                refetchCycle();
                window.location.reload();
              }}
              title="Hard refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            {isAdmin && (
              <Link to="/admin">
                <Button variant="outline" size="sm" className="gap-1">
                  <Shield className="h-4 w-4" />
                  Admin
                </Button>
              </Link>
            )}
          </div>
        </div>
        <p className="text-muted-foreground text-sm">
          {data.profile?.status === 'active' 
            ? "You're all caught up. Keep hustling!"
            : "Complete your profile to get started"}
        </p>
      </div>

      {/* Install Banner */}
      <InstallBanner />

      {/* Status Card */}
      {data.profile && (
        <Card className="mb-4 bg-primary text-primary-foreground animate-fade-in">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-foreground/70 text-xs mb-1">Member Status</p>
                <div className="flex items-center gap-2">
                  <StatusBadge status={data.profile.status} variant="member" />
                  {slots > 1 && (
                    <Badge variant="outline" className="text-xs border-primary-foreground/30 text-primary-foreground">
                      <Users className="h-3 w-3 mr-1" />
                      {slots} slots
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-right">
                {isPaid ? (
                  <>
                    <p className="text-primary-foreground/70 text-xs mb-1">This Week</p>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-5 w-5" style={{ color: '#86efac' }} />
                      <p className="text-2xl font-bold">Paid</p>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-primary-foreground/70 text-xs mb-1">This Week's Dues</p>
                    <p className="text-2xl font-bold">{formatCurrency(weeklyDues.total)}</p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wallet Balance Widget */}
      {wallet && (
        <Link to="/wallet" className="block mb-4 animate-fade-in">
          <Card className="hover:shadow-card-hover transition-shadow border-accent/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Wallet className="h-4 w-4 text-accent" />
                  </div>
                  <span className="text-sm font-medium">My Wallet</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">Contributions</p>
                  <p className="text-sm font-bold text-success">{formatCurrency(wallet.contribution_balance + wallet.joining_fee_balance)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5 flex items-center gap-0.5"><Fuel className="h-2.5 w-2.5" />Petrol Loan</p>
                  <p className={`text-sm font-bold ${wallet.petrol_loan_balance > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {wallet.petrol_loan_balance > 0 ? `-${formatCurrency(wallet.petrol_loan_balance)}` : formatCurrency(0)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5 flex items-center gap-0.5"><DollarSign className="h-2.5 w-2.5" />Personal</p>
                  <p className={`text-sm font-bold ${wallet.personal_loan_balance > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {wallet.personal_loan_balance > 0 ? `-${formatCurrency(wallet.personal_loan_balance)}` : formatCurrency(0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      {currentCycle && !isPaid && (
        <Card className="mb-4 animate-fade-in border-accent/30" style={{ animationDelay: '0.05s' }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-lg bg-accent/20 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm">Week {format(new Date(currentCycle.week_start_date), 'MMM d')} – {format(new Date(currentCycle.week_end_date), 'd')}</h3>
                <p className="text-xs text-muted-foreground">Contribution cycle open</p>
              </div>
            </div>
            {isDeadlinePassed ? (
              <div className="bg-destructive/10 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium text-destructive">Deadline passed</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-destructive">
                    {format(new Date(currentCycle.deadline), 'EEE, MMM d')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    at {format(new Date(currentCycle.deadline), 'HH:mm')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-warning/10 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-warning" />
                  <span className="text-sm font-medium">Payment deadline</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-warning">
                    {format(new Date(currentCycle.deadline), 'EEE, MMM d')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    by {format(new Date(currentCycle.deadline), 'HH:mm')}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Weekly Dues - show paid card when verified, otherwise show breakdown */}
      {isPaid ? (
        <Card className="mb-4 animate-fade-in border-success/30" style={{ animationDelay: '0.1s' }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="font-semibold text-success">Week's Dues Paid</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(data.currentWeekPayment!.total_amount)} verified
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              This Week's Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isJoiningFeeOnlyWeek && (
              <Alert className="mb-4 border-info/30 bg-info/10">
                <Info className="h-4 w-4 text-info" />
                <AlertDescription className="text-sm">
                  <strong>Joining Fees Only This Week</strong> — Weekly subscriptions start next week.
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              {weeklyDues.breakdown.map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">{item.label}</span>
                    {item.detail && (
                      <span className="text-xs text-muted-foreground/70">{item.detail}</span>
                    )}
                  </div>
                  <span className="font-medium">{formatCurrency(item.amount)}</span>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between text-sm font-semibold">
                <span>Total Due</span>
                <span className="text-accent">{formatCurrency(weeklyDues.total)}</span>
              </div>
            </div>
            
            {data.currentWeekPayment ? (
              <div className="mt-4 p-3 rounded-lg flex items-center justify-between bg-muted">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Payment submitted</span>
                </div>
                <StatusBadge status={data.currentWeekPayment.status} variant="payment" />
              </div>
            ) : (
              <Link to="/payments/submit" className="block mt-4">
                <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold h-12">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Submit Payment
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Loans Card */}
        <Link to="/loans" className="block animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <Card className="h-full hover:shadow-card-hover transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Wallet className="h-5 w-5 text-info" />
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mb-1">Loan Balance</p>
              <p className="text-lg font-bold">{formatCurrency(data.totalLoansOutstanding)}</p>
            </CardContent>
          </Card>
        </Link>

        {/* Emergency Card */}
        <Link to="/emergencies" className="block animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <Card className="h-full hover:shadow-card-hover transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mb-1">Emergency Dues</p>
              <p className="text-lg font-bold">
                {data.emergencyDuesCount > 0 
                  ? formatCurrency(data.emergencyDuesTotal)
                  : 'None'}
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Payment History Preview */}
      <Card className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Recent Activity
            </CardTitle>
            <Link to="/payments" className="text-xs text-accent font-medium">
              View all
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {data.currentWeekPayment ? (
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium">Weekly Payment</p>
                <p className="text-xs text-muted-foreground">Just submitted</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{formatCurrency(data.currentWeekPayment.total_amount)}</p>
                <StatusBadge status={data.currentWeekPayment.status} variant="payment" />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No recent activity
            </p>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
