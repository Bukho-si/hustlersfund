import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { usePetrolLoanBoard } from '@/hooks/usePetrolLoanBoard';
import { PetrolLoanMetrics } from '@/components/petrol-loans/PetrolLoanMetrics';
import { PetrolLoanBoard } from '@/components/petrol-loans/PetrolLoanBoard';
import { PetrolLoanActivityFeed } from '@/components/petrol-loans/PetrolLoanActivityFeed';
import { Loader2, Fuel } from 'lucide-react';

export default function AdminPetrolLoans() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('board');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const {
    columns, activities, metrics, isLoading, processingId,
    lockLoan, unlockLoan, approveLoan, rejectLoan, disburseLoan,
    refreshLoans,
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

  return (
    <AppLayout requireAdmin>
      <PageHeader
        title="Petrol Loans"
        subtitle="Multi-admin workflow board"
        showBack
      />

      {/* Dashboard Metrics */}
      <PetrolLoanMetrics metrics={metrics} />

      {/* Tabs: Board + Activity */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="board" className="flex-1">
            <Fuel className="h-3.5 w-3.5 mr-1" />
            Queue Board
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex-1">
            Activity Feed
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

        <TabsContent value="activity">
          <PetrolLoanActivityFeed activities={activities} />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
