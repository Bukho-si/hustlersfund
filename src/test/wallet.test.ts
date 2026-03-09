import { describe, it, expect } from 'vitest';
import { getWalletTransactionLabel, isWalletDebitTransaction, WalletTransactionType } from '@/hooks/useWallet';

describe('Wallet transaction utilities', () => {
  describe('getWalletTransactionLabel', () => {
    const expectedLabels: Record<WalletTransactionType, string> = {
      joining_fee_payment: 'Joining Fee',
      weekly_contribution: 'Weekly Contribution',
      petrol_loan_issued: 'Petrol Loan Issued',
      petrol_loan_repayment: 'Petrol Loan Repayment',
      personal_loan_issued: 'Personal Loan Issued',
      personal_loan_repayment: 'Personal Loan Repayment',
      funeral_contribution: 'Funeral Contribution',
      accident_contribution: 'Accident Contribution',
      emergency_contribution: 'Emergency Contribution',
      late_fee: 'Late Fee',
      cash_fee: 'Cash/ATM Fee',
    };

    for (const [type, label] of Object.entries(expectedLabels)) {
      it(`maps ${type} to "${label}"`, () => {
        expect(getWalletTransactionLabel(type as WalletTransactionType)).toBe(label);
      });
    }
  });

  describe('isWalletDebitTransaction', () => {
    it('identifies petrol_loan_issued as debit', () => {
      expect(isWalletDebitTransaction('petrol_loan_issued')).toBe(true);
    });

    it('identifies personal_loan_issued as debit', () => {
      expect(isWalletDebitTransaction('personal_loan_issued')).toBe(true);
    });

    it('identifies repayments as credit (not debit)', () => {
      expect(isWalletDebitTransaction('petrol_loan_repayment')).toBe(false);
      expect(isWalletDebitTransaction('personal_loan_repayment')).toBe(false);
    });

    it('identifies contributions as credit (not debit)', () => {
      expect(isWalletDebitTransaction('weekly_contribution')).toBe(false);
      expect(isWalletDebitTransaction('joining_fee_payment')).toBe(false);
      expect(isWalletDebitTransaction('funeral_contribution')).toBe(false);
      expect(isWalletDebitTransaction('accident_contribution')).toBe(false);
      expect(isWalletDebitTransaction('emergency_contribution')).toBe(false);
    });
  });
});

describe('Wallet balance calculation logic', () => {
  // Simulates the wallet trigger logic in pure TypeScript
  function calculateWalletBalances(transactions: { type: WalletTransactionType; amount: number }[]) {
    const wallet = {
      contribution_balance: 0,
      joining_fee_balance: 0,
      petrol_loan_balance: 0,
      personal_loan_balance: 0,
      emergency_contributions_total: 0,
    };

    for (const txn of transactions) {
      switch (txn.type) {
        case 'weekly_contribution':
          wallet.contribution_balance += txn.amount;
          break;
        case 'joining_fee_payment':
          wallet.joining_fee_balance += txn.amount;
          break;
        case 'petrol_loan_issued':
          wallet.petrol_loan_balance += txn.amount;
          break;
        case 'petrol_loan_repayment':
          wallet.petrol_loan_balance -= txn.amount;
          break;
        case 'personal_loan_issued':
          wallet.personal_loan_balance += txn.amount;
          break;
        case 'personal_loan_repayment':
          wallet.personal_loan_balance -= txn.amount;
          break;
        case 'funeral_contribution':
        case 'accident_contribution':
        case 'emergency_contribution':
          wallet.emergency_contributions_total += txn.amount;
          break;
        case 'late_fee':
        case 'cash_fee':
          wallet.contribution_balance += txn.amount;
          break;
      }
    }

    return wallet;
  }

  it('correctly sums weekly contributions', () => {
    const result = calculateWalletBalances([
      { type: 'weekly_contribution', amount: 150 },
      { type: 'weekly_contribution', amount: 150 },
      { type: 'weekly_contribution', amount: 150 },
    ]);
    expect(result.contribution_balance).toBe(450);
  });

  it('correctly tracks petrol loan lifecycle', () => {
    const result = calculateWalletBalances([
      { type: 'petrol_loan_issued', amount: 1500 },
      { type: 'petrol_loan_repayment', amount: 500 },
      { type: 'petrol_loan_repayment', amount: 1000 },
    ]);
    expect(result.petrol_loan_balance).toBe(0);
  });

  it('correctly tracks personal loan with partial repayment', () => {
    const result = calculateWalletBalances([
      { type: 'personal_loan_issued', amount: 5000 },
      { type: 'personal_loan_repayment', amount: 2000 },
    ]);
    expect(result.personal_loan_balance).toBe(3000);
  });

  it('separates emergency contributions correctly', () => {
    const result = calculateWalletBalances([
      { type: 'funeral_contribution', amount: 200 },
      { type: 'accident_contribution', amount: 50 },
      { type: 'emergency_contribution', amount: 100 },
    ]);
    expect(result.emergency_contributions_total).toBe(350);
  });

  it('includes late fees and cash fees in contributions', () => {
    const result = calculateWalletBalances([
      { type: 'weekly_contribution', amount: 150 },
      { type: 'late_fee', amount: 50 },
      { type: 'cash_fee', amount: 10 },
    ]);
    expect(result.contribution_balance).toBe(210);
  });

  it('handles joining fee accumulation', () => {
    const result = calculateWalletBalances([
      { type: 'joining_fee_payment', amount: 100 },
      { type: 'joining_fee_payment', amount: 100 },
    ]);
    expect(result.joining_fee_balance).toBe(200);
  });

  it('handles complex member lifecycle', () => {
    const result = calculateWalletBalances([
      { type: 'joining_fee_payment', amount: 200 },
      { type: 'weekly_contribution', amount: 150 },
      { type: 'weekly_contribution', amount: 150 },
      { type: 'petrol_loan_issued', amount: 1500 },
      { type: 'petrol_loan_repayment', amount: 750 },
      { type: 'personal_loan_issued', amount: 3000 },
      { type: 'personal_loan_repayment', amount: 1000 },
      { type: 'funeral_contribution', amount: 200 },
      { type: 'accident_contribution', amount: 50 },
      { type: 'late_fee', amount: 50 },
    ]);
    expect(result.joining_fee_balance).toBe(200);
    expect(result.contribution_balance).toBe(350); // 150+150+50
    expect(result.petrol_loan_balance).toBe(750); // 1500-750
    expect(result.personal_loan_balance).toBe(2000); // 3000-1000
    expect(result.emergency_contributions_total).toBe(250); // 200+50
  });
});
