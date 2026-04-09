-- Migration: 005 - Add payment_amount to transfer_voucher_lines for partial payment tracking
-- Safe to run multiple times (idempotent)

ALTER TABLE public.transfer_voucher_lines ADD COLUMN IF NOT EXISTS payment_amount integer NOT NULL DEFAULT 0;
