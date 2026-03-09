import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { LoansReport } from '@/components/reports/LoansReport';

export default function AdminPersonalLoanReports() {
  return (
    <AppLayout requireAdmin>
      <PageHeader title="Personal Loan Reports" subtitle="Personal loan analytics and statements" showBack />
      <LoansReport loanTypeFilter="personal" />
    </AppLayout>
  );
}
