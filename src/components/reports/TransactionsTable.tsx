import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatCurrency, formatDateTime } from '@/lib/constants';
import { CreditCard, Wallet, ArrowUpRight } from 'lucide-react';
import type { RecentTransaction } from '@/hooks/useFinancialReports';

interface TransactionsTableProps {
  transactions: RecentTransaction[] | undefined;
  isLoading: boolean;
}

export function TransactionsTable({ transactions, isLoading }: TransactionsTableProps) {
  const getIcon = (type: 'payment' | 'loan' | 'repayment') => {
    switch (type) {
      case 'payment':
        return <ArrowUpRight className="h-3 w-3 text-success" />;
      case 'loan':
        return <CreditCard className="h-3 w-3 text-info" />;
      case 'repayment':
        return <Wallet className="h-3 w-3 text-warning" />;
    }
  };

  const getStatusVariant = (type: 'payment' | 'loan' | 'repayment'): 'payment' | 'loan' => {
    return type === 'loan' ? 'loan' : 'payment';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-6 rounded" />
                  <div>
                    <Skeleton className="h-3 w-24 mb-1" />
                    <Skeleton className="h-2 w-16" />
                  </div>
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {transactions && transactions.length > 0 ? (
            transactions.map((tx) => (
              <div 
                key={tx.id} 
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                    {getIcon(tx.type)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{tx.memberName}</p>
                    <p className="text-xs text-muted-foreground">
                      {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)} • {formatDateTime(tx.date)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${tx.type === 'payment' ? 'text-success' : 'text-foreground'}`}>
                    {tx.type === 'payment' ? '+' : ''}{formatCurrency(tx.amount)}
                  </p>
                  <StatusBadge 
                    status={tx.status} 
                    variant={getStatusVariant(tx.type)}
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-muted-foreground text-sm">
              No recent transactions
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
