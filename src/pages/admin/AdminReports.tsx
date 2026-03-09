import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, BarChart3 } from 'lucide-react';
import { SummaryCards } from '@/components/reports/SummaryCards';
import { ContributionsChart } from '@/components/reports/ContributionsChart';
import { LoanDistributionChart } from '@/components/reports/LoanDistributionChart';
import { TransactionsTable } from '@/components/reports/TransactionsTable';
import { MemberBalancesTable } from '@/components/reports/MemberBalancesTable';
import { ExportButton } from '@/components/reports/ExportButton';
import { SubscriptionsReport } from '@/components/reports/SubscriptionsReport';
import { LoansReport } from '@/components/reports/LoansReport';
import { LedgerTable } from '@/components/reports/LedgerTable';
import { LedgerSummaryCards } from '@/components/reports/LedgerSummaryCards';
import { LedgerExportButton } from '@/components/reports/LedgerExportButton';
import { useLedgerEntries, useMemberLedgerSummary } from '@/hooks/useFinancialLedger';
import {
  useFinancialSummary,
  useWeeklyContributions,
  useLoanDistribution,
  useRecentTransactions,
  useMemberBalances,
  usePaymentsLedger,
  useLoansLedger,
} from '@/hooks/useFinancialReports';

export default function AdminReports() {
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  const { data: summary, isLoading: summaryLoading, dataUpdatedAt: summaryUpdated } = useFinancialSummary();
  const { data: weeklyContributions, isLoading: weeklyLoading } = useWeeklyContributions();
  const { data: loanDistribution, isLoading: loanDistLoading } = useLoanDistribution();
  const { data: transactions, isLoading: transactionsLoading } = useRecentTransactions();
  const { data: memberBalances, isLoading: balancesLoading } = useMemberBalances();
  const { data: paymentsLedger } = usePaymentsLedger();
  const { data: loansLedger } = useLoansLedger();
  const { data: ledgerSummary, isLoading: ledgerSummaryLoading } = useMemberLedgerSummary();
  const { data: ledgerEntries, isLoading: ledgerEntriesLoading } = useLedgerEntries({ limit: 50 });

  useEffect(() => {
    if (summaryUpdated) {
      setLastUpdated(new Date(summaryUpdated));
    }
  }, [summaryUpdated]);

  return (
    <AppLayout requireAdmin>
      <PageHeader
        title="Financial Reports"
        subtitle="Live financial overview and statements"
        action={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />
              Updates every 30s
            </Badge>
            <ExportButton
              summary={summary}
              memberBalances={memberBalances}
              transactions={transactions}
              paymentsLedger={paymentsLedger}
              loansLedger={loansLedger}
            />
          </div>
        }
      />

      {/* Last Updated */}
      <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
        <BarChart3 className="h-3 w-3" />
        Last updated: {lastUpdated.toLocaleTimeString()}
      </div>

      {/* Main Report Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="w-full">
          <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
          <TabsTrigger value="subscriptions" className="flex-1">Weekly Subs</TabsTrigger>
          <TabsTrigger value="loans" className="flex-1">Loans</TabsTrigger>
          <TabsTrigger value="ledger" className="flex-1">Ledger</TabsTrigger>
        </TabsList>

        {/* Overview Tab - existing content */}
        <TabsContent value="overview" className="space-y-6">
          <SummaryCards summary={summary} isLoading={summaryLoading} />

          <div className="grid md:grid-cols-2 gap-4">
            <ContributionsChart data={weeklyContributions} isLoading={weeklyLoading} />
            <LoanDistributionChart data={loanDistribution} isLoading={loanDistLoading} />
          </div>

          <Tabs defaultValue="transactions" className="space-y-4">
            <TabsList>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="members">Member Balances</TabsTrigger>
            </TabsList>
            <TabsContent value="transactions">
              <TransactionsTable transactions={transactions} isLoading={transactionsLoading} />
            </TabsContent>
            <TabsContent value="members">
              <MemberBalancesTable balances={memberBalances} isLoading={balancesLoading} />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Weekly Subscriptions Tab */}
        <TabsContent value="subscriptions">
          <SubscriptionsReport />
        </TabsContent>

        {/* Loans Tab */}
        <TabsContent value="loans">
          <LoansReport />
        </TabsContent>

        {/* Ledger Tab */}
        <TabsContent value="ledger" className="space-y-4">
          <div className="flex justify-end">
            <LedgerExportButton entries={ledgerEntries} />
          </div>
          <LedgerSummaryCards summary={ledgerSummary} isLoading={ledgerSummaryLoading} />
          <LedgerTable entries={ledgerEntries} isLoading={ledgerEntriesLoading} title="Recent Ledger Entries" />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
