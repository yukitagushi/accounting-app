-- Migration: 001_vehicle_inspection_workflow
-- Safe to run multiple times (idempotent)

-- 1. Add columns to vehicle_inspections
ALTER TABLE public.vehicle_inspections ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id);
ALTER TABLE public.vehicle_inspections ADD COLUMN IF NOT EXISTS invoice_id uuid REFERENCES public.invoices(id);

-- 2. Create inspection_journal_entries junction table
CREATE TABLE IF NOT EXISTS public.inspection_journal_entries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  inspection_id uuid NOT NULL REFERENCES public.vehicle_inspections(id) ON DELETE CASCADE,
  journal_entry_id uuid NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  entry_purpose text NOT NULL CHECK (entry_purpose IN ('advance', 'invoice', 'payment', 'settlement')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(inspection_id, journal_entry_id)
);

-- 3. Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id uuid REFERENCES public.branches(id),
  payment_number text NOT NULL,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id),
  payment_date date NOT NULL,
  amount numeric(12,0) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank_transfer', 'credit_card', 'other')),
  description text DEFAULT '',
  journal_entry_id uuid REFERENCES public.journal_entries(id),
  created_at timestamptz DEFAULT now()
);

-- 4. Add paid_amount to invoices
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS paid_amount numeric(12,0) NOT NULL DEFAULT 0;

-- 5. Update constraints

-- Update journal_entries entry_type to include 'payment'
DO $$ BEGIN
  ALTER TABLE public.journal_entries DROP CONSTRAINT IF EXISTS journal_entries_entry_type_check;
  ALTER TABLE public.journal_entries ADD CONSTRAINT journal_entries_entry_type_check
    CHECK (entry_type IN ('normal', 'transfer', 'vehicle_inspection', 'payment'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Update invoices status to include 'partial'
DO $$ BEGIN
  ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
  ALTER TABLE public.invoices ADD CONSTRAINT invoices_status_check
    CHECK (status IN ('draft', 'sent', 'partial', 'paid', 'overdue', 'void'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 6. RLS policies for new tables
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_journal_entries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Authenticated users full access payments" ON public.payments
    FOR ALL USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users full access inspection_journal" ON public.inspection_journal_entries
    FOR ALL USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_inspection_journal ON public.inspection_journal_entries(inspection_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_invoice ON public.vehicle_inspections(invoice_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_customer ON public.vehicle_inspections(customer_id);
