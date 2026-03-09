import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/constants';
import {
  Car, ChevronRight, Shield, FileCheck, BarChart3,
  Users, CheckCircle, XCircle, PlusCircle
} from 'lucide-react';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';

interface EventBreakdown {
  id: string;
  title: string;
  totalMembers: number;
  paidMembers: number;
  unpaidMembers: number;
  collected: number;
  target: number;
}

interface Stats {
  activeEvents: number;
  collected: number;
  pendingPayments: number;
  paidMembers: number;
  unpaidMembers: number;
  events: EventBreakdown[];
}

export default function AccidentAdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    activeEvents: 0, collected: 0, pendingPayments: 0, paidMembers: 0, unpaidMembers: 0, events: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  const stableFetch = useCallback(() => { fetchStats(); }, []);
  useEffect(() => { fetchStats(); }, []);
  useRealtimeRefresh(['emergency_events', 'emergency_dues', 'payments'], stableFetch);

  const fetchStats = async () => {
    try {
      const { data: accidentEvents } = await supabase
        .from('emergency_events')
        .select('id, title, amount_per_member')
        .eq('status', 'active')
        .eq('type', 'accident');

      const eventIds = accidentEvents?.map(e => e.id) || [];

      let allDues: any[] = [];
      if (eventIds.length > 0) {
        const { data } = await supabase
          .from('emergency_dues')
          .select('event_id, amount_due, amount_paid, status')
          .in('event_id', eventIds);
        allDues = data || [];
      }

      const collected = allDues.reduce((s, d) => s + Number(d.amount_paid), 0);
      const paid = allDues.filter(d => d.status === 'paid').length;
      const unpaid = allDues.filter(d => d.status === 'unpaid').length;

      const events: EventBreakdown[] = (accidentEvents || []).map(evt => {
        const eventDues = allDues.filter(d => d.event_id === evt.id);
        const evtPaid = eventDues.filter(d => d.status === 'paid').length;
        const evtUnpaid = eventDues.filter(d => d.status === 'unpaid').length;
        const evtCollected = eventDues.reduce((s, d) => s + Number(d.amount_paid), 0);
        const evtTarget = eventDues.reduce((s, d) => s + Number(d.amount_due), 0);
        return {
          id: evt.id,
          title: evt.title,
          totalMembers: eventDues.length,
          paidMembers: evtPaid,
          unpaidMembers: evtUnpaid,
          collected: evtCollected,
          target: evtTarget,
        };
      });

      setStats({
        activeEvents: accidentEvents?.length || 0,
        collected,
        pendingPayments: unpaid,
        paidMembers: paid,
        unpaidMembers: unpaid,
        events,
      });
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = [
    { label: 'Active Accidents', value: stats.activeEvents.toString(), icon: Car, color: 'text-warning', bgColor: 'bg-warning/10', href: '/admin/accident-events' },
    { label: 'Collected', value: formatCurrency(stats.collected), icon: Shield, color: 'text-success', bgColor: 'bg-success/10', href: '/admin/accident-payments' },
    { label: 'Unpaid Members', value: stats.unpaidMembers.toString(), icon: FileCheck, color: 'text-destructive', bgColor: 'bg-destructive/10', href: '/admin/accident-payments' },
    { label: 'Paid / Unpaid', value: `${stats.paidMembers} / ${stats.unpaidMembers}`, icon: Users, color: 'text-info', bgColor: 'bg-info/10', href: '/admin/accident-payments' },
  ];

  return (
    <AppLayout requireAdmin>
      <PageHeader
        title="Accident Dashboard"
        subtitle="Manage accident emergencies"
        action={<Link to="/dashboard" className="text-xs text-muted-foreground hover:text-foreground">← Member View</Link>}
      />

      <Card className="mb-4 bg-warning/90 text-warning-foreground">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-card flex items-center justify-center">
            <Car className="h-6 w-6 text-warning" />
          </div>
          <div>
            <h2 className="font-bold text-lg">Accident Admin</h2>
            <p className="text-warning-foreground/70 text-sm">Accident Emergency Operations</p>
          </div>
        </CardContent>
      </Card>

      {/* Paid vs Unpaid Bar */}
      <Card className="mb-4 animate-fade-in">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-2">Member Payment Status</p>
          <div className="flex gap-4 mb-2">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-success" />
              <span className="text-sm font-semibold">{stats.paidMembers} Paid</span>
            </div>
            <div className="flex items-center gap-1.5">
              <XCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-semibold">{stats.unpaidMembers} Unpaid</span>
            </div>
          </div>
          {(stats.paidMembers + stats.unpaidMembers) > 0 && (
            <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-success rounded-full transition-all" style={{ width: `${(stats.paidMembers / (stats.paidMembers + stats.unpaidMembers)) * 100}%` }} />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {statCards.map((stat, i) => (
          <Link key={stat.label} to={stat.href} className="block animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
            <Card className="h-full hover:shadow-card-hover transition-shadow">
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

      {/* Per-Event Breakdown */}
      {stats.events.length > 0 && (
        <div className="space-y-3 mb-4">
          <h3 className="text-sm font-semibold text-muted-foreground">Active Events</h3>
          {stats.events.map((evt) => {
            const pct = evt.target > 0 ? Math.round((evt.collected / evt.target) * 100) : 0;
            return (
              <Link key={evt.id} to="/admin/accident-payments" className="block">
                <Card className="animate-fade-in hover:shadow-card-hover transition-shadow">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-sm">{evt.title}</p>
                        <p className="text-xs text-muted-foreground">Members: {evt.totalMembers}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground mt-0.5" />
                    </div>

                    <div className="flex gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-3.5 w-3.5 text-success" />
                        <span>Paid: <span className="font-semibold">{evt.paidMembers}</span></span>
                      </div>
                      <div className="flex items-center gap-1">
                        <XCircle className="h-3.5 w-3.5 text-destructive" />
                        <span>Outstanding: <span className="font-semibold">{evt.unpaidMembers}</span></span>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Collected</span>
                        <span className="font-semibold">{formatCurrency(evt.collected)} / {formatCurrency(evt.target)}</span>
                      </div>
                      <Progress value={pct} className="h-2.5" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <Card className="animate-fade-in">
        <CardContent className="p-4">
          <h3 className="font-medium text-sm mb-3">Quick Actions</h3>
          <div className="space-y-2">
            {[
              { to: '/admin/accident-events', icon: PlusCircle, label: 'Create Accident Event', color: 'text-warning' },
              { to: '/admin/accident-payments', icon: FileCheck, label: 'Verify Accident Payments', color: 'text-info' },
              { to: '/admin/accident-reports', icon: BarChart3, label: 'View Accident Reports', color: 'text-primary' },
            ].map((a) => (
              <Link key={a.to} to={a.to} className="flex items-center justify-between p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
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
