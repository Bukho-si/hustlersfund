import { Card, CardContent } from '@/components/ui/card';
import { formatDateTime } from '@/lib/constants';
import type { PetrolLoanActivity } from '@/hooks/usePetrolLoanBoard';
import { Activity, Eye, CheckCircle2, XCircle, Send, CreditCard } from 'lucide-react';

interface Props {
  activities: PetrolLoanActivity[];
}

const actionConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  loan_reviewed: { icon: Eye, color: 'text-info', label: 'Reviewed' },
  loan_approved: { icon: CheckCircle2, color: 'text-success', label: 'Approved' },
  loan_rejected: { icon: XCircle, color: 'text-destructive', label: 'Rejected' },
  loan_disbursed: { icon: Send, color: 'text-primary', label: 'Disbursed' },
  repayment_recorded: { icon: CreditCard, color: 'text-accent', label: 'Repayment' },
};

export function PetrolLoanActivityFeed({ activities }: Props) {
  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No recent activity</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Activity Feed</h3>
        </div>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {activities.map((activity) => {
            const config = actionConfig[activity.action] || {
              icon: Activity,
              color: 'text-muted-foreground',
              label: activity.action,
            };
            const Icon = config.icon;

            return (
              <div key={activity.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${config.color}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs">
                    <span className="font-medium">{activity.actor_name}</span>
                    {' '}
                    <span className="text-muted-foreground">{config.label.toLowerCase()}</span>
                  </p>
                  {activity.details && (
                    <p className="text-[10px] text-muted-foreground truncate">{activity.details}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground">{formatDateTime(activity.created_at)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
