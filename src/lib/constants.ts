// Hustlers Stokvel Business Constants

// Fees and amounts (in ZAR)
export const JOINING_FEE = 200;
export const WEEKLY_SUBSCRIPTION = 150;
export const LATE_FINE = 50;
export const CASH_ATM_FEE = 10;

// Loan limits
export const PETROL_LOAN_MAX = 1500;
export const PERSONAL_LOAN_MAX = 5000;

// Emergency contribution defaults
export const FUNERAL_CONTRIBUTION = 200;
export const ACCIDENT_CONTRIBUTION = 50;

// Timezone
export const TIMEZONE = 'Africa/Johannesburg';

// Currency formatting
export const formatCurrency = (amount: number): string => {
  return `R${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Date formatting
export const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatDateTime = (date: string | Date): string => {
  return new Date(date).toLocaleString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Status badge colors
export const getMemberStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-success text-success-foreground';
    case 'pending':
      return 'bg-warning text-warning-foreground';
    case 'suspended':
      return 'bg-destructive text-destructive-foreground';
    case 'exited':
      return 'bg-muted text-muted-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export const getPaymentStatusColor = (status: string) => {
  switch (status) {
    case 'verified':
      return 'bg-success text-success-foreground';
    case 'submitted':
    case 'pending_verification':
      return 'bg-warning text-warning-foreground';
    case 'rejected':
      return 'bg-destructive text-destructive-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export const getLoanStatusColor = (status: string) => {
  switch (status) {
    case 'approved':
      return 'bg-success text-success-foreground';
    case 'pending':
      return 'bg-warning text-warning-foreground';
    case 'rejected':
      return 'bg-destructive text-destructive-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
};
