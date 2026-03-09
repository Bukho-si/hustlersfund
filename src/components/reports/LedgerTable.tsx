import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDateTime } from '@/lib/constants';
import { ArrowUpRight, ArrowDownLeft, BookOpen } from 'lucide-react';
import { type LedgerEntry, getTransactionLabel, isDebitTransaction } from '@/hooks/useFinancialLedger';

interface LedgerTableProps {
  entries: LedgerEntry[] | undefined;
  isLoading: boolean;
  title?: string;
  showMemberName?: boolean;
}

export function LedgerTable({ entries, isLoading, title = 'Financial Ledger', showMemberName = true }: LedgerTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-sm font-medium">{title}</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-20" />
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
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {entries && entries.length > 0 ? (
            entries.map((entry) => {
              const isDebit = isDebitTransaction(entry.transaction_type);
              return (
                <div
                  key={entry.id}
                  className="flex items-center justify-between py-2.5 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${isDebit ? 'bg-destructive/10' : 'bg-success/10'}`}>
                      {isDebit ? (
                        <ArrowDownLeft className="h-3.5 w-3.5 text-destructive" />
                      ) : (
                        <ArrowUpRight className="h-3.5 w-3.5 text-success" />
                      )}
                    </div>
                    <div>
                      {showMemberName && (
                        <p className="text-sm font-medium">{entry.memberName}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {getTransactionLabel(entry.transaction_type)}
                      </p>
                      {entry.description && (
                        <p className="text-xs text-muted-foreground/70 truncate max-w-[200px]">
                          {entry.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${isDebit ? 'text-destructive' : 'text-success'}`}>
                      {isDebit ? '-' : '+'}{formatCurrency(entry.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(entry.created_at)}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center text-muted-foreground text-sm">
              No ledger entries found
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
