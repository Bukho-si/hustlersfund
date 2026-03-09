// Centralized role definitions and permission mappings

export type AppRole = 'member' | 'admin' | 'super_admin' | 'emergency_admin' | 'petrol_loan_admin' | 'personal_loan_admin' | 'accident_admin' | 'funeral_admin';

export type AdminModule = 
  | 'dashboard'
  | 'members'
  | 'verify'
  | 'cycles'
  | 'petrol_loans'
  | 'personal_loans'
  | 'emergency_events'
  | 'emergency_payments'
  | 'emergency_reports'
  | 'accident_events'
  | 'accident_payments'
  | 'accident_reports'
  | 'funeral_events'
  | 'funeral_payments'
  | 'funeral_reports'
  | 'petrol_loan_reports'
  | 'personal_loan_reports'
  | 'reports'
  | 'roles'
  | 'settings'
  | 'contribution_settings'
  | 'ledger';

// Which modules each role can access
const ROLE_MODULES: Record<string, AdminModule[]> = {
  super_admin: [
    'dashboard', 'members', 'verify', 'cycles',
    'petrol_loans', 'personal_loans',
    'emergency_events', 'emergency_payments', 'emergency_reports',
    'accident_events', 'accident_payments', 'accident_reports',
    'funeral_events', 'funeral_payments', 'funeral_reports',
    'petrol_loan_reports', 'personal_loan_reports',
    'reports', 'roles', 'settings', 'contribution_settings', 'ledger',
  ],
  // Legacy admin role treated as super_admin
  admin: [
    'dashboard', 'members', 'verify', 'cycles',
    'petrol_loans', 'personal_loans',
    'emergency_events', 'emergency_payments', 'emergency_reports',
    'accident_events', 'accident_payments', 'accident_reports',
    'funeral_events', 'funeral_payments', 'funeral_reports',
    'petrol_loan_reports', 'personal_loan_reports',
    'reports', 'roles', 'settings', 'contribution_settings', 'ledger',
  ],
  // Legacy emergency_admin gets both accident and funeral
  emergency_admin: [
    'dashboard',
    'emergency_events', 'emergency_payments', 'emergency_reports',
    'accident_events', 'accident_payments', 'accident_reports',
    'funeral_events', 'funeral_payments', 'funeral_reports',
  ],
  accident_admin: [
    'dashboard',
    'accident_events', 'accident_payments', 'accident_reports',
  ],
  funeral_admin: [
    'dashboard',
    'funeral_events', 'funeral_payments', 'funeral_reports',
  ],
  petrol_loan_admin: [
    'dashboard',
    'petrol_loans', 'petrol_loan_reports',
  ],
  personal_loan_admin: [
    'dashboard',
    'personal_loans', 'personal_loan_reports',
  ],
};

// Map routes to modules
export const ROUTE_MODULE_MAP: Record<string, AdminModule> = {
  '/admin': 'dashboard',
  '/admin/dashboard': 'dashboard',
  '/admin/emergency-dashboard': 'emergency_events',
  '/admin/accident-dashboard': 'accident_events',
  '/admin/funeral-dashboard': 'funeral_events',
  '/admin/petrol-dashboard': 'petrol_loans',
  '/admin/personal-loan-dashboard': 'personal_loans',
  '/admin/members': 'members',
  '/admin/verify': 'verify',
  '/admin/cycles': 'cycles',
  '/admin/petrol-loans': 'petrol_loans',
  '/admin/personal-loans': 'personal_loans',
  '/admin/loans': 'petrol_loans', // legacy route
  '/admin/events': 'emergency_events',
  '/admin/accident-events': 'accident_events',
  '/admin/funeral-events': 'funeral_events',
  '/admin/emergency-payments': 'emergency_payments',
  '/admin/accident-payments': 'accident_payments',
  '/admin/funeral-payments': 'funeral_payments',
  '/admin/emergency-reports': 'emergency_reports',
  '/admin/accident-reports': 'accident_reports',
  '/admin/funeral-reports': 'funeral_reports',
  '/admin/petrol-loan-reports': 'petrol_loan_reports',
  '/admin/personal-loan-reports': 'personal_loan_reports',
  '/admin/reports': 'reports',
  '/admin/roles': 'roles',
  '/admin/settings': 'settings',
  '/admin/contribution-settings': 'contribution_settings',
  '/admin/ledger': 'ledger',
};

export function getAllowedModules(roles: AppRole[]): Set<AdminModule> {
  const modules = new Set<AdminModule>();
  for (const role of roles) {
    const roleModules = ROLE_MODULES[role];
    if (roleModules) {
      for (const mod of roleModules) {
        modules.add(mod);
      }
    }
  }
  return modules;
}

export function canAccessModule(roles: AppRole[], module: AdminModule): boolean {
  return getAllowedModules(roles).has(module);
}

export function canAccessRoute(roles: AppRole[], route: string): boolean {
  const module = ROUTE_MODULE_MAP[route];
  if (!module) return false;
  return canAccessModule(roles, module);
}

export function isSuperAdmin(roles: AppRole[]): boolean {
  return roles.includes('super_admin') || roles.includes('admin');
}

export function isAnyAdmin(roles: AppRole[]): boolean {
  return roles.some(r => r !== 'member');
}

export function getRoleLabel(role: AppRole): string {
  const labels: Record<AppRole, string> = {
    member: 'Member',
    admin: 'Admin (Legacy)',
    super_admin: 'Super Admin',
    emergency_admin: 'Emergency Admin (Legacy)',
    accident_admin: 'Accident Admin',
    funeral_admin: 'Funeral Admin',
    petrol_loan_admin: 'Petrol Loan Admin',
    personal_loan_admin: 'Personal Loan Admin',
  };
  return labels[role] || role;
}
