import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatCurrency, formatDate } from '@/lib/constants';
import { Wallet, TrendingUp, Users, AlertTriangle } from 'lucide-react';
import { DateRangeFilter } from './DateRangeFilter';
import { startOfDay, endOfDay } from 'date-fns';

interface SubsPayment {
  id: string;
  memberName: string;
  baseAmount: number;
  joiningFee: number;
  lateFine: number;
  cashFee: number;
  emergencyAmount: number;
  totalAmount: number;
  status: string;
  method: string;
  submittedAt: string;
  cycleName: string | null;
}

function useSubscriptionsData() {
  return useQuery({
    queryKey: ['subscriptions-report'],
    queryFn: async () => {
      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (!payments) return { payments: [], summary: { total: 0, verified: 0, pending: 0, rejected: 0, totalVerifiedAmount: 0, avgPerWeek: 0 } };

      const memberIds = [...new Set(payments.map(p => p.member_user_id))];
      const { data: profiles } = await supabase
        .from('member_profiles')
        .select('user_id, full_name')
        .in('user_id', memberIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      const cycleIds = [...new Set(payments.filter(p => p.cycle_id).map(p => p.cycle_id!))];
      const { data: cycles } = cycleIds.length > 0
        ? await supabase.from('contribution_cycles').select('id, week_start_date, week_end_date').in('id', cycleIds)
        : { data: [] };

      const cycleMap = new Map<string, string>();
      cycles?.forEach(c => cycleMap.set(c.id, `${formatDate(c.week_start_date)} - ${formatDate(c.week_end_date)}`));

      const mapped: SubsPayment[] = payments.map(p => ({
        id: p.id,
        memberName: profileMap.get(p.member_user_id) || 'Unknown',
        baseAmount: Number(p.base_amount),
        joiningFee: Number(p.joining_fee_amount),
        lateFine: Number(p.late_fine_amount),
        cashFee: Number(p.cash_fee_amount),
        emergencyAmount: Number(p.emergency_total_amount),
        totalAmount: Number(p.total_amount),
        status: p.status,
        method: p.method,
        submittedAt: p.submitted_at,
        cycleName: p.cycle_id ? cycleMap.get(p.cycle_id) || null : null,
      }));

      return { payments: mapped };
    },
    refetchInterval: 30000,
  });
}

export function SubscriptionsReport() {
  const { data, isLoading } = useSubscriptionsData();
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();

  const filtered = useMemo(() => {
    const all = data?.payments || [];
    return all.filter(p => {
      const d = new Date(p.submittedAt);
      if (fromDate && d < startOfDay(fromDate)) return false;
      if (toDate && d > endOfDay(toDate)) return false;
      return true;
    });
  }, [data?.payments, fromDate, toDate]);

  const summary = useMemo(() => {
    const verified = filtered.filter(p => p.status === 'verified');
    const pending = filtered.filter(p => ['submitted', 'pending_verification'].includes(p.status));
    const rejected = filtered.filter(p => p.status === 'rejected');
    const totalVerifiedAmount = verified.reduce((sum, p) => sum + p.totalAmount, 0);

    return {
      total: filtered.length,
      verified: verified.length,
      pending: pending.length,
      rejected: rejected.length,
      totalVerifiedAmount,
      avgPerWeek: totalVerifiedAmount / Math.max(1, verified.length),
    };
  }, [filtered]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
        <Card><CardContent className="p-4"><Skeleton className="h-40 w-full" /></CardContent></Card>
      </div>
    );
  }

  const cards = [
    { label: 'Total Verified', value: formatCurrency(summary.totalVerifiedAmount), icon: Wallet, color: 'text-success', bg: 'bg-success/10' },
    { label: 'Avg Per Payment', value: formatCurrency(summary.avgPerWeek), icon: TrendingUp, color: 'text-info', bg: 'bg-info/10' },
    { label: 'Verified Count', value: summary.verified.toString(), icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Pending / Rejected', value: `${summary.pending} / ${summary.rejected}`, icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10' },
  ];

  return (
    <div className="space-y-4">
      {/* Date Range Filter */}
      <DateRangeFilter from={fromDate} to={toDate} onFromChange={setFromDate} onToChange={setToDate} />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        {cards.map(card => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <div className={`h-8 w-8 rounded-lg ${card.bg} flex items-center justify-center mb-2`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className="text-lg font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Payment Breakdown Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Weekly Subscription Payments
            <span className="ml-2 text-xs font-normal text-muted-foreground">({filtered.length} records)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {filtered.length > 0 ? filtered.map(p => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.memberName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(p.submittedAt)} • {p.method === 'eft' ? 'EFT' : 'Cash/ATM'}
                    {p.cycleName && ` • ${p.cycleName}`}
                  </p>
                  {(p.joiningFee > 0 || p.lateFine > 0 || p.emergencyAmount > 0) && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {p.joiningFee > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted">Join: {formatCurrency(p.joiningFee)}</span>}
                      {p.lateFine > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">Fine: {formatCurrency(p.lateFine)}</span>}
                      {p.emergencyAmount > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/10 text-warning">Emergency: {formatCurrency(p.emergencyAmount)}</span>}
                      {p.cashFee > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted">Cash fee: {formatCurrency(p.cashFee)}</span>}
                    </div>
                  )}
                </div>
                <div className="text-right ml-2">
                  <p className="text-sm font-semibold">{formatCurrency(p.totalAmount)}</p>
                  <StatusBadge status={p.status} variant="payment" />
                </div>
              </div>
            )) : (
              <div className="py-8 text-center text-muted-foreground text-sm">No subscription payments found for this period</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
