-- Add membership_slots and joining_fee_paid_total columns to member_profiles
ALTER TABLE member_profiles
ADD COLUMN membership_slots integer NOT NULL DEFAULT 1,
ADD COLUMN joining_fee_paid_total numeric NOT NULL DEFAULT 0;

-- Add validation constraint for membership slots (1-5)
ALTER TABLE member_profiles
ADD CONSTRAINT membership_slots_range CHECK (membership_slots >= 1 AND membership_slots <= 5);

-- Backfill joining_fee_paid_total based on current joining_fee_paid status
UPDATE member_profiles
SET joining_fee_paid_total = CASE WHEN joining_fee_paid = true THEN 200 ELSE 0 END;