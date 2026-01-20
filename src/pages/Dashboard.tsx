import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/constants';
import { 
  CreditCard, 
  Wallet, 
  AlertTriangle, 
  ChevronRight, 
  TrendingUp,
  Clock,
  CheckCircle2,
  Shield
} from 'lucide-react';
import { WEEKLY_SUBSCRIPTION, JOINING_FEE, LATE_FINE, CASH_ATM_FEE } from '@/lib/constants';

interface DashboardData {
  profile: {
    full_name: string;
    status: string;
    joining_fee_paid: boolean;
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
  const [data, setData] = useState<DashboardData>({
    profile: null,
    currentWeekPayment: null,
    totalLoansOutstanding: 0,
    emergencyDuesCount: 0,
    emergencyDuesTotal: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      // Fetch profile
      const { data: profile } = await supabase
        .from('member_profiles')
        .select('full_name, status, joining_fee_paid')
        .eq('user_id', user.id)
        .maybeSingle();

      // Fetch current week payment (most recent)
      const { data: payments } = await supabase
        .from('payments')
        .select('status, total_amount')
        .eq('member_user_id', user.id)
        .order('submitted_at', { ascending: false })
        .limit(1);

      // Fetch outstanding loans
      const { data: loans } = await supabase
        .from('loans')
        .select('outstanding_balance')
        .eq('member_user_id', user.id)
        .eq('status', 'approved');

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
        currentWeekPayment: payments?.[0] || null,
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

  // Calculate this week's dues
  const calculateWeeklyDues = () => {
    let total = WEEKLY_SUBSCRIPTION;
    const breakdown: { label: string; amount: number }[] = [
      { label: 'Weekly subscription', amount: WEEKLY_SUBSCRIPTION },
    ];

    if (data.profile && !data.profile.joining_fee_paid) {
      total += JOINING_FEE;
      breakdown.push({ label: 'Joining fee (once-off)', amount: JOINING_FEE });
    }

    if (data.emergencyDuesTotal > 0) {
      total += data.emergencyDuesTotal;
      breakdown.push({ label: `Emergency dues (${data.emergencyDuesCount})`, amount: data.emergencyDuesTotal });
    }

    return { total, breakdown };
  };

  const weeklyDues = calculateWeeklyDues();
  const firstName = data.profile?.full_name?.split(' ')[0] || 'Hustler';

  return (
    <AppLayout>
      {/* Welcome Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-foreground">
            Hey, {firstName}! 👋
          </h1>
          {isAdmin && (
            <Link to="/admin">
              <Button variant="outline" size="sm" className="gap-1">
                <Shield className="h-4 w-4" />
                Admin
              </Button>
            </Link>
          )}
        </div>
        <p className="text-muted-foreground text-sm">
          {data.profile?.status === 'active' 
            ? "You're all caught up. Keep hustling!"
            : "Complete your profile to get started"}
        </p>
      </div>

      {/* Status Card */}
      {data.profile && (
        <Card className="mb-4 bg-primary text-primary-foreground animate-fade-in">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-foreground/70 text-xs mb-1">Member Status</p>
                <StatusBadge status={data.profile.status} variant="member" />
              </div>
              <div className="text-right">
                <p className="text-primary-foreground/70 text-xs mb-1">This Week's Dues</p>
                <p className="text-2xl font-bold">{formatCurrency(weeklyDues.total)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weekly Dues Breakdown */}
      <Card className="mb-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            This Week's Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {weeklyDues.breakdown.map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium">{formatCurrency(item.amount)}</span>
              </div>
            ))}
            <div className="border-t pt-2 flex justify-between text-sm font-semibold">
              <span>Total Due</span>
              <span className="text-accent">{formatCurrency(weeklyDues.total)}</span>
            </div>
          </div>
          
          {data.currentWeekPayment ? (
            <div className="mt-4 p-3 bg-muted rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
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
