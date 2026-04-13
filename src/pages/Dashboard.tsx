import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { InstallBanner } from '@/components/pwa/InstallBanner';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentCycle } from '@/hooks/useContributionCycles';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/constants';
import { useContributionSettings, getWeeklySubscription, getJoiningFeeRemaining } from '@/hooks/useContributionSettings';
import {
  CreditCard,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Shield,
  Users,
  Calendar,
  RefreshCw,
  Info,
  ArrowRight,
} from 'lucide-react';
import { format } from 'date-fns';

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
  emergencyDuesCount: number;
  emergencyDuesTotal: number;
}

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const { settings } = useContributionSettings();
  const queryClient = useQueryClient();
  const { data: currentCycle, refetch: refetchCycle } = useCurrentCycle();
  const [data, setData] = useState<DashboardData>({
    profile: null,
    currentWeekPayment: null,
    emergencyDuesCount: 0,
    emergencyDuesTotal: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isJoiningFeeOnlyWeek, setIsJoiningFeeOnlyWeek] = useState(false);
  const [isDeadlinePassed, setIsDeadlinePassed] = useState(false);

  useEffect(() => {
    if (!currentCycle?.deadline) return;
    const deadlineTime = new Date(currentCycle.deadline).getTime();
    const now = Date.now();
    const timeUntilDeadline = deadlineTime - now;
    if (timeUntilDeadline > 0) {
      const timer = setTimeout(() => {
        refetchCycle();
        queryClient.invalidateQueries({ queryKey: ['current-contribution-cycle'] });
      }, timeUntilDeadline + 1000);
      return () => clearTimeout(timer);
    }
    setIsDeadlinePassed(true);
  }, [currentCycle?.deadline, refetchCycle, queryClient]);

  useEffect(() => {
    if (currentCycle) {
      setIsJoiningFeeOnlyWeek(currentCycle.week_start_date === JOINING_FEE_ONLY_WEEK_START);
    }
  }, [currentCycle]);

  useEffect(() => {
    if (!user) return;
    fetchDashboardData(currentCycle?.id);
  }, [user, currentCycle?.id]);

  useEffect(() => {
    if (!user) return;
    const refreshData = () => fetchDashboardData(currentCycle?.id);
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments', filter: `member_user_id=eq.${user.id}` }, refreshData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_dues', filter: `member_user_id=eq.${user.id}` }, refreshData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, currentCycle?.id]);

  const fetchDashboardData = async (cycleId?: string) => {
    if (!user) return;
    try {
      const { data: profile } = await supabase
        .from('member_profiles')
        .select('full_name, status, joining_fee_paid, membership_slots, joining_fee_paid_total')
        .eq('user_id', user.id)
        .maybeSingle();

      let currentWeekPayment = null;
      if (cycleId) {
        const { data: cyclePayments } = await supabase
          .from('payments')
          .select('status, total_amount')
          .eq('member_user_id', user.id)
          .eq('cycle_id', cycleId)
          .order('submitted_at', { ascending: false })
          .limit(1);
        currentWeekPayment = cyclePayments?.[0] || null;
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
        const { data: payments } = await supabase
          .from('payments')
          .select('status, total_amount')
          .eq('member_user_id', user.id)
          .order('submitted_at', { ascending: false })
          .limit(1);
        currentWeekPayment = payments?.[0] || null;
      }

      const emergencyDuesCount = 0;
      const emergencyDuesTotal = 0;

      setData({ profile, currentWeekPayment, emergencyDuesCount, emergencyDuesTotal });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateWeeklyDues = () => {
    const slots = data.profile?.membership_slots || 1;
    const weeklyAmount = isJoiningFeeOnlyWeek ? 0 : getWeeklySubscription(slots, settings);
    const joiningFeeRemaining = data.profile
      ? getJoiningFeeRemaining(slots, data.profile.joining_fee_paid_total, settings)
      : 0;

    let total = weeklyAmount;
    const breakdown: { label: string; amount: number; detail?: string }[] = [];

    if (!isJoiningFeeOnlyWeek) {
      if (slots > 1) {
        breakdown.push({ label: 'Weekly subscription', amount: weeklyAmount, detail: `R${settings.weekly_subscription_amount} × ${slots}` });
      } else {
        breakdown.push({ label: 'Weekly subscription', amount: weeklyAmount });
      }
    }

    if (joiningFeeRemaining > 0) {
      total += joiningFeeRemaining;
      if (slots > 1) {
        breakdown.push({ label: 'Joining fee (remaining)', amount: joiningFeeRemaining, detail: `R${settings.joining_fee_amount} × ${slots} total` });
      } else {
        breakdown.push({ label: 'Joining fee (once-off)', amount: joiningFeeRemaining });
      }
    }

    return { total, breakdown };
  };

  const weeklyDues = calculateWeeklyDues();
  const firstName = data.profile?.full_name?.split(' ')[0] || 'Hustler';
  const slots = data.profile?.membership_slots || 1;
  const isPaid = data.currentWeekPayment?.status === 'verified';
  const initials = data.profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <AppLayout>
      {/* Header */}
      <div className="mb-6 animate-fade-in">
        <div className="flex items-center gap-3.5">
          <Avatar className="h-13 w-13 border-2 border-accent/20 shadow-sm">
            <AvatarFallback className="bg-accent/10 text-accent font-bold text-sm">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-foreground tracking-tight">Hey, {firstName} 👋</h1>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-xl"
                  onClick={() => {
                    if ('caches' in window) {
                      caches.keys().then(names => { names.forEach(name => caches.delete(name)); });
                    }
                    refetchCycle();
                    window.location.reload();
                  }}
                  title="Refresh"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                {isAdmin && (
                  <Link to="/admin">
                    <Button variant="outline" size="sm" className="gap-1.5 rounded-xl h-8 text-xs">
                      <Shield className="h-3.5 w-3.5" />
                      Admin
                    </Button>
                  </Link>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1">
              {data.profile && <StatusBadge status={data.profile.status} variant="member" />}
              {slots > 1 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 rounded-full">
                  <Users className="h-3 w-3 mr-0.5" />
                  {slots} slots
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <InstallBanner />

      {/* Payment Cycle Card */}
      {currentCycle && !isPaid && (
        <Card className="mb-4 animate-fade-in-up border-accent/20">
          <CardContent className="p-5">
            {/* Cycle header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="fintech-icon-box bg-accent/10">
                <Calendar className="h-5 w-5 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm">
                  Week {format(new Date(currentCycle.week_start_date), 'MMM d')} – {format(new Date(currentCycle.week_end_date), 'd')}
                </h3>
                <p className="text-xs text-muted-foreground">Contribution cycle open</p>
              </div>
            </div>

            {/* Deadline */}
            {isDeadlinePassed ? (
              <div className="bg-destructive/8 border border-destructive/15 rounded-xl p-3.5 flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium text-destructive">Deadline passed</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-destructive">{format(new Date(currentCycle.deadline), 'EEE, MMM d')}</p>
                  <p className="text-xs text-muted-foreground">at {format(new Date(currentCycle.deadline), 'HH:mm')}</p>
                </div>
              </div>
            ) : (
              <div className="bg-warning/8 border border-warning/15 rounded-xl p-3.5 flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <Clock className="h-4 w-4 text-warning" />
                  <span className="text-sm font-medium">Payment deadline</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-warning">{format(new Date(currentCycle.deadline), 'EEE, MMM d')}</p>
                  <p className="text-xs text-muted-foreground">by {format(new Date(currentCycle.deadline), 'HH:mm')}</p>
                </div>
              </div>
            )}

            {/* Joining fee only week notice */}
            {isJoiningFeeOnlyWeek && (
              <Alert className="mb-4 border-info/20 bg-info/8 rounded-xl">
                <Info className="h-4 w-4 text-info" />
                <AlertDescription className="text-sm">
                  <strong>Joining Fees Only This Week</strong> — Weekly subscriptions start next week.
                </AlertDescription>
              </Alert>
            )}

            {/* Weekly breakdown */}
            <div className="space-y-2.5 mb-4">
              {weeklyDues.breakdown.map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">{item.label}</span>
                    {item.detail && <span className="text-xs text-muted-foreground/60">{item.detail}</span>}
                  </div>
                  <span className="font-medium">{formatCurrency(item.amount)}</span>
                </div>
              ))}
              <div className="border-t border-border/50 pt-3 flex justify-between items-center">
                <span className="text-sm font-bold">Total Due</span>
                <span className="text-lg font-bold text-accent">{formatCurrency(weeklyDues.total)}</span>
              </div>
            </div>

            {/* Payment status or submit button */}
            {data.currentWeekPayment ? (
              <div className="p-3.5 rounded-xl flex items-center justify-between bg-muted/50 border border-border/50">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Payment submitted</span>
                </div>
                <StatusBadge status={data.currentWeekPayment.status} variant="payment" />
              </div>
            ) : (
              <Link to="/payments/submit" className="block">
                <Button className="w-full fintech-btn-primary gap-2">
                  <CreditCard className="h-5 w-5" />
                  Submit Payment
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* Paid confirmation */}
      {isPaid && (
        <Card className="mb-4 animate-fade-in border-success/20 bg-success/5">
          <CardContent className="p-5">
            <div className="flex items-center gap-3.5">
              <div className="fintech-icon-box bg-success/10">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="font-semibold text-success">Week's Dues Paid ✓</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatCurrency(data.currentWeekPayment!.total_amount)} verified
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No active cycle */}
      {!currentCycle && !isLoading && (
        <Card className="animate-fade-in">
          <CardContent className="p-8 text-center">
            <div className="fintech-icon-box bg-muted mx-auto mb-4">
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground">No active cycle</p>
            <p className="text-sm text-muted-foreground mt-1">The next contribution cycle hasn't started yet.</p>
          </CardContent>
        </Card>
      )}
    </AppLayout>
  );
}
