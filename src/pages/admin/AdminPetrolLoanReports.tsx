import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { LoansReport } from '@/components/reports/LoansReport';

export default function AdminPetrolLoanReports() {
  return (
    <AppLayout requireAdmin>
      <PageHeader title="Petrol Loan Reports" subtitle="Petrol loan analytics and statements" showBack />
      <LoansReport loanTypeFilter="petrol" />
    </AppLayout>
  );
}
