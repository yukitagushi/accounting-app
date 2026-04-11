-- Migration: 006 - Add credit card payment tracking to transfer_vouchers
-- Safe to run multiple times (idempotent)

ALTER TABLE public.transfer_vouchers ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'cash';
ALTER TABLE public.transfer_vouchers ADD COLUMN IF NOT EXISTS card_brand text;
ALTER TABLE public.transfer_vouchers ADD COLUMN IF NOT EXISTS fee_rate numeric(5,4) DEFAULT 0;
ALTER TABLE public.transfer_vouchers ADD COLUMN IF NOT EXISTS fee_amount integer DEFAULT 0;

-- Add check constraint for payment_method
DO $$ BEGIN
  ALTER TABLE public.transfer_vouchers DROP CONSTRAINT IF EXISTS transfer_vouchers_payment_method_check;
  ALTER TABLE public.transfer_vouchers ADD CONSTRAINT transfer_vouchers_payment_method_check
    CHECK (payment_method IN ('cash', 'credit_card', 'bank_transfer'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
