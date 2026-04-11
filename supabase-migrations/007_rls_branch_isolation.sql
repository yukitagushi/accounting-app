-- Migration: 007 - RLS branch isolation
-- CRITICAL: 各ユーザーは自分のbranch_idに属するデータのみアクセス可能
-- 未割り当て（branch_id = null）のユーザーは何も見えない
-- Safe to run multiple times (idempotent)

-- ============================================================================
-- 1. handle_new_user トリガー: 新規登録ユーザーに空のprofileを自動作成
--    （branch_idはnullなので管理者が手動で割り当てるまで何も見えない）
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role, branch_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    'staff',
    NULL  -- 未割り当て = 何も見えない
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 2. 現在のユーザーの branch_id を取得するヘルパー関数
-- ============================================================================

CREATE OR REPLACE FUNCTION public.current_user_branch_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT branch_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- ============================================================================
-- 3. 既存のゆるいポリシーを削除
-- ============================================================================

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname = 'Authenticated users full access'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- ============================================================================
-- 4. profiles: 自分のprofileのみ参照可能
-- ============================================================================

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (id = auth.uid());

-- ============================================================================
-- 5. branches: 認証済みなら全件参照可（拠点選択用）
-- ============================================================================

DROP POLICY IF EXISTS "branches_read_all_authenticated" ON public.branches;
CREATE POLICY "branches_read_all_authenticated" ON public.branches
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================================
-- 6. 支店単位のテーブル: branch_id が自分のbranch_idと一致する行のみ
-- ============================================================================

-- customers
DROP POLICY IF EXISTS "customers_branch_isolated" ON public.customers;
CREATE POLICY "customers_branch_isolated" ON public.customers
  FOR ALL
  USING (branch_id = public.current_user_branch_id())
  WITH CHECK (branch_id = public.current_user_branch_id());

-- accounts
DROP POLICY IF EXISTS "accounts_branch_isolated" ON public.accounts;
CREATE POLICY "accounts_branch_isolated" ON public.accounts
  FOR ALL
  USING (branch_id = public.current_user_branch_id() OR branch_id IS NULL)
  WITH CHECK (branch_id = public.current_user_branch_id());

-- journal_entries
DROP POLICY IF EXISTS "journal_entries_branch_isolated" ON public.journal_entries;
CREATE POLICY "journal_entries_branch_isolated" ON public.journal_entries
  FOR ALL
  USING (branch_id = public.current_user_branch_id())
  WITH CHECK (branch_id = public.current_user_branch_id());

-- journal_entry_lines (親のjournal_entriesから辿る)
DROP POLICY IF EXISTS "journal_entry_lines_via_parent" ON public.journal_entry_lines;
CREATE POLICY "journal_entry_lines_via_parent" ON public.journal_entry_lines
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.id = journal_entry_id AND je.branch_id = public.current_user_branch_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.id = journal_entry_id AND je.branch_id = public.current_user_branch_id()
  ));

-- estimates
DROP POLICY IF EXISTS "estimates_branch_isolated" ON public.estimates;
CREATE POLICY "estimates_branch_isolated" ON public.estimates
  FOR ALL
  USING (branch_id = public.current_user_branch_id())
  WITH CHECK (branch_id = public.current_user_branch_id());

-- estimate_line_items
DROP POLICY IF EXISTS "estimate_line_items_via_parent" ON public.estimate_line_items;
CREATE POLICY "estimate_line_items_via_parent" ON public.estimate_line_items
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.estimates e
    WHERE e.id = estimate_id AND e.branch_id = public.current_user_branch_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.estimates e
    WHERE e.id = estimate_id AND e.branch_id = public.current_user_branch_id()
  ));

-- invoices
DROP POLICY IF EXISTS "invoices_branch_isolated" ON public.invoices;
CREATE POLICY "invoices_branch_isolated" ON public.invoices
  FOR ALL
  USING (branch_id = public.current_user_branch_id())
  WITH CHECK (branch_id = public.current_user_branch_id());

-- invoice_line_items
DROP POLICY IF EXISTS "invoice_line_items_via_parent" ON public.invoice_line_items;
CREATE POLICY "invoice_line_items_via_parent" ON public.invoice_line_items
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_id AND i.branch_id = public.current_user_branch_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_id AND i.branch_id = public.current_user_branch_id()
  ));

