// Hustlers Stokvel Business Constants
// NOTE: These are fallback defaults. Use useContributionSettings() hook to get database values.

// Fees and amounts (in ZAR) - FALLBACK DEFAULTS ONLY
export const JOINING_FEE = 200;
export const WEEKLY_SUBSCRIPTION = 150;
export const LATE_FINE = 50;
export const CASH_ATM_FEE = 10;

// Loan limits - FALLBACK DEFAULTS ONLY
export const PETROL_LOAN_MAX = 1500;
export const PERSONAL_LOAN_MAX = 5000;

// Emergency contribution defaults - FALLBACK DEFAULTS ONLY
export const FUNERAL_CONTRIBUTION = 200;
export const ACCIDENT_CONTRIBUTION = 50;

// Timezone
export const TIMEZONE = 'Africa/Johannesburg';

// Legacy slot-based calculation helpers (use useContributionSettings hook versions instead)
export const getJoiningFeeTotal = (slots: number) => JOINING_FEE * slots;
export const getWeeklySubscription = (slots: number) => WEEKLY_SUBSCRIPTION * slots;
export const getPetrolLoanMax = (slots: number) => PETROL_LOAN_MAX * slots;
export const getPersonalLoanMax = (slots: number) => PERSONAL_LOAN_MAX * slots;

export const getJoiningFeeRemaining = (slots: number, paidTotal: number) =>
  Math.max(0, getJoiningFeeTotal(slots) - paidTotal);

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
    case 'requested':
      return 'bg-warning text-warning-foreground';
    case 'under_review':
      return 'bg-info text-info-foreground';
    case 'disbursed':
      return 'bg-primary text-primary-foreground';
    case 'repaid':
      return 'bg-muted text-muted-foreground';
    case 'rejected':
      return 'bg-destructive text-destructive-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
};
