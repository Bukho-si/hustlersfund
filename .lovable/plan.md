
# Membership Slots Implementation Plan

## Overview
This plan adds support for 1-5 membership slots per member, scaling fees and loan limits accordingly while keeping emergency contributions fixed.

---

## Database Changes

### 1. Add New Columns to `member_profiles` Table

```sql
ALTER TABLE member_profiles
ADD COLUMN membership_slots integer NOT NULL DEFAULT 1,
ADD COLUMN joining_fee_paid_total numeric NOT NULL DEFAULT 0;

-- Add validation constraint
ALTER TABLE member_profiles
ADD CONSTRAINT membership_slots_range CHECK (membership_slots >= 1 AND membership_slots <= 5);

-- Update existing members: backfill joining_fee_paid_total based on current joining_fee_paid
UPDATE member_profiles
SET joining_fee_paid_total = CASE WHEN joining_fee_paid = true THEN 200 ELSE 0 END;
```

---

## Business Logic Summary

| Item | Formula | Notes |
|------|---------|-------|
| Joining Fee Total | R200 x slots | Tracked incrementally |
| Weekly Subscription | R150 x slots | Per cycle |
| Petrol Loan Max | R1,500 x slots | Weekly cap |
| Personal Loan Max | R5,000 x slots | Monthly cap |
| Funeral Contribution | R200 | Fixed per event |
| Accident Contribution | R50 | Fixed per event |

---

## Code Changes

### 1. Update Constants (`src/lib/constants.ts`)
Add helper functions for slot-based calculations:
- `getJoiningFeeTotal(slots: number)`
- `getWeeklySubscription(slots: number)`
- `getPetrolLoanMax(slots: number)`
- `getPersonalLoanMax(slots: number)`

### 2. Update Dashboard (`src/pages/Dashboard.tsx`)
**Changes:**
- Fetch `membership_slots` and `joining_fee_paid_total` from profile
- Display "Membership Slots: X" badge
- Update weekly dues breakdown:
  - Show "R150 x 2 = R300" format for subscription
  - Show "R200 x 2 = R400" format for joining fee (if remaining > 0)
- Calculate joining fee remaining: `(200 * slots) - joining_fee_paid_total`
- Keep emergency dues shown separately (no multiplier text)

### 3. Update Payment Submit (`src/pages/PaymentSubmit.tsx`)
**Changes:**
- Fetch `membership_slots` and `joining_fee_paid_total` from profile
- Calculate `base_amount = 150 * membership_slots`
- Calculate joining fee remaining: `max(0, (200 * slots) - paid_total)`
- Include remaining joining fee in payment
- Update breakdown display with slot multiplier format
- Emergency amounts unchanged (no slot multiplier)

### 4. Update Payment Verification (`src/pages/admin/AdminVerify.tsx`)
**Changes:**
- When verifying a payment with joining_fee_amount > 0:
  - Increment `joining_fee_paid_total` by the verified amount
  - Set `joining_fee_paid = true` when `joining_fee_paid_total >= (200 * slots)`

### 5. Update Loan Request (`src/pages/LoanRequest.tsx`)
**Changes:**
- Fetch `membership_slots` from profile
- Calculate dynamic max limits:
  - Petrol: `1500 * slots` per week
  - Personal: `5000 * slots` per month
- Update UI to show slot-based limits: "Max petrol loan this week: R3,000 (2 slots)"
- Validate requested amount against slot-scaled caps

### 6. Update Admin Members (`src/pages/admin/AdminMembers.tsx`)
**Changes:**
- Fetch and display `membership_slots` for each member
- Add editable "Membership Slots" dropdown (1-5) in member card
- Show calculated values preview when slots change:
  - Weekly due: R150 x slots
  - Joining fee total: R200 x slots
  - Petrol loan max: R1,500 x slots
  - Personal loan max: R5,000 x slots
