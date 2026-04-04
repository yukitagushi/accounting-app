-- AutoAccount Database Schema
-- Supabase (PostgreSQL)

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ══════════════════════════════════════════════════════════════
-- BRANCHES (支店)
-- ══════════════════════════════════════════════════════════════
create table public.branches (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  code text not null unique,
  address text,
  phone text,
  created_at timestamptz default now()
);

-- ══════════════════════════════════════════════════════════════
-- PROFILES (ユーザープロフィール)
-- ══════════════════════════════════════════════════════════════
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null,
  branch_id uuid references public.branches(id),
  role text not null default 'staff' check (role in ('admin', 'manager', 'staff')),
  created_at timestamptz default now()
);

-- ══════════════════════════════════════════════════════════════
-- CUSTOMERS (顧客)
-- ══════════════════════════════════════════════════════════════
create table public.customers (
  id uuid primary key default uuid_generate_v4(),
  branch_id uuid references public.branches(id),
  customer_code text not null,
  name text not null,
  name_kana text,
  address text not null default '',
  phone text,
  fax text,
  email text,
  contact_person text,
  payment_terms text,
  notes text default '',
  vehicle_model text,
  vehicle_year text,
  vehicle_number text,
  vehicle_inspection_date text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ══════════════════════════════════════════════════════════════
-- ACCOUNTS (勘定科目)
-- ══════════════════════════════════════════════════════════════
create table public.accounts (
  id uuid primary key default uuid_generate_v4(),
  code text not null,
  name text not null,
  category text not null check (category in ('assets', 'liabilities', 'equity', 'revenue', 'expense')),
  sub_category text not null,
  is_system boolean default true,
  branch_id uuid references public.branches(id)
);

-- ══════════════════════════════════════════════════════════════
-- JOURNAL ENTRIES (仕訳)
-- ══════════════════════════════════════════════════════════════
create table public.journal_entries (
  id uuid primary key default uuid_generate_v4(),
  branch_id uuid references public.branches(id),
  entry_date date not null,
  description text not null default '',
  entry_type text not null default 'normal' check (entry_type in ('normal', 'transfer', 'vehicle_inspection')),
  status text not null default 'draft' check (status in ('draft', 'posted', 'void')),
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.journal_entry_lines (
  id uuid primary key default uuid_generate_v4(),
  journal_entry_id uuid not null references public.journal_entries(id) on delete cascade,
  account_id uuid references public.accounts(id),
  debit_amount numeric(12,0) not null default 0,
  credit_amount numeric(12,0) not null default 0,
  description text default '',
  line_order integer not null default 0
);

-- ══════════════════════════════════════════════════════════════
-- ESTIMATES (見積書)
-- ══════════════════════════════════════════════════════════════
create table public.estimates (
  id uuid primary key default uuid_generate_v4(),
  branch_id uuid references public.branches(id),
  estimate_number text not null,
  customer_name text not null,
  customer_address text default '',
  customer_code text,
  issue_date date not null,
  valid_until date not null,
  tax_mode text not null default 'exclusive' check (tax_mode in ('exclusive', 'inclusive')),
  subtotal numeric(12,0) not null default 0,
  tax_amount numeric(12,0) not null default 0,
  total numeric(12,0) not null default 0,
  discount numeric(12,0) default 0,
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'rejected')),
  notes text default '',
  vehicle_name text,
  vehicle_number text,
  mileage integer,
  first_registration text,
  next_inspection_date text,
  delivery_date text,
  delivery_category text,
  staff_name text,
  created_at timestamptz default now()
);

create table public.estimate_line_items (
  id uuid primary key default uuid_generate_v4(),
  estimate_id uuid not null references public.estimates(id) on delete cascade,
  description text not null default '',
  category text,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(12,0) not null default 0,
  tax_rate numeric(4,2) not null default 0.10,
  parts_amount numeric(12,0) default 0,
  labor_amount numeric(12,0) default 0,
  amount numeric(12,0) not null default 0,
  line_order integer not null default 0
);

