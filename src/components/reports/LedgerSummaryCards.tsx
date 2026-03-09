import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/constants';
import { Wallet, CreditCard, ArrowUpRight, AlertTriangle, TrendingUp, Banknote } from 'lucide-react';
import type { LedgerSummary } from '@/hooks/useFinancialLedger';

interface LedgerSummaryCardsProps {
  summary: LedgerSummary | undefined;
  isLoading: boolean;
}

export function LedgerSummaryCards({ summary, isLoading }: LedgerSummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-6 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!summary) return null;

  const cards = [
    {
      label: 'Total Contributions',
      value: summary.totalContributions + summary.totalJoiningFees,
      icon: ArrowUpRight,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      label: 'Loans Outstanding',
      value: summary.totalLoansIssued - summary.totalLoanRepayments,
      icon: CreditCard,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      label: 'Emergency Funds',
      value: summary.totalEmergencyContributions,
      icon: AlertTriangle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
    {
      label: 'Net Position',
      value: summary.netPosition,
      icon: TrendingUp,
      color: 'text-info',
      bgColor: 'bg-info/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card) => (
        <Card key={card.label} className="animate-fade-in">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`h-7 w-7 rounded-lg ${card.bgColor} flex items-center justify-center`}>
                <card.icon className={`h-3.5 w-3.5 ${card.color}`} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className="text-lg font-bold">{formatCurrency(card.value)}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
