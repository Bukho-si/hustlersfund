import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

export default function AdminEmergencyReports() {
  return (
    <AppLayout requireAdmin>
      <PageHeader title="Emergency Reports" subtitle="View emergency fund analytics" showBack />
      <Card>
        <CardContent className="p-8 text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold mb-2">Emergency Reports</h3>
          <p className="text-sm text-muted-foreground">
            Emergency fund reports and analytics coming soon.
          </p>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