-- ══════════════════════════════════════════════════════════════
-- INVOICES (請求書)
-- ══════════════════════════════════════════════════════════════
create table public.invoices (
  id uuid primary key default uuid_generate_v4(),
  branch_id uuid references public.branches(id),
  invoice_number text not null,
  estimate_id uuid references public.estimates(id),
  customer_name text not null,
  customer_address text default '',
  customer_code text,
  issue_date date not null,
  due_date date not null,
  tax_mode text not null default 'exclusive' check (tax_mode in ('exclusive', 'inclusive')),
  subtotal numeric(12,0) not null default 0,
  tax_amount numeric(12,0) not null default 0,
  total numeric(12,0) not null default 0,
  discount numeric(12,0) default 0,
  status text not null default 'draft' check (status in ('draft', 'sent', 'paid', 'overdue', 'void')),
  payment_date date,
  notes text default '',
  vehicle_name text,
  vehicle_number text,
  mileage integer,
  first_registration text,
  next_inspection_date text,
  delivery_date text,
  delivery_category text,
  staff_name text,
  created_at timestamptz default now()
);

create table public.invoice_line_items (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null default '',
  category text,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(12,0) not null default 0,
  tax_rate numeric(4,2) not null default 0.10,
  parts_amount numeric(12,0) default 0,
  labor_amount numeric(12,0) default 0,
  amount numeric(12,0) not null default 0,
  line_order integer not null default 0
);

-- ══════════════════════════════════════════════════════════════
-- VEHICLE INSPECTIONS (車検)
-- ══════════════════════════════════════════════════════════════
create table public.vehicle_inspections (
  id uuid primary key default uuid_generate_v4(),
  branch_id uuid references public.branches(id),
  customer_name text not null,
  vehicle_number text not null,
  inspection_date date not null,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'settled')),
  deposit_jibaiseki numeric(12,0) default 0,
  deposit_weight_tax numeric(12,0) default 0,
  deposit_stamp numeric(12,0) default 0,
  deposit_maintenance numeric(12,0) default 0,
  deposit_parts numeric(12,0) default 0,
  deposit_substitute_car numeric(12,0) default 0,
  deposit_other numeric(12,0) default 0,
  actual_jibaiseki numeric(12,0) default 0,
  actual_weight_tax numeric(12,0) default 0,
  actual_stamp numeric(12,0) default 0,
  actual_maintenance numeric(12,0) default 0,
  actual_parts numeric(12,0) default 0,
  actual_substitute_car numeric(12,0) default 0,
  actual_other numeric(12,0) default 0,
  total_deposit numeric(12,0) default 0,
  total_actual numeric(12,0) default 0,
  difference numeric(12,0) default 0,
  journal_entry_id uuid references public.journal_entries(id),
  created_at timestamptz default now()
);

-- ══════════════════════════════════════════════════════════════
-- CREDIT CARD TRANSACTIONS
-- ══════════════════════════════════════════════════════════════
create table public.credit_card_transactions (
  id uuid primary key default uuid_generate_v4(),
  branch_id uuid references public.branches(id),
  transaction_date date not null,
  customer_name text not null,
  gross_amount numeric(12,0) not null default 0,
  fee_rate numeric(5,3) not null default 0.032,
  fee_amount numeric(12,0) not null default 0,
  net_amount numeric(12,0) not null default 0,
  status text not null default 'pending' check (status in ('pending', 'settled')),
  settlement_date date,
  journal_entry_id uuid references public.journal_entries(id),
  created_at timestamptz default now()
);

-- ══════════════════════════════════════════════════════════════
-- APP SETTINGS
-- ══════════════════════════════════════════════════════════════
create table public.app_settings (
  id uuid primary key default uuid_generate_v4(),
  branch_id uuid references public.branches(id),
  credit_card_fee_rate numeric(5,3) default 0.032,
  default_tax_mode text default 'exclusive',
  default_tax_rate numeric(4,2) default 0.10,
  company_name text default '',
  company_address text default '',
  company_phone text default '',
  company_registration_number text default ''
);

-- ══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ══════════════════════════════════════════════════════════════
alter table public.branches enable row level security;
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.accounts enable row level security;
alter table public.journal_entries enable row level security;
alter table public.journal_entry_lines enable row level security;
alter table public.estimates enable row level security;
alter table public.estimate_line_items enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_line_items enable row level security;
alter table public.vehicle_inspections enable row level security;
alter table public.credit_card_transactions enable row level security;
alter table public.app_settings enable row level security;

