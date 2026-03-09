import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

interface EmergencyReportsFilteredProps {
  emergencyType: 'accident' | 'funeral';
}

export default function EmergencyReportsFiltered({ emergencyType }: EmergencyReportsFilteredProps) {
  const typeLabel = emergencyType === 'funeral' ? 'Funeral' : 'Accident';

  return (
    <AppLayout requireAdmin>
      <PageHeader title={`${typeLabel} Reports`} subtitle={`${typeLabel} emergency analytics`} showBack />
      <Card>
        <CardContent className="p-8 text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold mb-2">{typeLabel} Reports</h3>
          <p className="text-sm text-muted-foreground">
            {typeLabel} fund reports and analytics coming soon.
          </p>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
