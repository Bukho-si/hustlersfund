import { describe, it, expect } from 'vitest';
import { canAccessModule, AppRole } from '@/lib/roles';

describe('Emergency system admin separation', () => {
  describe('accident_admin cannot access funeral', () => {
    const roles: AppRole[] = ['accident_admin'];

    it('can manage accident events', () => {
      expect(canAccessModule(roles, 'accident_events')).toBe(true);
      expect(canAccessModule(roles, 'accident_payments')).toBe(true);
      expect(canAccessModule(roles, 'accident_reports')).toBe(true);
    });

    it('cannot manage funeral events', () => {
      expect(canAccessModule(roles, 'funeral_events')).toBe(false);
      expect(canAccessModule(roles, 'funeral_payments')).toBe(false);
      expect(canAccessModule(roles, 'funeral_reports')).toBe(false);
    });

    it('cannot manage general emergency', () => {
      expect(canAccessModule(roles, 'emergency_events')).toBe(false);
      expect(canAccessModule(roles, 'emergency_payments')).toBe(false);
    });
  });

  describe('funeral_admin cannot access accident', () => {
    const roles: AppRole[] = ['funeral_admin'];

    it('can manage funeral events', () => {
      expect(canAccessModule(roles, 'funeral_events')).toBe(true);
      expect(canAccessModule(roles, 'funeral_payments')).toBe(true);
      expect(canAccessModule(roles, 'funeral_reports')).toBe(true);
    });

    it('cannot manage accident events', () => {
      expect(canAccessModule(roles, 'accident_events')).toBe(false);
      expect(canAccessModule(roles, 'accident_payments')).toBe(false);
      expect(canAccessModule(roles, 'accident_reports')).toBe(false);
    });
  });

  describe('legacy emergency_admin covers both', () => {
    const roles: AppRole[] = ['emergency_admin'];

    it('can manage accident events', () => {
      expect(canAccessModule(roles, 'accident_events')).toBe(true);
      expect(canAccessModule(roles, 'accident_payments')).toBe(true);
      expect(canAccessModule(roles, 'accident_reports')).toBe(true);
    });

    it('can manage funeral events', () => {
      expect(canAccessModule(roles, 'funeral_events')).toBe(true);
      expect(canAccessModule(roles, 'funeral_payments')).toBe(true);
      expect(canAccessModule(roles, 'funeral_reports')).toBe(true);
    });

    it('can manage general emergency', () => {
      expect(canAccessModule(roles, 'emergency_events')).toBe(true);
      expect(canAccessModule(roles, 'emergency_payments')).toBe(true);
      expect(canAccessModule(roles, 'emergency_reports')).toBe(true);
    });
  });

  describe('no cross-contamination between specialized admins', () => {
    it('accident + personal_loan admin cannot access funeral', () => {
      const roles: AppRole[] = ['accident_admin', 'personal_loan_admin'];
      expect(canAccessModule(roles, 'funeral_events')).toBe(false);
      expect(canAccessModule(roles, 'petrol_loans')).toBe(false);
    });

    it('funeral + petrol_loan admin cannot access accident', () => {
      const roles: AppRole[] = ['funeral_admin', 'petrol_loan_admin'];
      expect(canAccessModule(roles, 'accident_events')).toBe(false);
      expect(canAccessModule(roles, 'personal_loans')).toBe(false);
    });
  });
});
