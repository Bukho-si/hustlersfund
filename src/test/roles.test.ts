import { describe, it, expect } from 'vitest';
import { getAllowedModules, canAccessModule, canAccessRoute, isSuperAdmin, isAnyAdmin, AppRole } from '@/lib/roles';

describe('Role-based access control', () => {
  describe('emergency_admin', () => {
    const roles: AppRole[] = ['emergency_admin'];

    it('can access emergency modules', () => {
      expect(canAccessModule(roles, 'emergency_events')).toBe(true);
      expect(canAccessModule(roles, 'emergency_payments')).toBe(true);
      expect(canAccessModule(roles, 'emergency_reports')).toBe(true);
    });

    it('cannot access non-emergency modules', () => {
      expect(canAccessModule(roles, 'dashboard')).toBe(false);
      expect(canAccessModule(roles, 'members')).toBe(false);
      expect(canAccessModule(roles, 'verify')).toBe(false);
      expect(canAccessModule(roles, 'cycles')).toBe(false);
      expect(canAccessModule(roles, 'petrol_loans')).toBe(false);
      expect(canAccessModule(roles, 'personal_loans')).toBe(false);
      expect(canAccessModule(roles, 'reports')).toBe(false);
      expect(canAccessModule(roles, 'roles')).toBe(false);
      expect(canAccessModule(roles, 'settings')).toBe(false);
      expect(canAccessModule(roles, 'contribution_settings')).toBe(false);
    });

    it('cannot access restricted routes', () => {
      expect(canAccessRoute(roles, '/admin')).toBe(false);
      expect(canAccessRoute(roles, '/admin/members')).toBe(false);
      expect(canAccessRoute(roles, '/admin/settings')).toBe(false);
      expect(canAccessRoute(roles, '/admin/roles')).toBe(false);
      expect(canAccessRoute(roles, '/admin/petrol-loans')).toBe(false);
      expect(canAccessRoute(roles, '/admin/personal-loans')).toBe(false);
    });

    it('can access emergency routes', () => {
      expect(canAccessRoute(roles, '/admin/events')).toBe(true);
      expect(canAccessRoute(roles, '/admin/emergency-payments')).toBe(true);
      expect(canAccessRoute(roles, '/admin/emergency-reports')).toBe(true);
    });

    it('is admin but not super admin', () => {
      expect(isAnyAdmin(roles)).toBe(true);
      expect(isSuperAdmin(roles)).toBe(false);
    });
  });

  describe('petrol_loan_admin', () => {
    const roles: AppRole[] = ['petrol_loan_admin'];

    it('can only access petrol loan modules', () => {
      const allowed = getAllowedModules(roles);
      expect(allowed.size).toBe(2);
      expect(allowed.has('petrol_loans')).toBe(true);
      expect(allowed.has('petrol_loan_reports')).toBe(true);
    });

    it('cannot access emergency or personal loan modules', () => {
      expect(canAccessModule(roles, 'emergency_events')).toBe(false);
      expect(canAccessModule(roles, 'personal_loans')).toBe(false);
      expect(canAccessModule(roles, 'roles')).toBe(false);
    });
  });

  describe('personal_loan_admin', () => {
    const roles: AppRole[] = ['personal_loan_admin'];

    it('can only access personal loan modules', () => {
      const allowed = getAllowedModules(roles);
      expect(allowed.size).toBe(2);
      expect(allowed.has('personal_loans')).toBe(true);
      expect(allowed.has('personal_loan_reports')).toBe(true);
    });

    it('cannot access petrol loan or emergency modules', () => {
      expect(canAccessModule(roles, 'petrol_loans')).toBe(false);
      expect(canAccessModule(roles, 'emergency_events')).toBe(false);
    });
  });

  describe('super_admin', () => {
    const roles: AppRole[] = ['super_admin'];

    it('can access all modules', () => {
      const allowed = getAllowedModules(roles);
      expect(allowed.size).toBeGreaterThanOrEqual(14);
      expect(allowed.has('dashboard')).toBe(true);
      expect(allowed.has('members')).toBe(true);
      expect(allowed.has('roles')).toBe(true);
      expect(allowed.has('settings')).toBe(true);
      expect(allowed.has('emergency_events')).toBe(true);
      expect(allowed.has('petrol_loans')).toBe(true);
      expect(allowed.has('personal_loans')).toBe(true);
    });

    it('is super admin', () => {
      expect(isSuperAdmin(roles)).toBe(true);
    });
  });

  describe('member only', () => {
    const roles: AppRole[] = ['member'];

    it('has no admin access', () => {
      expect(isAnyAdmin(roles)).toBe(false);
      expect(getAllowedModules(roles).size).toBe(0);
    });
  });
});
