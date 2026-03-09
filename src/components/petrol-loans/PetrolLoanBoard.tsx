import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { PetrolLoanCard } from './PetrolLoanCard';
import type { PetrolLoanWithProfile } from '@/hooks/usePetrolLoanBoard';
import { Clock, Eye, CheckCircle2, Send } from 'lucide-react';

interface Column {
  key: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  loans: PetrolLoanWithProfile[];
}

interface Props {
  columns: {
    requested: PetrolLoanWithProfile[];
    underReview: PetrolLoanWithProfile[];
    approved: PetrolLoanWithProfile[];
    disbursed: PetrolLoanWithProfile[];
  };
  userId: string;
  processingId: string | null;
  onLock: (id: string) => Promise<boolean | undefined>;
  onUnlock: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onDisburse: (id: string) => void;
  onRepaymentSuccess: () => void;
  refreshTrigger: number;
}

export function PetrolLoanBoard({
  columns, userId, processingId,
  onLock, onUnlock, onApprove, onReject, onDisburse,
  onRepaymentSuccess, refreshTrigger,
}: Props) {
  const columnDefs: Column[] = [
    { key: 'requested', label: 'Requested', icon: Clock, color: 'text-warning', bgColor: 'bg-warning/10', loans: columns.requested },
    { key: 'underReview', label: 'Under Review', icon: Eye, color: 'text-info', bgColor: 'bg-info/10', loans: columns.underReview },
    { key: 'approved', label: 'Approved', icon: CheckCircle2, color: 'text-success', bgColor: 'bg-success/10', loans: columns.approved },
    { key: 'disbursed', label: 'Disbursed', icon: Send, color: 'text-primary', bgColor: 'bg-primary/10', loans: columns.disbursed },
  ];

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-3 pb-4 min-w-[900px]">
        {columnDefs.map((col) => (
          <div key={col.key} className="flex-1 min-w-[220px]">
            {/* Column header */}
            <div className={`flex items-center gap-2 p-2 rounded-lg ${col.bgColor} mb-2`}>
              <col.icon className={`h-4 w-4 ${col.color}`} />
              <span className="text-xs font-semibold">{col.label}</span>
              <span className={`ml-auto text-xs font-bold ${col.color}`}>
                {col.loans.length}
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-2">
              {col.loans.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">No loans</p>
                  </CardContent>
                </Card>
              ) : (
                col.loans.map((loan) => (
                  <PetrolLoanCard
                    key={loan.id}
                    loan={loan}
                    userId={userId}
                    processingId={processingId}
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
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
