import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { LedgerSummaryCards } from '@/components/reports/LedgerSummaryCards';
import { LedgerTable } from '@/components/reports/LedgerTable';
import { LedgerDateFilter } from '@/components/reports/LedgerDateFilter';
import { LedgerExportButton } from '@/components/reports/LedgerExportButton';
import { useLedgerEntries, useMemberLedgerSummary, type LedgerTransactionType } from '@/hooks/useFinancialLedger';
import { useAllWallets, type MemberWallet } from '@/hooks/useWallet';
import { formatCurrency } from '@/lib/constants';
import { Wallet, Users, ChevronRight } from 'lucide-react';

export default function AdminLedger() {
  const [filters, setFilters] = useState<{
    dateFrom?: string;
    dateTo?: string;
    transactionType?: LedgerTransactionType;
  }>({});
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

  const { data: summary, isLoading: summaryLoading } = useMemberLedgerSummary();
  const { data: entries, isLoading: entriesLoading } = useLedgerEntries({
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    transactionType: filters.transactionType,
    limit: 200,
  });
  const { data: wallets, isLoading: walletsLoading } = useAllWallets();

  return (
    <AppLayout requireAdmin>
      <PageHeader
        title="Wallet & Ledger"
        subtitle="Member wallets and transaction history"
        showBack
        action={<LedgerExportButton entries={entries} />}
      />

      <div className="space-y-4">
        <LedgerSummaryCards summary={summary} isLoading={summaryLoading} />

        {/* Member Wallets Overview */}
        {wallets && wallets.length > 0 && (
          <Card className="animate-fade-in">
            <CardContent className="p-4">
              <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Member Wallets ({wallets.length})
              </h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {wallets.map((w) => (
                  <div key={w.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center">
                        <Wallet className="h-4 w-4 text-accent" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{w.memberName}</p>
                        <p className="text-xs text-muted-foreground">
                          Contributions: {formatCurrency(w.contribution_balance)}
                          {w.petrol_loan_balance > 0 && ` • Petrol: -${formatCurrency(w.petrol_loan_balance)}`}
                          {w.personal_loan_balance > 0 && ` • Personal: -${formatCurrency(w.personal_loan_balance)}`}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold">
                      {formatCurrency(w.contribution_balance + w.joining_fee_balance + w.emergency_contributions_total)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <LedgerDateFilter onFilter={setFilters} />
        <LedgerTable entries={entries} isLoading={entriesLoading} title="Wallet Transactions" />
      </div>
    </AppLayout>
  );
}
