import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/constants';
import { 
  Wallet, 
  TrendingUp, 
  CreditCard, 
  Percent, 
  AlertTriangle, 
  Users,
  Clock,
  PieChart
} from 'lucide-react';
import type { FinancialSummary } from '@/hooks/useFinancialReports';

interface SummaryCardsProps {
  summary: FinancialSummary | undefined;
  isLoading: boolean;
}

export function SummaryCards({ summary, isLoading }: SummaryCardsProps) {
  const cards = [
    {
      label: 'Pool Balance',
      value: summary ? formatCurrency(summary.totalPoolBalance) : '—',
      icon: Wallet,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Total Contributions',
      value: summary ? formatCurrency(summary.totalContributions) : '—',
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      label: 'Active Loans',
      value: summary ? formatCurrency(summary.totalLoansActive) : '—',
      icon: CreditCard,
      color: 'text-info',
      bgColor: 'bg-info/10',
    },
    {
      label: 'Interest Earned',
      value: summary ? formatCurrency(summary.totalInterestEarned) : '—',
      icon: Percent,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      label: 'Emergency Dues',
      value: summary ? formatCurrency(summary.totalEmergencyDues) : '—',
      icon: AlertTriangle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
    {
      label: 'Collection Rate',
      value: summary ? `${summary.collectionRate.toFixed(1)}%` : '—',
      icon: PieChart,
      color: 'text-accent-foreground',
      bgColor: 'bg-accent',
    },
    {
      label: 'Active Members',
      value: summary ? summary.activeMembers.toString() : '—',
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Pending Payments',
      value: summary ? summary.pendingPayments.toString() : '—',
      icon: Clock,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-8 w-8 rounded-lg mb-2" />
              <Skeleton className="h-3 w-16 mb-1" />
              <Skeleton className="h-6 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((card, index) => (
        <Card 
          key={card.label} 
          className="animate-fade-in"
          style={{ animationDelay: `${index * 0.05}s` }}
        >
          <CardContent className="p-4">
            <div className={`h-8 w-8 rounded-lg ${card.bgColor} flex items-center justify-center mb-2`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
            <p className="text-xs text-muted-foreground mb-0.5">{card.label}</p>
            <p className="text-lg font-bold">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