-- Authenticated users can read/write all data (small team app)
create policy "Authenticated users full access" on public.branches for all using (auth.role() = 'authenticated');
create policy "Authenticated users full access" on public.profiles for all using (auth.role() = 'authenticated');
create policy "Authenticated users full access" on public.customers for all using (auth.role() = 'authenticated');
create policy "Authenticated users full access" on public.accounts for all using (auth.role() = 'authenticated');
create policy "Authenticated users full access" on public.journal_entries for all using (auth.role() = 'authenticated');
create policy "Authenticated users full access" on public.journal_entry_lines for all using (auth.role() = 'authenticated');
create policy "Authenticated users full access" on public.estimates for all using (auth.role() = 'authenticated');
create policy "Authenticated users full access" on public.estimate_line_items for all using (auth.role() = 'authenticated');
create policy "Authenticated users full access" on public.invoices for all using (auth.role() = 'authenticated');
create policy "Authenticated users full access" on public.invoice_line_items for all using (auth.role() = 'authenticated');
create policy "Authenticated users full access" on public.vehicle_inspections for all using (auth.role() = 'authenticated');
create policy "Authenticated users full access" on public.credit_card_transactions for all using (auth.role() = 'authenticated');
create policy "Authenticated users full access" on public.app_settings for all using (auth.role() = 'authenticated');

-- ══════════════════════════════════════════════════════════════
-- INDEXES
-- ══════════════════════════════════════════════════════════════
create index idx_customers_branch on public.customers(branch_id);
create index idx_customers_code on public.customers(customer_code);
create index idx_journal_entries_date on public.journal_entries(entry_date);
create index idx_journal_entries_branch on public.journal_entries(branch_id);
create index idx_estimates_date on public.estimates(issue_date);
create index idx_estimates_branch on public.estimates(branch_id);
create index idx_invoices_date on public.invoices(issue_date);
create index idx_invoices_branch on public.invoices(branch_id);
create index idx_vehicle_inspections_date on public.vehicle_inspections(inspection_date);

-- ══════════════════════════════════════════════════════════════
-- SEED DATA: Default branch
-- ══════════════════════════════════════════════════════════════
insert into public.branches (id, name, code, address, phone) values
  ('00000000-0000-0000-0000-000000000001', '本店', 'HQ', '〒028-0041 岩手県久慈市長内町', '0194-52-3955');

