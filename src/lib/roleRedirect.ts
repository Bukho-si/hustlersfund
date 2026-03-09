import { AppRole } from './roles';

export function getDashboardRoute(roles: AppRole[]): string {
  if (roles.includes('super_admin') || roles.includes('admin')) {
    return '/admin/dashboard';
  }
  if (roles.includes('emergency_admin')) {
    return '/admin/emergency-dashboard';
  }
  if (roles.includes('petrol_loan_admin')) {
    return '/admin/petrol-dashboard';
  }
  if (roles.includes('personal_loan_admin')) {
    return '/admin/personal-loan-dashboard';
  }
  return '/dashboard';
}
