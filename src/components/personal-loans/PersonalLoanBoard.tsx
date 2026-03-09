import { Card, CardContent } from '@/components/ui/card';
import { PersonalLoanCard } from './PersonalLoanCard';
import type { PersonalLoanWithProfile } from '@/hooks/usePersonalLoanBoard';
import { Clock, CheckCircle2, Archive } from 'lucide-react';

interface Column {
  key: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  loans: PersonalLoanWithProfile[];
}

interface Props {
  columns: {
    requested: PersonalLoanWithProfile[];
    underReview: PersonalLoanWithProfile[];
    approved: PersonalLoanWithProfile[];
    repaid: PersonalLoanWithProfile[];
    rejected: PersonalLoanWithProfile[];
  };
  userId: string;
  isAdmin: boolean;
  processingId: string | null;
  onLock: (id: string) => Promise<boolean | undefined>;
  onUnlock: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onDisburse: (id: string) => void;
  onRepaymentSuccess: () => void;
  refreshTrigger: number;
}

export function PersonalLoanBoard({
  columns, userId, isAdmin, processingId,
  onLock, onUnlock, onApprove, onReject, onDisburse,
  onRepaymentSuccess, refreshTrigger,
}: Props) {
  const pending = [...columns.requested, ...columns.underReview];
  const active = [...columns.approved];
  const closed = [...columns.repaid, ...columns.rejected];

  const columnDefs: Column[] = [
    { key: 'pending', label: 'Pending', icon: Clock, color: 'text-warning', bgColor: 'bg-warning/10', loans: pending },
    { key: 'active', label: 'Active', icon: CheckCircle2, color: 'text-success', bgColor: 'bg-success/10', loans: active },
    { key: 'closed', label: 'Closed', icon: Archive, color: 'text-muted-foreground', bgColor: 'bg-muted/50', loans: closed },
  ];

  return (
    <div className="overflow-x-auto -mx-2 px-2 pb-2">
    <div className="grid grid-cols-3 gap-3" style={{ minWidth: '640px' }}>
      {columnDefs.map((col) => (
        <div key={col.key} className="min-w-0">
          <div className={`flex items-center gap-2 p-2 rounded-lg ${col.bgColor} mb-2`}>
            <col.icon className={`h-4 w-4 ${col.color}`} />
            <span className="text-xs font-semibold">{col.label}</span>
            <span className={`ml-auto text-xs font-bold ${col.color}`}>
              {col.loans.length}
            </span>
          </div>

          <div className="space-y-2">
            {col.loans.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground">No loans</p>
                </CardContent>
              </Card>
            ) : (
              col.loans.map((loan) => (
                <PersonalLoanCard
                  key={loan.id}
                  loan={loan}
                  userId={userId}
                  processingId={processingId}
                  isAdmin={isAdmin}
                  onLock={onLock}
                  onUnlock={onUnlock}
                  onApprove={onApprove}
                  onReject={onReject}
                  onDisburse={onDisburse}
                  onRepaymentSuccess={onRepaymentSuccess}
                  refreshTrigger={refreshTrigger}
                />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
