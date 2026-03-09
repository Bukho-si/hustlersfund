import { describe, it, expect } from 'vitest';
import { getPetrolLoanMax, getPersonalLoanMax, getJoiningFeeTotal, getJoiningFeeRemaining, formatCurrency } from '@/lib/constants';

describe('Petrol loan eligibility logic', () => {
  it('calculates max petrol loan for 1 slot', () => {
    expect(getPetrolLoanMax(1)).toBe(1500);
  });

  it('calculates max petrol loan for 2 slots', () => {
    expect(getPetrolLoanMax(2)).toBe(3000);
  });

  it('calculates max petrol loan for 3 slots', () => {
    expect(getPetrolLoanMax(3)).toBe(4500);
  });

  describe('eligibility with existing debt', () => {
    function getEligibleAmount(slots: number, existingOutstanding: number) {
      return Math.max(0, getPetrolLoanMax(slots) - existingOutstanding);
    }

    it('full eligibility with no debt', () => {
      expect(getEligibleAmount(1, 0)).toBe(1500);
    });

    it('partial eligibility with some debt', () => {
      expect(getEligibleAmount(1, 500)).toBe(1000);
    });

    it('zero eligibility when fully borrowed', () => {
      expect(getEligibleAmount(1, 1500)).toBe(0);
    });

    it('zero eligibility when over-borrowed', () => {
      expect(getEligibleAmount(1, 2000)).toBe(0);
    });

    it('multi-slot eligibility with partial debt', () => {
      expect(getEligibleAmount(2, 1000)).toBe(2000);
    });
  });

  describe('risk indicator logic', () => {
    type Risk = 'green' | 'yellow' | 'red';

    function getRiskLevel(existingOutstanding: number, eligibleAmount: number, contributionStatus: 'paid' | 'unpaid'): Risk {
      if (existingOutstanding > 0 && eligibleAmount <= 0) return 'red';
      if (existingOutstanding > 0) return 'yellow';
      if (contributionStatus === 'unpaid') return 'yellow';
      return 'green';
    }

    it('green for clean borrower', () => {
      expect(getRiskLevel(0, 1500, 'paid')).toBe('green');
    });

    it('yellow for outstanding loan but eligible', () => {
      expect(getRiskLevel(500, 1000, 'paid')).toBe('yellow');
    });

    it('yellow for unpaid contributions', () => {
      expect(getRiskLevel(0, 1500, 'unpaid')).toBe('yellow');
    });

    it('red for maxed out borrower', () => {
      expect(getRiskLevel(1500, 0, 'paid')).toBe('red');
    });
  });
});

describe('Petrol fund liquidity protection', () => {
  function canApproveLoan(fundBalance: number, loanAmount: number): boolean {
    return loanAmount <= fundBalance;
  }

  it('allows approval when fund has enough', () => {
    expect(canApproveLoan(10000, 1500)).toBe(true);
  });

  it('blocks approval when fund is insufficient', () => {
    expect(canApproveLoan(1000, 1500)).toBe(false);
  });

  it('allows approval when exactly equal', () => {
    expect(canApproveLoan(1500, 1500)).toBe(true);
  });

  it('blocks approval when fund is zero', () => {
    expect(canApproveLoan(0, 1500)).toBe(false);
  });
});

describe('Petrol loan time window', () => {
  function isWithinWindow(currentMinutes: number, startTime: string, endTime: string, active: boolean): boolean {
    if (!active) return true;
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }

  it('allows requests within 06:00-10:00 window', () => {
    expect(isWithinWindow(7 * 60, '06:00', '10:00', true)).toBe(true); // 07:00
    expect(isWithinWindow(6 * 60, '06:00', '10:00', true)).toBe(true); // 06:00 exactly
    expect(isWithinWindow(10 * 60, '06:00', '10:00', true)).toBe(true); // 10:00 exactly
  });

  it('blocks requests outside 06:00-10:00 window', () => {
    expect(isWithinWindow(5 * 60 + 59, '06:00', '10:00', true)).toBe(false); // 05:59
    expect(isWithinWindow(10 * 60 + 1, '06:00', '10:00', true)).toBe(false); // 10:01
    expect(isWithinWindow(14 * 60, '06:00', '10:00', true)).toBe(false); // 14:00
  });

  it('allows all requests when window is inactive', () => {
    expect(isWithinWindow(14 * 60, '06:00', '10:00', false)).toBe(true);
    expect(isWithinWindow(2 * 60, '06:00', '10:00', false)).toBe(true);
  });

  it('works with custom windows', () => {
    expect(isWithinWindow(8 * 60 + 30, '08:00', '12:00', true)).toBe(true);
    expect(isWithinWindow(7 * 60 + 59, '08:00', '12:00', true)).toBe(false);
  });
});

describe('Loan queue request locking', () => {
  const LOCK_EXPIRY_MS = 3 * 60 * 1000;

  function isLockExpired(lockedAt: string | null): boolean {
    if (!lockedAt) return true;
    return Date.now() - new Date(lockedAt).getTime() > LOCK_EXPIRY_MS;
  }

  function canLock(lockedBy: string | null, lockedAt: string | null, currentUserId: string): boolean {
    if (!lockedBy) return true;
    if (lockedBy === currentUserId) return true;
    return isLockExpired(lockedAt);
  }

  it('allows locking an unlocked loan', () => {
    expect(canLock(null, null, 'admin1')).toBe(true);
  });

  it('allows re-locking by same admin', () => {
    expect(canLock('admin1', new Date().toISOString(), 'admin1')).toBe(true);
  });

  it('blocks locking by different admin when not expired', () => {
    expect(canLock('admin1', new Date().toISOString(), 'admin2')).toBe(false);
  });

  it('allows locking by different admin when expired', () => {
    const oldTime = new Date(Date.now() - 4 * 60 * 1000).toISOString(); // 4 min ago
    expect(canLock('admin1', oldTime, 'admin2')).toBe(true);
  });
});

describe('Financial calculations', () => {
  it('formats currency correctly', () => {
    expect(formatCurrency(1500)).toContain('1');
    expect(formatCurrency(0)).toContain('0.00');
  });

  it('calculates joining fee total by slots', () => {
    expect(getJoiningFeeTotal(1)).toBe(200);
    expect(getJoiningFeeTotal(2)).toBe(400);
    expect(getJoiningFeeTotal(3)).toBe(600);
  });

  it('calculates joining fee remaining', () => {
    expect(getJoiningFeeRemaining(1, 0)).toBe(200);
    expect(getJoiningFeeRemaining(1, 100)).toBe(100);
    expect(getJoiningFeeRemaining(1, 200)).toBe(0);
    expect(getJoiningFeeRemaining(1, 300)).toBe(0); // overpaid
  });

  it('calculates personal loan max by slots', () => {
    expect(getPersonalLoanMax(1)).toBe(5000);
    expect(getPersonalLoanMax(2)).toBe(10000);
  });
});
