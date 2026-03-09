import { describe, it, expect } from 'vitest';
import {
  getAllowedModules, canAccessModule, canAccessRoute,
  isSuperAdmin, isAnyAdmin, AppRole
} from '@/lib/roles';

describe('Role-based access control — Full role matrix', () => {
  describe('super_admin', () => {
    const roles: AppRole[] = ['super_admin'];

    it('can access all modules', () => {
      const allowed = getAllowedModules(roles);
      expect(allowed.has('dashboard')).toBe(true);
      expect(allowed.has('members')).toBe(true);
      expect(allowed.has('verify')).toBe(true);
      expect(allowed.has('cycles')).toBe(true);
      expect(allowed.has('petrol_loans')).toBe(true);
      expect(allowed.has('personal_loans')).toBe(true);
      expect(allowed.has('emergency_events')).toBe(true);
      expect(allowed.has('accident_events')).toBe(true);
      expect(allowed.has('funeral_events')).toBe(true);
      expect(allowed.has('roles')).toBe(true);
      expect(allowed.has('settings')).toBe(true);
      expect(allowed.has('contribution_settings')).toBe(true);
      expect(allowed.has('ledger')).toBe(true);
      expect(allowed.has('reports')).toBe(true);
    });

    it('can access all admin routes', () => {
      expect(canAccessRoute(roles, '/admin')).toBe(true);
      expect(canAccessRoute(roles, '/admin/members')).toBe(true);
      expect(canAccessRoute(roles, '/admin/settings')).toBe(true);
      expect(canAccessRoute(roles, '/admin/roles')).toBe(true);
      expect(canAccessRoute(roles, '/admin/petrol-loans')).toBe(true);
      expect(canAccessRoute(roles, '/admin/personal-loans')).toBe(true);
      expect(canAccessRoute(roles, '/admin/events')).toBe(true);
      expect(canAccessRoute(roles, '/admin/ledger')).toBe(true);
    });

    it('is super admin and any admin', () => {
      expect(isSuperAdmin(roles)).toBe(true);
      expect(isAnyAdmin(roles)).toBe(true);
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

    it('cannot access other modules', () => {
      expect(canAccessModule(roles, 'dashboard')).toBe(false);
      expect(canAccessModule(roles, 'members')).toBe(false);
      expect(canAccessModule(roles, 'personal_loans')).toBe(false);
      expect(canAccessModule(roles, 'emergency_events')).toBe(false);
      expect(canAccessModule(roles, 'accident_events')).toBe(false);
      expect(canAccessModule(roles, 'funeral_events')).toBe(false);
      expect(canAccessModule(roles, 'roles')).toBe(false);
      expect(canAccessModule(roles, 'settings')).toBe(false);
      expect(canAccessModule(roles, 'ledger')).toBe(false);
    });

    it('can access petrol routes only', () => {
      expect(canAccessRoute(roles, '/admin/petrol-loans')).toBe(true);
      expect(canAccessRoute(roles, '/admin/petrol-loan-reports')).toBe(true);
      expect(canAccessRoute(roles, '/admin/personal-loans')).toBe(false);
      expect(canAccessRoute(roles, '/admin/members')).toBe(false);
    });

    it('is admin but not super admin', () => {
      expect(isAnyAdmin(roles)).toBe(true);
      expect(isSuperAdmin(roles)).toBe(false);
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

    it('cannot access petrol or emergency modules', () => {
      expect(canAccessModule(roles, 'petrol_loans')).toBe(false);
      expect(canAccessModule(roles, 'emergency_events')).toBe(false);
      expect(canAccessModule(roles, 'accident_events')).toBe(false);
      expect(canAccessModule(roles, 'funeral_events')).toBe(false);
    });

    it('can access personal loan routes only', () => {
      expect(canAccessRoute(roles, '/admin/personal-loans')).toBe(true);
      expect(canAccessRoute(roles, '/admin/personal-loan-reports')).toBe(true);
      expect(canAccessRoute(roles, '/admin/petrol-loans')).toBe(false);
    });
  });

  describe('accident_admin', () => {
    const roles: AppRole[] = ['accident_admin'];

    it('can only access accident modules', () => {
      const allowed = getAllowedModules(roles);
      expect(allowed.size).toBe(3);
      expect(allowed.has('accident_events')).toBe(true);
      expect(allowed.has('accident_payments')).toBe(true);
      expect(allowed.has('accident_reports')).toBe(true);
    });

    it('cannot access funeral modules (separation test)', () => {
      expect(canAccessModule(roles, 'funeral_events')).toBe(false);
      expect(canAccessModule(roles, 'funeral_payments')).toBe(false);
      expect(canAccessModule(roles, 'funeral_reports')).toBe(false);
    });

    it('cannot access loan or general modules', () => {
      expect(canAccessModule(roles, 'petrol_loans')).toBe(false);
      expect(canAccessModule(roles, 'personal_loans')).toBe(false);
      expect(canAccessModule(roles, 'members')).toBe(false);
      expect(canAccessModule(roles, 'settings')).toBe(false);
    });
  });

  describe('funeral_admin', () => {
    const roles: AppRole[] = ['funeral_admin'];

    it('can only access funeral modules', () => {
      const allowed = getAllowedModules(roles);
      expect(allowed.size).toBe(3);
      expect(allowed.has('funeral_events')).toBe(true);
      expect(allowed.has('funeral_payments')).toBe(true);
      expect(allowed.has('funeral_reports')).toBe(true);
    });

    it('cannot access accident modules (separation test)', () => {
      expect(canAccessModule(roles, 'accident_events')).toBe(false);
      expect(canAccessModule(roles, 'accident_payments')).toBe(false);
      expect(canAccessModule(roles, 'accident_reports')).toBe(false);
    });

    it('cannot access loan or general modules', () => {
      expect(canAccessModule(roles, 'petrol_loans')).toBe(false);
      expect(canAccessModule(roles, 'personal_loans')).toBe(false);
      expect(canAccessModule(roles, 'dashboard')).toBe(false);
    });
  });

  describe('emergency_admin (legacy)', () => {
    const roles: AppRole[] = ['emergency_admin'];

    it('can access both accident and funeral modules', () => {
      expect(canAccessModule(roles, 'accident_events')).toBe(true);
      expect(canAccessModule(roles, 'accident_payments')).toBe(true);
      expect(canAccessModule(roles, 'funeral_events')).toBe(true);
      expect(canAccessModule(roles, 'funeral_payments')).toBe(true);
    });

    it('cannot access loan or general modules', () => {
      expect(canAccessModule(roles, 'petrol_loans')).toBe(false);
      expect(canAccessModule(roles, 'personal_loans')).toBe(false);
      expect(canAccessModule(roles, 'members')).toBe(false);
      expect(canAccessModule(roles, 'settings')).toBe(false);
    });
  });

  describe('member only', () => {
    const roles: AppRole[] = ['member'];

    it('has no admin access at all', () => {
      expect(isAnyAdmin(roles)).toBe(false);
      expect(isSuperAdmin(roles)).toBe(false);
      expect(getAllowedModules(roles).size).toBe(0);
    });

    it('cannot access any admin route', () => {
      expect(canAccessRoute(roles, '/admin')).toBe(false);
      expect(canAccessRoute(roles, '/admin/members')).toBe(false);
      expect(canAccessRoute(roles, '/admin/petrol-loans')).toBe(false);
      expect(canAccessRoute(roles, '/admin/events')).toBe(false);
    });
  });

  describe('multi-role combinations', () => {
    it('petrol + funeral admin can access both but not others', () => {
      const roles: AppRole[] = ['petrol_loan_admin', 'funeral_admin'];
      expect(canAccessModule(roles, 'petrol_loans')).toBe(true);
      expect(canAccessModule(roles, 'funeral_events')).toBe(true);
      expect(canAccessModule(roles, 'personal_loans')).toBe(false);
      expect(canAccessModule(roles, 'accident_events')).toBe(false);
      expect(canAccessModule(roles, 'members')).toBe(false);
    });

    it('accident + personal loan admin can access both but not others', () => {
      const roles: AppRole[] = ['accident_admin', 'personal_loan_admin'];
      expect(canAccessModule(roles, 'accident_events')).toBe(true);
      expect(canAccessModule(roles, 'personal_loans')).toBe(true);
      expect(canAccessModule(roles, 'petrol_loans')).toBe(false);
      expect(canAccessModule(roles, 'funeral_events')).toBe(false);
    });
  });
});
