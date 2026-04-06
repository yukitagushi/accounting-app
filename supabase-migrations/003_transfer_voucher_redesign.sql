-- 振替伝票テーブルのリニューアル
-- 顧客単位の取引管理 + 借方/貸方 + 入金照合 対応

-- 既存テーブルを削除して再作成
DROP TABLE IF EXISTS transfer_voucher_lines;
DROP TABLE IF EXISTS transfer_vouchers;

-- 振替伝票 (Transfer Vouchers) - 1顧客1取引 = 1レコード
CREATE TABLE transfer_vouchers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID REFERENCES branches(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  voucher_number TEXT NOT NULL DEFAULT '',
  voucher_date DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_name TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  side TEXT NOT NULL DEFAULT 'debit' CHECK (side IN ('debit', 'credit')),
  status TEXT NOT NULL DEFAULT 'unsettled' CHECK (status IN ('unsettled', 'settled')),
  linked_voucher_id UUID REFERENCES transfer_vouchers(id) ON DELETE SET NULL,
  total_amount INTEGER DEFAULT 0,
  memo TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE transfer_vouchers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users full access" ON transfer_vouchers
  FOR ALL USING (auth.role() = 'authenticated');

-- 振替伝票明細 (内訳行: 検査, 技術, 重量税, 自賠責 etc.)
CREATE TABLE transfer_voucher_lines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  voucher_id UUID REFERENCES transfer_vouchers(id) ON DELETE CASCADE,
  description TEXT NOT NULL DEFAULT '',
  amount INTEGER DEFAULT 0,
  line_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE transfer_voucher_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users full access" ON transfer_voucher_lines
  FOR ALL USING (auth.role() = 'authenticated');
