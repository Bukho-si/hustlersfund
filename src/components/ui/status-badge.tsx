import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  variant?: 'member' | 'payment' | 'loan' | 'emergency';
  className?: string;
}

const getStatusStyles = (status: string, variant: string) => {
  const statusLower = status.toLowerCase().replace('_', ' ');
  
  if (variant === 'member') {
    switch (statusLower) {
      case 'active':
        return 'bg-success/10 text-success border-success/20';
      case 'pending':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'suspended':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'exited':
        return 'bg-muted text-muted-foreground border-muted';
      default:
        return 'bg-muted text-muted-foreground border-muted';
    }
  }
  
  if (variant === 'payment') {
    switch (statusLower) {
      case 'verified':
        return 'bg-success/10 text-success border-success/20';
      case 'submitted':
      case 'pending verification':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'rejected':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'withdrawn':
        return 'bg-muted text-muted-foreground border-muted';
      default:
        return 'bg-muted text-muted-foreground border-muted';
    }
  }
  
  if (variant === 'loan') {
    switch (statusLower) {
      case 'approved':
        return 'bg-success/10 text-success border-success/20';
      case 'pending':
      case 'requested':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'under review':
        return 'bg-info/10 text-info border-info/20';
      case 'disbursed':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'repaid':
        return 'bg-muted text-muted-foreground border-muted';
      case 'rejected':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground border-muted';
    }
  }
  
  if (variant === 'emergency') {
    switch (statusLower) {
      case 'paid':
        return 'bg-success/10 text-success border-success/20';
      case 'unpaid':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'active':
        return 'bg-info/10 text-info border-info/20';
      case 'closed':
        return 'bg-muted text-muted-foreground border-muted';
      default:
        return 'bg-muted text-muted-foreground border-muted';
    }
  }
  
  return 'bg-muted text-muted-foreground border-muted';
};

export function StatusBadge({ status, variant = 'payment', className }: StatusBadgeProps) {
  const displayStatus = status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
  
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize",
        getStatusStyles(status, variant),
        className
      )}
    >
      {displayStatus}
    </span>
  );
}
