-- 振替伝票明細に「種別」カラムを追加
-- advance = 立替金（重量税・自賠責・印紙代など、受け取り時にプラマイゼロ）
-- sales   = 売上（修理代・技術料など）

ALTER TABLE transfer_voucher_lines
  ADD COLUMN IF NOT EXISTS line_type TEXT NOT NULL DEFAULT 'sales'
  CHECK (line_type IN ('advance', 'sales'));

-- 既存明細: description に重量税/自賠責/印紙 が含まれるものを立替に更新
UPDATE transfer_voucher_lines
  SET line_type = 'advance'
  WHERE description ILIKE '%重量税%'
     OR description ILIKE '%自賠責%'
     OR description ILIKE '%印紙%';
