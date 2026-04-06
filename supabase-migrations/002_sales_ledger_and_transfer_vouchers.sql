-- 売上台帳 (Sales Ledger)
CREATE TABLE IF NOT EXISTS sales_ledger_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID REFERENCES branches(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_name TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  quantity INTEGER DEFAULT 1,
  unit_price INTEGER DEFAULT 0,
  income_amount INTEGER DEFAULT 0,
  payment_amount INTEGER DEFAULT 0,
  memo TEXT DEFAULT '',
  line_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sales_ledger_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users full access" ON sales_ledger_entries
  FOR ALL USING (auth.role() = 'authenticated');

-- 振替伝票 (Transfer Vouchers)
CREATE TABLE IF NOT EXISTS transfer_vouchers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID REFERENCES branches(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  voucher_number TEXT NOT NULL DEFAULT '',
  voucher_date DATE NOT NULL DEFAULT CURRENT_DATE,
  memo TEXT DEFAULT '',
  total_amount INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE transfer_vouchers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users full access" ON transfer_vouchers
  FOR ALL USING (auth.role() = 'authenticated');

-- 振替伝票明細 (Transfer Voucher Lines)
CREATE TABLE IF NOT EXISTS transfer_voucher_lines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  voucher_id UUID REFERENCES transfer_vouchers(id) ON DELETE CASCADE,
  debit_account TEXT DEFAULT '',
  debit_amount INTEGER DEFAULT 0,
  credit_account TEXT DEFAULT '',
  credit_amount INTEGER DEFAULT 0,
  description TEXT DEFAULT '',
  line_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE transfer_voucher_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users full access" ON transfer_voucher_lines
  FOR ALL USING (auth.role() = 'authenticated');
