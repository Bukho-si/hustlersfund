import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { usePersonalLoanBoard } from '@/hooks/usePersonalLoanBoard';
import { usePersonalFund } from '@/hooks/usePersonalFund';
import { PersonalLoanMetrics } from '@/components/personal-loans/PersonalLoanMetrics';
import { PersonalLoanBoard } from '@/components/personal-loans/PersonalLoanBoard';
import { PersonalLoanActivityFeed } from '@/components/personal-loans/PersonalLoanActivityFeed';
import { PersonalBatchReview } from '@/components/personal-loans/PersonalBatchReview';
import { PersonalFundLowBanner } from '@/components/personal-loans/PersonalFundBanner';
import { AddPetrolToPersonalDialog } from '@/components/personal-loans/AddPetrolToPersonalDialog';
import { Loader2, DollarSign, ListChecks, Activity } from 'lucide-react';

export default function AdminPersonalLoans() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('board');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { fund, isLowBalance } = usePersonalFund();

  const {
    columns, activities, metrics, isLoading, processingId,
    lockLoan, unlockLoan, approveLoan, rejectLoan, disburseLoan,
    refreshLoans, loans,
  } = usePersonalLoanBoard();

  const handleRepaymentSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
    refreshLoans();
  };

  if (isLoading) {
    return (
      <AppLayout requireAdmin>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  const batchLoans = loans.filter(l => l.status === 'requested');

  return (
    <AppLayout requireAdmin>
      <PageHeader title="Personal Loans" subtitle="Multi-admin workflow board" showBack />

      {fund && isLowBalance && (
        <PersonalFundLowBanner balance={fund.current_balance} threshold={fund.low_balance_threshold} />
      )}

      <PersonalLoanMetrics metrics={metrics} fundBalance={fund?.current_balance ?? 0} />

      <AddPetrolToPersonalDialog onSuccess={handleRepaymentSuccess} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="board" className="flex-1"><DollarSign className="h-3.5 w-3.5 mr-1" />Board</TabsTrigger>
          <TabsTrigger value="batch" className="flex-1"><ListChecks className="h-3.5 w-3.5 mr-1" />Batch</TabsTrigger>
          <TabsTrigger value="activity" className="flex-1"><Activity className="h-3.5 w-3.5 mr-1" />Feed</TabsTrigger>
        </TabsList>

        <TabsContent value="board">
          <PersonalLoanBoard
            columns={columns} userId={user?.id || ''} processingId={processingId}
            isAdmin={true}
            onApprove={approveLoan}
            onReject={rejectLoan} onDisburse={disburseLoan}
            onRepaymentSuccess={handleRepaymentSuccess} refreshTrigger={refreshTrigger}
          />
        </TabsContent>

        <TabsContent value="batch">
          <PersonalBatchReview
            loans={batchLoans} onApprove={approveLoan} onReject={rejectLoan}
            processingId={processingId} fundBalance={fund?.current_balance ?? 0}
          />
        </TabsContent>

        <TabsContent value="activity">
          <PersonalLoanActivityFeed activities={activities} />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