- Log slot changes to `audit_log` with action "MEMBERSHIP_SLOTS_CHANGED" and metadata `{old_slots, new_slots}`
- Display joining fee progress: "R200/R400 paid" format

### 7. Update Profile Page (`src/pages/Profile.tsx`)
**Changes:**
- Display read-only "Membership Slots: X" info
- Show joining fee status with progress: "R200 of R400 paid"

### 8. Update Financial Reports (`src/hooks/useFinancialReports.ts` and `src/components/reports/ExportButton.tsx`)
**Changes:**
- Include `membership_slots` and `joining_fee_paid_total` in member data queries
- Add columns to CSV exports:
  - Member Balances: Add "Slots" and "Joining Fee Paid" columns
  - Payments Ledger: Already includes joining_fee_amount (no change needed)

### 9. Update TypeScript Types (`src/integrations/supabase/types.ts`)
- This file auto-updates after migration runs

---

## Technical Details

### New Type Additions
```typescript
// In Dashboard and other components
interface MemberProfile {
  // ... existing fields
  membership_slots: number;
  joining_fee_paid_total: number;
}
```

### Slot Calculation Helpers (constants.ts)
```typescript
export const getJoiningFeeTotal = (slots: number) => JOINING_FEE * slots;
export const getWeeklySubscription = (slots: number) => WEEKLY_SUBSCRIPTION * slots;
export const getPetrolLoanMax = (slots: number) => PETROL_LOAN_MAX * slots;
export const getPersonalLoanMax = (slots: number) => PERSONAL_LOAN_MAX * slots;

export const getJoiningFeeRemaining = (slots: number, paidTotal: number) => 
  Math.max(0, getJoiningFeeTotal(slots) - paidTotal);
```

### Admin Slots Update with Audit Log
```typescript
const updateMemberSlots = async (memberId: string, userId: string, oldSlots: number, newSlots: number) => {
  // Update member profile
  await supabase.from('member_profiles')
    .update({ membership_slots: newSlots })
    .eq('id', memberId);
  
  // Log to audit
  await supabase.from('audit_log').insert({
    actor_user_id: currentUser.id,
    action: 'MEMBERSHIP_SLOTS_CHANGED',
    entity_type: 'member_profile',
    entity_id: memberId,
    metadata_json: { old_slots: oldSlots, new_slots: newSlots }
  });
};
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/constants.ts` | Add slot calculation helpers |
| `src/pages/Dashboard.tsx` | Fetch slots, show slot count, update dues breakdown |
| `src/pages/PaymentSubmit.tsx` | Scale base_amount, calculate joining fee remaining |
| `src/pages/LoanRequest.tsx` | Fetch slots, scale loan limits, update validation |
| `src/pages/Profile.tsx` | Display slots and joining fee progress |
| `src/pages/admin/AdminMembers.tsx` | Add slots editor, show calculated values, audit logging |
| `src/pages/admin/AdminVerify.tsx` | Increment joining_fee_paid_total on verify |
| `src/hooks/useFinancialReports.ts` | Include slots in member balance queries |
| `src/components/reports/ExportButton.tsx` | Add slots to CSV exports |
| `src/components/reports/MemberBalancesTable.tsx` | Display slots column |

---

## Migration Steps

1. Run database migration to add columns
2. Update constants with helper functions
3. Update Dashboard to display slots and scaled dues
4. Update PaymentSubmit with slot-scaled calculations
5. Update LoanRequest with slot-scaled limits
6. Update AdminMembers with slots editor and audit logging
7. Update AdminVerify for incremental joining fee tracking
8. Update Profile page with slots display
9. Update reports and exports with slots data

---

## Validation Rules

- Membership slots must be between 1 and 5 (enforced at DB level)
- Joining fee is fully paid when `joining_fee_paid_total >= 200 * slots`
- Loan amounts validated against `slots * base_max` for each type
- Emergency contributions remain fixed regardless of slots