-- Default accounts (勘定科目)
insert into public.accounts (code, name, category, sub_category, is_system, branch_id) values
  ('1000', '現金', 'assets', '流動資産', true, '00000000-0000-0000-0000-000000000001'),
  ('1010', '普通預金', 'assets', '流動資産', true, '00000000-0000-0000-0000-000000000001'),
  ('1020', '当座預金', 'assets', '流動資産', true, '00000000-0000-0000-0000-000000000001'),
  ('1100', '売掛金', 'assets', '流動資産', true, '00000000-0000-0000-0000-000000000001'),
  ('1200', '前払金', 'assets', '流動資産', true, '00000000-0000-0000-0000-000000000001'),
  ('1300', '仮払金', 'assets', '流動資産', true, '00000000-0000-0000-0000-000000000001'),
  ('1400', '立替金', 'assets', '流動資産', true, '00000000-0000-0000-0000-000000000001'),
  ('1500', '車両運搬具', 'assets', '固定資産', true, '00000000-0000-0000-0000-000000000001'),
  ('1600', '工具器具備品', 'assets', '固定資産', true, '00000000-0000-0000-0000-000000000001'),
  ('2000', '買掛金', 'liabilities', '流動負債', true, '00000000-0000-0000-0000-000000000001'),
  ('2100', '未払金', 'liabilities', '流動負債', true, '00000000-0000-0000-0000-000000000001'),
  ('2200', '預り金', 'liabilities', '流動負債', true, '00000000-0000-0000-0000-000000000001'),
  ('2210', '車検預り金', 'liabilities', '流動負債', true, '00000000-0000-0000-0000-000000000001'),
  ('2220', '自賠責保険預り金', 'liabilities', '流動負債', true, '00000000-0000-0000-0000-000000000001'),
  ('2230', '重量税預り金', 'liabilities', '流動負債', true, '00000000-0000-0000-0000-000000000001'),
  ('2240', '印紙代預り金', 'liabilities', '流動負債', true, '00000000-0000-0000-0000-000000000001'),
  ('2300', '仮受金', 'liabilities', '流動負債', true, '00000000-0000-0000-0000-000000000001'),
  ('2400', '未払消費税', 'liabilities', '流動負債', true, '00000000-0000-0000-0000-000000000001'),
  ('3000', '資本金', 'equity', '純資産', true, '00000000-0000-0000-0000-000000000001'),
  ('3100', '繰越利益剰余金', 'equity', '純資産', true, '00000000-0000-0000-0000-000000000001'),
  ('4000', '売上高', 'revenue', '営業収益', true, '00000000-0000-0000-0000-000000000001'),
  ('4100', '整備売上', 'revenue', '営業収益', true, '00000000-0000-0000-0000-000000000001'),
  ('4200', '車検売上', 'revenue', '営業収益', true, '00000000-0000-0000-0000-000000000001'),
  ('4300', '部品売上', 'revenue', '営業収益', true, '00000000-0000-0000-0000-000000000001'),
  ('4900', '雑収入', 'revenue', '営業外収益', true, '00000000-0000-0000-0000-000000000001'),
  ('5000', '仕入高', 'expense', '売上原価', true, '00000000-0000-0000-0000-000000000001'),
  ('5100', '部品仕入', 'expense', '売上原価', true, '00000000-0000-0000-0000-000000000001'),
  ('5200', '外注費', 'expense', '売上原価', true, '00000000-0000-0000-0000-000000000001'),
  ('6000', '給料手当', 'expense', '販管費', true, '00000000-0000-0000-0000-000000000001'),
  ('6100', '法定福利費', 'expense', '販管費', true, '00000000-0000-0000-0000-000000000001'),
  ('6200', '地代家賃', 'expense', '販管費', true, '00000000-0000-0000-0000-000000000001'),
  ('6300', '水道光熱費', 'expense', '販管費', true, '00000000-0000-0000-0000-000000000001'),
  ('6400', '通信費', 'expense', '販管費', true, '00000000-0000-0000-0000-000000000001'),
  ('6500', '消耗品費', 'expense', '販管費', true, '00000000-0000-0000-0000-000000000001'),
  ('6600', '支払手数料', 'expense', '販管費', true, '00000000-0000-0000-0000-000000000001'),
  ('6700', '保険料', 'expense', '販管費', true, '00000000-0000-0000-0000-000000000001'),
  ('6800', '租税公課', 'expense', '販管費', true, '00000000-0000-0000-0000-000000000001'),
  ('6900', '減価償却費', 'expense', '販管費', true, '00000000-0000-0000-0000-000000000001'),
  ('7000', '雑費', 'expense', '販管費', true, '00000000-0000-0000-0000-000000000001');

-- App settings
insert into public.app_settings (branch_id, company_name, company_address, company_phone, company_registration_number) values
  ('00000000-0000-0000-0000-000000000001', '有限会社 竹花自工', '〒028-0041 岩手県久慈市長内町', '0194-52-3955', 'T1234567890123');

-- Sample customers
insert into public.customers (branch_id, customer_code, name, name_kana, address, phone, contact_person, payment_terms) values
  ('00000000-0000-0000-0000-000000000001', 'C-001', '盛岡いすゞモーター株式会社', 'モリオカイスズモーター', '〒020-0021 岩手県盛岡市中央通1-2-3', '019-622-1234', '佐藤 一郎', '月末締め翌月末払い'),
  ('00000000-0000-0000-0000-000000000001', 'C-002', '久慈運送株式会社', 'クジウンソウ', '〒028-0041 岩手県久慈市長内町25-10', '0194-52-1111', '田中 次郎', '月末締め翌月末払い'),
  ('00000000-0000-0000-0000-000000000001', 'C-003', '岩手日野自動車株式会社', 'イワテヒノジドウシャ', '〒020-0834 岩手県盛岡市永井15-1', '019-638-2222', '鈴木 三郎', '月末締め翌月15日払い'),
  ('00000000-0000-0000-0000-000000000001', 'C-004', '有限会社 山田建設', 'ヤマダケンセツ', '〒028-0051 岩手県久慈市川崎町5-8', '0194-53-3333', '山田 四郎', '都度払い'),
  ('00000000-0000-0000-0000-000000000001', 'C-005', '株式会社 沿岸物流', 'エンガンブツリュウ', '〒027-0038 岩手県宮古市小山田3-15', '0193-62-4444', '高橋 五郎', '月末締め翌月末払い');
