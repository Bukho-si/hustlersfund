import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { usePetrolLoanBoard } from '@/hooks/usePetrolLoanBoard';
import { usePetrolFund } from '@/hooks/usePetrolFund';
import { PetrolLoanMetrics } from '@/components/petrol-loans/PetrolLoanMetrics';
import { PetrolLoanBoard } from '@/components/petrol-loans/PetrolLoanBoard';
import { PetrolLoanActivityFeed } from '@/components/petrol-loans/PetrolLoanActivityFeed';
import { PetrolBatchReview } from '@/components/petrol-loans/PetrolBatchReview';
import { PetrolFundLowBanner } from '@/components/petrol-loans/PetrolFundBanner';
import { Loader2, Fuel, ListChecks, Activity } from 'lucide-react';

export default function AdminPetrolLoans() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('board');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { fund, isLowBalance } = usePetrolFund();

  const {
    columns, activities, metrics, isLoading, processingId,
    lockLoan, unlockLoan, approveLoan, rejectLoan, disburseLoan,
    refreshLoans, loans,
  } = usePetrolLoanBoard();

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

  // Pending loans for batch review (requested + under_review)
  const batchLoans = loans.filter(l => l.status === 'requested' || l.status === 'under_review');

  return (
    <AppLayout requireAdmin>
      <PageHeader
        title="Petrol Loans"
        subtitle="Multi-admin workflow board"
        showBack
      />

      {/* Low fund warning */}
      {fund && isLowBalance && (
        <PetrolFundLowBanner balance={fund.current_balance} threshold={fund.low_balance_threshold} />
      )}

      {/* Dashboard Metrics - now includes fund balance */}
      <PetrolLoanMetrics metrics={metrics} fundBalance={fund?.current_balance ?? 0} />

      {/* Tabs: Board + Batch + Activity */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="board" className="flex-1">
            <Fuel className="h-3.5 w-3.5 mr-1" />
            Board
          </TabsTrigger>
          <TabsTrigger value="batch" className="flex-1">
            <ListChecks className="h-3.5 w-3.5 mr-1" />
            Batch
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex-1">
            <Activity className="h-3.5 w-3.5 mr-1" />
            Feed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="board">
          <PetrolLoanBoard
            columns={columns}
            userId={user?.id || ''}
            processingId={processingId}
            onLock={lockLoan}
            onUnlock={unlockLoan}
            onApprove={approveLoan}
            onReject={rejectLoan}
            onDisburse={disburseLoan}
            onRepaymentSuccess={handleRepaymentSuccess}
            refreshTrigger={refreshTrigger}
          />
        </TabsContent>

        <TabsContent value="batch">
          <PetrolBatchReview
            loans={batchLoans}
            onApprove={approveLoan}
            onReject={rejectLoan}
            processingId={processingId}
            fundBalance={fund?.current_balance ?? 0}
          />
        </TabsContent>

        <TabsContent value="activity">
          <PetrolLoanActivityFeed activities={activities} />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