-- vehicle_inspections
DROP POLICY IF EXISTS "vehicle_inspections_branch_isolated" ON public.vehicle_inspections;
CREATE POLICY "vehicle_inspections_branch_isolated" ON public.vehicle_inspections
  FOR ALL
  USING (branch_id = public.current_user_branch_id())
  WITH CHECK (branch_id = public.current_user_branch_id());

-- credit_card_transactions
DROP POLICY IF EXISTS "credit_card_transactions_branch_isolated" ON public.credit_card_transactions;
CREATE POLICY "credit_card_transactions_branch_isolated" ON public.credit_card_transactions
  FOR ALL
  USING (branch_id = public.current_user_branch_id())
  WITH CHECK (branch_id = public.current_user_branch_id());

-- app_settings
DROP POLICY IF EXISTS "app_settings_branch_isolated" ON public.app_settings;
CREATE POLICY "app_settings_branch_isolated" ON public.app_settings
  FOR ALL
  USING (branch_id = public.current_user_branch_id())
  WITH CHECK (branch_id = public.current_user_branch_id());

-- fiscal_years (if exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='fiscal_years') THEN
    DROP POLICY IF EXISTS "fiscal_years_branch_isolated" ON public.fiscal_years;
    CREATE POLICY "fiscal_years_branch_isolated" ON public.fiscal_years
      FOR ALL
      USING (branch_id = public.current_user_branch_id())
      WITH CHECK (branch_id = public.current_user_branch_id());
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- payments
DROP POLICY IF EXISTS "Authenticated users full access payments" ON public.payments;
DROP POLICY IF EXISTS "payments_branch_isolated" ON public.payments;
CREATE POLICY "payments_branch_isolated" ON public.payments
  FOR ALL
  USING (branch_id = public.current_user_branch_id())
  WITH CHECK (branch_id = public.current_user_branch_id());

-- inspection_journal_entries (親のvehicle_inspectionsから辿る)
DROP POLICY IF EXISTS "Authenticated users full access inspection_journal" ON public.inspection_journal_entries;
DROP POLICY IF EXISTS "inspection_journal_entries_via_parent" ON public.inspection_journal_entries;
CREATE POLICY "inspection_journal_entries_via_parent" ON public.inspection_journal_entries
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.vehicle_inspections vi
    WHERE vi.id = inspection_id AND vi.branch_id = public.current_user_branch_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.vehicle_inspections vi
    WHERE vi.id = inspection_id AND vi.branch_id = public.current_user_branch_id()
  ));

-- transfer_vouchers
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='transfer_vouchers') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users full access" ON public.transfer_vouchers';
    EXECUTE 'DROP POLICY IF EXISTS "transfer_vouchers_branch_isolated" ON public.transfer_vouchers';
    EXECUTE 'CREATE POLICY "transfer_vouchers_branch_isolated" ON public.transfer_vouchers
      FOR ALL
      USING (branch_id = public.current_user_branch_id())
      WITH CHECK (branch_id = public.current_user_branch_id())';
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- transfer_voucher_lines (親のtransfer_vouchersから辿る)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='transfer_voucher_lines') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users full access" ON public.transfer_voucher_lines';
    EXECUTE 'DROP POLICY IF EXISTS "transfer_voucher_lines_via_parent" ON public.transfer_voucher_lines';
    EXECUTE 'CREATE POLICY "transfer_voucher_lines_via_parent" ON public.transfer_voucher_lines
      FOR ALL
      USING (EXISTS (
        SELECT 1 FROM public.transfer_vouchers tv
        WHERE tv.id = voucher_id AND tv.branch_id = public.current_user_branch_id()
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.transfer_vouchers tv
        WHERE tv.id = voucher_id AND tv.branch_id = public.current_user_branch_id()
      ))';
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- sales_ledger_entries
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='sales_ledger_entries') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users full access" ON public.sales_ledger_entries';
    EXECUTE 'DROP POLICY IF EXISTS "sales_ledger_entries_branch_isolated" ON public.sales_ledger_entries';
    EXECUTE 'CREATE POLICY "sales_ledger_entries_branch_isolated" ON public.sales_ledger_entries
      FOR ALL
      USING (branch_id = public.current_user_branch_id())
      WITH CHECK (branch_id = public.current_user_branch_id())';
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
