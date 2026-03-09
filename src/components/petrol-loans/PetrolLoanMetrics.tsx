import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/constants';
import { Clock, CheckCircle, TrendingUp, Wallet } from 'lucide-react';
import type { PetrolLoanMetrics as Metrics } from '@/hooks/usePetrolLoanBoard';

interface Props {
  metrics: Metrics;
}

export function PetrolLoanMetrics({ metrics }: Props) {
  const cards = [
    {
      label: 'Pending Requests',
      value: metrics.pendingRequests.toString(),
      icon: Clock,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      urgent: metrics.pendingRequests > 0,
    },
    {
      label: 'Approved Today',
      value: metrics.approvedToday.toString(),
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      label: 'Repayments Today',
      value: formatCurrency(metrics.repaymentsToday),
      icon: TrendingUp,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Total Outstanding',
      value: formatCurrency(metrics.totalOutstanding),
      icon: Wallet,
      color: 'text-info',
      bgColor: 'bg-info/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 mb-4">
      {cards.map((stat, i) => (
        <Card
          key={stat.label}
          className={`animate-fade-in ${stat.urgent ? 'ring-2 ring-warning' : ''}`}
          style={{ animationDelay: `${i * 0.05}s` }}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className={`h-7 w-7 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight">{stat.label}</p>
            </div>
            <p className="text-base font-bold">{stat.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
