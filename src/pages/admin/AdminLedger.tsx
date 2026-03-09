import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { LedgerSummaryCards } from '@/components/reports/LedgerSummaryCards';
import { LedgerTable } from '@/components/reports/LedgerTable';
import { LedgerDateFilter } from '@/components/reports/LedgerDateFilter';
import { LedgerExportButton } from '@/components/reports/LedgerExportButton';
import { useLedgerEntries, useMemberLedgerSummary, type LedgerTransactionType } from '@/hooks/useFinancialLedger';

export default function AdminLedger() {
  const [filters, setFilters] = useState<{
    dateFrom?: string;
    dateTo?: string;
    transactionType?: LedgerTransactionType;
  }>({});

  const { data: summary, isLoading: summaryLoading } = useMemberLedgerSummary();
  const { data: entries, isLoading: entriesLoading } = useLedgerEntries({
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    transactionType: filters.transactionType,
    limit: 200,
  });

  return (
    <AppLayout requireAdmin>
      <PageHeader
        title="Financial Ledger"
        subtitle="Complete transaction history"
        showBack
        action={<LedgerExportButton entries={entries} />}
      />

      <div className="space-y-4">
        <LedgerSummaryCards summary={summary} isLoading={summaryLoading} />
        <LedgerDateFilter onFilter={setFilters} />
        <LedgerTable entries={entries} isLoading={entriesLoading} />
      </div>
    </AppLayout>
  );
}
