import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/constants';
import { format } from 'date-fns';
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import type { PersonalLoanScheduleRow } from '@/hooks/usePersonalLoanSchedule';

interface Props {
  rows: PersonalLoanScheduleRow[];
}

export function PersonalLoanScheduleList({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          No personal loan installments yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((r) => {
        const isLate = r.status === 'late';
        const isPaid = r.status === 'paid';
        const grew = r.current_balance > r.original_amount;
        return (
          <Card
            key={r.id}
            className={isLate ? 'border-destructive/50 bg-destructive/5' : ''}
          >
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isPaid ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : isLate ? (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  ) : (
                    <Clock className="h-4 w-4 text-warning" />
                  )}
                  <Badge
                    variant={isPaid ? 'default' : isLate ? 'destructive' : 'secondary'}
                    className="capitalize"
                  >
                    {r.status}
                  </Badge>
                  {isLate && r.months_late > 0 && (
                    <span className="text-xs text-destructive font-medium">
                      {r.months_late} month{r.months_late > 1 ? 's' : ''} late
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  Due {format(new Date(r.due_date), 'dd MMM yyyy')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase">Original</p>
                  <p className="font-semibold">{formatCurrency(r.original_amount)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase">Current Balance</p>
                  <p className={`font-bold ${grew ? 'text-destructive' : ''}`}>
                    {formatCurrency(r.current_balance)}
                  </p>
                </div>
              </div>

              {grew && (
                <p className="text-xs text-destructive">
                  +{formatCurrency(r.current_balance - r.original_amount)} interest accrued (15%/month, capped at 1.5×)
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
