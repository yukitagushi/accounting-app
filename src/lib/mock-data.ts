import type {
  Branch,
  Profile,
  Account,
  Customer,
  JournalEntry,
  JournalEntryLine,
  VehicleInspection,
  Estimate,
  EstimateLineItem,
  Invoice,
  CreditCardTransaction,
} from '@/lib/types'
import { DEFAULT_ACCOUNTS } from '@/lib/constants'

// ── Branches ──────────────────────────────────────────────────────────────────

export const MOCK_BRANCHES: Branch[] = [
  { id: 'branch-1', name: '本店', code: 'HQ', address: '東京都渋谷区1-1-1', phone: '03-1234-5678', created_at: '2024-01-01T00:00:00Z' },
  { id: 'branch-2', name: '東支店', code: 'EST', address: '東京都江東区2-2-2', phone: '03-2345-6789', created_at: '2024-01-01T00:00:00Z' },
  { id: 'branch-3', name: '西支店', code: 'WST', address: '東京都杉並区3-3-3', phone: '03-3456-7890', created_at: '2024-01-01T00:00:00Z' },
]

// ── Current User ──────────────────────────────────────────────────────────────

export const MOCK_CURRENT_USER: Profile = {
  id: 'user-1',
  email: 'admin@example.com',
  display_name: '管理者 太郎',
  branch_id: 'branch-1',
  role: 'admin',
  created_at: '2024-01-01T00:00:00Z',
}

// ── Accounts ──────────────────────────────────────────────────────────────────

export const MOCK_ACCOUNTS: Account[] = DEFAULT_ACCOUNTS.map((a, i) => ({
  id: `acct-${String(i + 1).padStart(3, '0')}`,
  code: a.code,
  name: a.name,
  category: a.category as Account['category'],
  sub_category: a.sub_category,
  is_system: true,
  branch_id: 'branch-1',
}))

// ── Customers ────────────────────────────────────────────────────────────────

export const MOCK_CUSTOMERS: Customer[] = [
  {
    id: 'cust-001', branch_id: 'branch-1', customer_code: 'C-001',
    name: '盛岡いすゞモーター株式会社', name_kana: 'モリオカイスズモーター',
    address: '〒020-0021 岩手県盛岡市中央通1-2-3', phone: '019-622-1234', fax: '019-622-1235',
    email: 'info@morioka-isuzu.co.jp', contact_person: '佐藤 一郎',
    payment_terms: '月末締め翌月末払い', notes: '', created_at: '2024-01-15T00:00:00Z', updated_at: '2024-01-15T00:00:00Z',
  },
  {
    id: 'cust-002', branch_id: 'branch-1', customer_code: 'C-002',
    name: '久慈運送株式会社', name_kana: 'クジウンソウ',
    address: '〒028-0041 岩手県久慈市長内町25-10', phone: '0194-52-1111', fax: '0194-52-1112',
    email: 'info@kuji-unsou.co.jp', contact_person: '田中 次郎',
    payment_terms: '月末締め翌月末払い', notes: '大型トラック中心', created_at: '2024-02-01T00:00:00Z', updated_at: '2024-02-01T00:00:00Z',
  },
  {
    id: 'cust-003', branch_id: 'branch-1', customer_code: 'C-003',
    name: '岩手日野自動車株式会社', name_kana: 'イワテヒノジドウシャ',
    address: '〒020-0834 岩手県盛岡市永井15-1', phone: '019-638-2222',
    email: 'service@iwate-hino.co.jp', contact_person: '鈴木 三郎',
    payment_terms: '月末締め翌月15日払い', notes: '', created_at: '2024-02-15T00:00:00Z', updated_at: '2024-02-15T00:00:00Z',
  },
  {
    id: 'cust-004', branch_id: 'branch-1', customer_code: 'C-004',
    name: '有限会社 山田建設', name_kana: 'ヤマダケンセツ',
    address: '〒028-0051 岩手県久慈市川崎町5-8', phone: '0194-53-3333',
    contact_person: '山田 四郎',
    payment_terms: '都度払い', notes: 'ダンプ・重機整備', created_at: '2024-03-01T00:00:00Z', updated_at: '2024-03-01T00:00:00Z',
  },
  {
    id: 'cust-005', branch_id: 'branch-1', customer_code: 'C-005',
    name: '株式会社 沿岸物流', name_kana: 'エンガンブツリュウ',
    address: '〒027-0038 岩手県宮古市小山田3-15', phone: '0193-62-4444', fax: '0193-62-4445',
    email: 'info@engan-butsuryu.co.jp', contact_person: '高橋 五郎',
    payment_terms: '月末締め翌月末払い', notes: '冷凍車多数', created_at: '2024-03-10T00:00:00Z', updated_at: '2024-03-10T00:00:00Z',
  },
  {
    id: 'cust-006', branch_id: 'branch-2', customer_code: 'C-006',
    name: '東北急行バス株式会社', name_kana: 'トウホクキュウコウバス',
    address: '〒980-0021 宮城県仙台市青葉区中央2-6', phone: '022-265-5555',
    email: 'maintenance@tohoku-bus.co.jp', contact_person: '伊藤 六郎',
    payment_terms: '月末締め翌々月10日払い', notes: 'バス車検', created_at: '2024-04-01T00:00:00Z', updated_at: '2024-04-01T00:00:00Z',
  },
]

let _nextCustomerId = MOCK_CUSTOMERS.length + 1

export async function getCustomers(branchId?: string): Promise<Customer[]> {
  await delay()
  if (!branchId) return [...MOCK_CUSTOMERS]
  return MOCK_CUSTOMERS.filter((c) => c.branch_id === branchId)
}

export async function getCustomer(id: string): Promise<Customer | null> {
  await delay()
  return MOCK_CUSTOMERS.find((c) => c.id === id) ?? null
}

export async function searchCustomers(keyword: string): Promise<Customer[]> {
  await delay(200)
  if (!keyword.trim()) return []
  const keywords = keyword.toLowerCase().split(/\s+/)
  return MOCK_CUSTOMERS.filter((c) => {
    const searchable = [c.name, c.name_kana ?? '', c.customer_code, c.address, c.contact_person ?? '', c.phone ?? ''].join(' ').toLowerCase()
    return keywords.every((kw) => searchable.includes(kw))
  })
}

export async function createCustomer(data: Partial<Customer>): Promise<Customer> {
  await delay(500)
  const now = new Date().toISOString()
  const num = String(_nextCustomerId++).padStart(3, '0')
  const newCustomer: Customer = {
    id: `cust-${num}`,
    branch_id: data.branch_id ?? 'branch-1',
    customer_code: data.customer_code ?? `C-${num}`,
    name: data.name ?? '',
    name_kana: data.name_kana,
    address: data.address ?? '',
    phone: data.phone,
    fax: data.fax,
    email: data.email,
    contact_person: data.contact_person,
    payment_terms: data.payment_terms,
    notes: data.notes ?? '',
    created_at: now,
    updated_at: now,
  }
  MOCK_CUSTOMERS.push(newCustomer)
  return newCustomer
}

export async function updateCustomer(id: string, data: Partial<Customer>): Promise<Customer | null> {
  await delay(500)
  const idx = MOCK_CUSTOMERS.findIndex((c) => c.id === id)
  if (idx === -1) return null
  const updated: Customer = { ...MOCK_CUSTOMERS[idx], ...data, updated_at: new Date().toISOString() }
  MOCK_CUSTOMERS[idx] = updated
  return updated
}

export async function deleteCustomer(id: string): Promise<boolean> {
  await delay(300)
  const idx = MOCK_CUSTOMERS.findIndex((c) => c.id === id)
  if (idx === -1) return false
  MOCK_CUSTOMERS.splice(idx, 1)
  return true
}

function acctByCode(code: string): Account {
  const acc = MOCK_ACCOUNTS.find((a) => a.code === code)
  if (!acc) throw new Error(`Account not found: ${code}`)
  return acc
}

function makeLine(
  entryId: string,
  order: number,
  accountCode: string,
  debit: number,
  credit: number,
  memo = ''
): JournalEntryLine {
  const account = acctByCode(accountCode)
  return {
    id: `${entryId}-l${order}`,
    journal_entry_id: entryId,
    account_id: account.id,
    debit_amount: debit,
    credit_amount: credit,
    description: memo,
    line_order: order,
    account,
  }
}

// ── Journal Entries ───────────────────────────────────────────────────────────

export const MOCK_JOURNAL_ENTRIES: JournalEntry[] = [
  // 1. 車検売上（現金）- posted
  {
    id: 'je-001',
    branch_id: 'branch-1',
    entry_date: '2026-03-01',
    description: '車検売上 田中様 品川230 あ12-34',
    entry_type: 'vehicle_inspection',
    status: 'posted',
    created_by: 'user-1',
    created_at: '2026-03-01T09:00:00Z',
    updated_at: '2026-03-01T09:00:00Z',
    lines: [
      makeLine('je-001', 1, '1000', 55000, 0, '現金受取'),
      makeLine('je-001', 2, '4200', 0, 50000, '車検売上'),
      makeLine('je-001', 3, '2400', 0, 5000, '消費税'),
    ],
  },
  // 2. 車検売上（クレジット）- posted
  {
    id: 'je-002',
    branch_id: 'branch-1',
    entry_date: '2026-03-02',
    description: '車検売上 佐藤様 練馬500 い56-78',
    entry_type: 'vehicle_inspection',
    status: 'posted',
    created_by: 'user-1',
    created_at: '2026-03-02T10:00:00Z',
    updated_at: '2026-03-02T10:00:00Z',
    lines: [
      makeLine('je-002', 1, '1100', 88000, 0, 'クレジット売掛'),
      makeLine('je-002', 2, '4200', 0, 80000, '車検売上'),
      makeLine('je-002', 3, '2400', 0, 8000, '消費税'),
    ],
  },
  // 3. 部品仕入 - posted
  {
    id: 'je-003',
    branch_id: 'branch-1',
    entry_date: '2026-03-03',
    description: '部品仕入 山田商事',
    entry_type: 'normal',
    status: 'posted',
    created_by: 'user-1',
    created_at: '2026-03-03T11:00:00Z',
    updated_at: '2026-03-03T11:00:00Z',
    lines: [
      makeLine('je-003', 1, '5100', 33000, 0, '部品代'),
      makeLine('je-003', 2, '2000', 0, 33000, '山田商事'),
    ],
  },
  // 4. 給与支払 - posted
  {
    id: 'je-004',
    branch_id: 'branch-1',
    entry_date: '2026-03-25',
    description: '3月分給与支払',
    entry_type: 'transfer',
    status: 'posted',
    created_by: 'user-1',
    created_at: '2026-03-25T09:00:00Z',
    updated_at: '2026-03-25T09:00:00Z',
    lines: [
      makeLine('je-004', 1, '6000', 300000, 0, '基本給'),
      makeLine('je-004', 2, '2200', 0, 30000, '源泉所得税預り'),
      makeLine('je-004', 3, '1010', 0, 270000, '銀行振込'),
    ],
  },
  // 5. 家賃支払 - posted
  {
    id: 'je-005',
    branch_id: 'branch-1',
    entry_date: '2026-03-31',
    description: '3月分工場家賃',
    entry_type: 'normal',
    status: 'posted',
    created_by: 'user-1',
    created_at: '2026-03-31T09:00:00Z',
    updated_at: '2026-03-31T09:00:00Z',
    lines: [
      makeLine('je-005', 1, '6200', 200000, 0),
      makeLine('je-005', 2, '1010', 0, 200000, '普通預金引落'),
    ],
  },
  // 6. 水道光熱費 - posted
  {
    id: 'je-006',
    branch_id: 'branch-1',
    entry_date: '2026-03-31',
    description: '3月分電気・水道代',
    entry_type: 'normal',
    status: 'posted',
    created_by: 'user-1',
    created_at: '2026-03-31T09:30:00Z',
    updated_at: '2026-03-31T09:30:00Z',
    lines: [
      makeLine('je-006', 1, '6300', 28600, 0),
      makeLine('je-006', 2, '1010', 0, 28600),
    ],
  },
  // 7. 整備売上 - posted
  {
    id: 'je-007',
    branch_id: 'branch-1',
    entry_date: '2026-03-05',
    description: '定期点検 鈴木様',
    entry_type: 'normal',
    status: 'posted',
    created_by: 'user-1',
    created_at: '2026-03-05T14:00:00Z',
    updated_at: '2026-03-05T14:00:00Z',
    lines: [
      makeLine('je-007', 1, '1000', 16500, 0),
      makeLine('je-007', 2, '4100', 0, 15000, '整備売上'),
      makeLine('je-007', 3, '2400', 0, 1500, '消費税'),
    ],
  },
  // 8. 外注費 - posted
  {
    id: 'je-008',
    branch_id: 'branch-1',
    entry_date: '2026-03-10',
    description: '板金塗装外注 有限会社ABC',
    entry_type: 'normal',
    status: 'posted',
    created_by: 'user-1',
    created_at: '2026-03-10T11:00:00Z',
    updated_at: '2026-03-10T11:00:00Z',
    lines: [
      makeLine('je-008', 1, '5200', 55000, 0),
      makeLine('je-008', 2, '2100', 0, 55000, '有限会社ABC'),
    ],
  },
  // 9. 支払手数料 - posted
  {
    id: 'je-009',
    branch_id: 'branch-1',
    entry_date: '2026-03-15',
    description: 'クレジットカード決済手数料',
    entry_type: 'normal',
    status: 'posted',
    created_by: 'user-1',
    created_at: '2026-03-15T10:00:00Z',
    updated_at: '2026-03-15T10:00:00Z',
    lines: [
      makeLine('je-009', 1, '6600', 2640, 0),
      makeLine('je-009', 2, '1010', 0, 2640),
    ],
  },
  // 10. 消耗品費 - posted
  {
    id: 'je-010',
    branch_id: 'branch-1',
    entry_date: '2026-03-08',
    description: '事務用品・清掃用品購入',
    entry_type: 'normal',
    status: 'posted',
    created_by: 'user-1',
    created_at: '2026-03-08T13:00:00Z',
    updated_at: '2026-03-08T13:00:00Z',
    lines: [
      makeLine('je-010', 1, '6500', 5500, 0),
      makeLine('je-010', 2, '1000', 0, 5500),
    ],
  },
  // 11. 車検 - draft
  {
    id: 'je-011',
    branch_id: 'branch-1',
    entry_date: '2026-04-01',
    description: '車検売上 高橋様（予定）',
    entry_type: 'vehicle_inspection',
    status: 'draft',
    created_by: 'user-1',
    created_at: '2026-04-01T09:00:00Z',
    updated_at: '2026-04-01T09:00:00Z',
    lines: [
      makeLine('je-011', 1, '1000', 77000, 0),
      makeLine('je-011', 2, '4200', 0, 70000, '車検売上'),
      makeLine('je-011', 3, '2400', 0, 7000, '消費税'),
    ],
  },
  // 12. 仮払金精算 - transfer, posted
  {
    id: 'je-012',
    branch_id: 'branch-1',
    entry_date: '2026-03-20',
    description: '仮払金精算 出張費',
    entry_type: 'transfer',
    status: 'posted',
    created_by: 'user-1',
    created_at: '2026-03-20T15:00:00Z',
    updated_at: '2026-03-20T15:00:00Z',
    lines: [
      makeLine('je-012', 1, '6400', 5500, 0, '出張交通費'),
      makeLine('je-012', 2, '1300', 0, 5500, '仮払金精算'),
    ],
  },
  // 13. void
  {
    id: 'je-013',
    branch_id: 'branch-1',
    entry_date: '2026-03-07',
    description: '誤入力（無効）',
    entry_type: 'normal',
    status: 'void',
    created_by: 'user-1',
    created_at: '2026-03-07T10:00:00Z',
    updated_at: '2026-03-07T16:00:00Z',
    lines: [
      makeLine('je-013', 1, '1000', 10000, 0),
      makeLine('je-013', 2, '4000', 0, 10000),
    ],
  },
  // 14. 東支店 - 部品売上
  {
    id: 'je-014',
    branch_id: 'branch-2',
    entry_date: '2026-03-12',
    description: '部品販売 伊藤様',
    entry_type: 'normal',
    status: 'posted',
    created_by: 'user-1',
    created_at: '2026-03-12T11:00:00Z',
    updated_at: '2026-03-12T11:00:00Z',
    lines: [
      makeLine('je-014', 1, '1000', 22000, 0),
      makeLine('je-014', 2, '4300', 0, 20000, '部品売上'),
      makeLine('je-014', 3, '2400', 0, 2000, '消費税'),
    ],
  },
  // 15. 保険料 - posted
  {
    id: 'je-015',
    branch_id: 'branch-1',
    entry_date: '2026-03-28',
    description: '損害保険料（年払）',
    entry_type: 'normal',
    status: 'posted',
    created_by: 'user-1',
    created_at: '2026-03-28T09:00:00Z',
    updated_at: '2026-03-28T09:00:00Z',
    lines: [
      makeLine('je-015', 1, '6700', 120000, 0),
      makeLine('je-015', 2, '1010', 0, 120000),
    ],
  },
  // 16. 雑収入 - posted
  {
    id: 'je-016',
    branch_id: 'branch-1',
    entry_date: '2026-03-18',
    description: '廃材売却収入',
    entry_type: 'normal',
    status: 'posted',
    created_by: 'user-1',
    created_at: '2026-03-18T14:00:00Z',
    updated_at: '2026-03-18T14:00:00Z',
    lines: [
      makeLine('je-016', 1, '1000', 3300, 0),
      makeLine('je-016', 2, '4900', 0, 3300, '廃材売却'),
    ],
  },
  // 17. 通信費 - draft
  {
    id: 'je-017',
    branch_id: 'branch-1',
    entry_date: '2026-03-31',
    description: '3月分電話・インターネット代',
    entry_type: 'normal',
    status: 'draft',
    created_by: 'user-1',
    created_at: '2026-03-31T17:00:00Z',
    updated_at: '2026-03-31T17:00:00Z',
    lines: [
      makeLine('je-017', 1, '6400', 16500, 0),
      makeLine('je-017', 2, '2100', 0, 16500),
    ],
  },
  // 18. 車検預り金 - posted
  {
    id: 'je-018',
    branch_id: 'branch-1',
    entry_date: '2026-03-22',
    description: '車検預り金受領 中村様',
    entry_type: 'vehicle_inspection',
    status: 'posted',
    created_by: 'user-1',
    created_at: '2026-03-22T10:00:00Z',
    updated_at: '2026-03-22T10:00:00Z',
    lines: [
      makeLine('je-018', 1, '1000', 44000, 0, '車検一式預り'),
      makeLine('je-018', 2, '2210', 0, 44000, '車検預り金'),
    ],
  },
]

// ── Vehicle Inspections ───────────────────────────────────────────────────────

export const MOCK_VEHICLE_INSPECTIONS: VehicleInspection[] = [
  {
    id: 'vi-001',
    branch_id: 'branch-1',
    customer_name: '田中 太郎',
    vehicle_number: '品川 300 あ 1234',
    inspection_date: '2026-04-10',
    status: 'completed',
    deposit_jibaiseki: 25000,
    deposit_weight_tax: 32800,
    deposit_stamp: 1700,
    deposit_maintenance: 50000,
    deposit_parts: 30000,
    deposit_substitute_car: 5000,
    deposit_other: 0,
    actual_jibaiseki: 25000,
    actual_weight_tax: 32800,
    actual_stamp: 1700,
    actual_maintenance: 48000,
    actual_parts: 27500,
    actual_substitute_car: 5000,
    actual_other: 0,
    total_deposit: 144500,
    total_actual: 140000,
    difference: 4500,
    journal_entry_id: 'je-001',
    created_at: '2026-04-01T09:00:00Z',
  },
  {
    id: 'vi-002',
    branch_id: 'branch-1',
    customer_name: '鈴木 花子',
    vehicle_number: '横浜 500 い 5678',
    inspection_date: '2026-04-15',
    status: 'in_progress',
    deposit_jibaiseki: 25000,
    deposit_weight_tax: 24600,
    deposit_stamp: 1700,
    deposit_maintenance: 40000,
    deposit_parts: 20000,
    deposit_substitute_car: 0,
    deposit_other: 2000,
    actual_jibaiseki: 25000,
    actual_weight_tax: 24600,
    actual_stamp: 1700,
    actual_maintenance: 0,
    actual_parts: 0,
    actual_substitute_car: 0,
    actual_other: 0,
    total_deposit: 113300,
    total_actual: 51300,
    difference: 62000,
    created_at: '2026-04-05T10:30:00Z',
  },
  {
    id: 'vi-003',
    branch_id: 'branch-1',
    customer_name: '佐藤 一郎',
    vehicle_number: '名古屋 100 う 9012',
    inspection_date: '2026-04-20',
    status: 'pending',
    deposit_jibaiseki: 25000,
    deposit_weight_tax: 49200,
    deposit_stamp: 1700,
    deposit_maintenance: 60000,
    deposit_parts: 15000,
    deposit_substitute_car: 8000,
    deposit_other: 0,
    actual_jibaiseki: 0,
    actual_weight_tax: 0,
    actual_stamp: 0,
    actual_maintenance: 0,
    actual_parts: 0,
    actual_substitute_car: 0,
    actual_other: 0,
    total_deposit: 158900,
    total_actual: 0,
    difference: 158900,
    created_at: '2026-04-08T14:00:00Z',
  },
  {
    id: 'vi-004',
    branch_id: 'branch-1',
    customer_name: '山田 美咲',
    vehicle_number: '大阪 300 え 3456',
    inspection_date: '2026-03-28',
    status: 'settled',
    deposit_jibaiseki: 25000,
    deposit_weight_tax: 32800,
    deposit_stamp: 1700,
    deposit_maintenance: 55000,
    deposit_parts: 35000,
    deposit_substitute_car: 10000,
    deposit_other: 3000,
    actual_jibaiseki: 25000,
    actual_weight_tax: 32800,
    actual_stamp: 1700,
    actual_maintenance: 58000,
    actual_parts: 38000,
    actual_substitute_car: 10000,
    actual_other: 3500,
    total_deposit: 162500,
    total_actual: 169000,
    difference: -6500,
    journal_entry_id: 'je-002',
    created_at: '2026-03-20T11:00:00Z',
  },
  {
    id: 'vi-005',
    branch_id: 'branch-1',
    customer_name: '伊藤 健司',
    vehicle_number: '福岡 400 お 7890',
    inspection_date: '2026-04-25',
    status: 'pending',
    deposit_jibaiseki: 25000,
    deposit_weight_tax: 16400,
    deposit_stamp: 1700,
    deposit_maintenance: 30000,
    deposit_parts: 10000,
    deposit_substitute_car: 0,
    deposit_other: 0,
    actual_jibaiseki: 0,
    actual_weight_tax: 0,
    actual_stamp: 0,
    actual_maintenance: 0,
    actual_parts: 0,
    actual_substitute_car: 0,
    actual_other: 0,
    total_deposit: 83100,
    total_actual: 0,
    difference: 83100,
    created_at: '2026-04-10T09:15:00Z',
  },
]

// ── Estimates ─────────────────────────────────────────────────────────────────

export const MOCK_ESTIMATES: Estimate[] = [
  {
    id: 'est-001',
    branch_id: 'branch-1',
    estimate_number: 'EST-2026-001',
    customer_name: '鈴木 五郎',
    customer_address: '東京都新宿区1-1-1',
    customer_code: 'C-005',
    issue_date: '2026-03-01',
    valid_until: '2026-03-31',
    tax_mode: 'exclusive',
    subtotal: 85000,
    tax_amount: 8500,
    total: 93500,
    discount: 0,
    status: 'accepted',
    notes: '車検費用一式',
    vehicle_name: 'プリウス',
    vehicle_number: '新宿 500 さ 5678',
    mileage: 32100,
    first_registration: 'R2/6',
    next_inspection_date: '2028-03-01',
    delivery_date: '2026-02-25',
    delivery_category: '車検',
    staff_name: '管理者 太郎',
    created_at: '2026-03-01T09:00:00Z',
    line_items: [
      { id: 'est-001-l1', estimate_id: 'est-001', description: '車検基本料', category: '技術', quantity: 1, unit_price: 30000, tax_rate: 0.1, parts_amount: 0, labor_amount: 30000, amount: 30000, line_order: 1 },
      { id: 'est-001-l2', estimate_id: 'est-001', description: '自賠責保険', category: 'その他', quantity: 1, unit_price: 25830, tax_rate: 0, parts_amount: 0, labor_amount: 0, amount: 25830, line_order: 2 },
      { id: 'est-001-l3', estimate_id: 'est-001', description: '重量税', category: 'その他', quantity: 1, unit_price: 16400, tax_rate: 0, parts_amount: 0, labor_amount: 0, amount: 16400, line_order: 3 },
      { id: 'est-001-l4', estimate_id: 'est-001', description: '印紙代', category: 'その他', quantity: 1, unit_price: 1700, tax_rate: 0, parts_amount: 0, labor_amount: 0, amount: 1700, line_order: 4 },
      { id: 'est-001-l5', estimate_id: 'est-001', description: 'エンジンオイル交換', category: '部品', quantity: 1, unit_price: 6000, tax_rate: 0.1, parts_amount: 6000, labor_amount: 0, amount: 6000, line_order: 5 },
      { id: 'est-001-l6', estimate_id: 'est-001', description: 'エアフィルター交換', category: '部品', quantity: 1, unit_price: 5070, tax_rate: 0.1, parts_amount: 5070, labor_amount: 0, amount: 5070, line_order: 6 },
    ],
  },
  {
    id: 'est-002',
    branch_id: 'branch-1',
    estimate_number: 'EST-2026-002',
    customer_name: '渡辺 六郎',
    customer_address: '東京都品川区2-2-2',
    issue_date: '2026-03-05',
    valid_until: '2026-04-05',
    tax_mode: 'exclusive',
    subtotal: 45000,
    tax_amount: 4500,
    total: 49500,
    status: 'sent',
    notes: '定期点検',
    created_at: '2026-03-05T09:00:00Z',
  },
  {
    id: 'est-003',
    branch_id: 'branch-1',
    estimate_number: 'EST-2026-003',
    customer_name: '山本 七郎',
    customer_address: '東京都目黒区3-3-3',
    issue_date: '2026-03-10',
    valid_until: '2026-04-10',
    tax_mode: 'inclusive',
    subtotal: 120000,
    tax_amount: 10909,
    total: 130909,
    status: 'draft',
    notes: '板金修理',
    created_at: '2026-03-10T09:00:00Z',
  },
  {
    id: 'est-004',
    branch_id: 'branch-2',
    estimate_number: 'EST-2026-004',
    customer_name: '小林 八郎',
    customer_address: '東京都江東区4-4-4',
    issue_date: '2026-02-20',
    valid_until: '2026-03-20',
    tax_mode: 'exclusive',
    subtotal: 33000,
    tax_amount: 3300,
    total: 36300,
    status: 'rejected',
    notes: '部品交換',
    created_at: '2026-02-20T09:00:00Z',
  },
  {
    id: 'est-005',
    branch_id: 'branch-1',
    estimate_number: 'EST-2026-005',
    customer_name: '加藤 九郎',
    customer_address: '東京都世田谷区5-5-5',
    issue_date: '2026-03-28',
    valid_until: '2026-04-28',
    tax_mode: 'exclusive',
    subtotal: 78000,
    tax_amount: 7800,
    total: 85800,
    status: 'accepted',
    notes: 'エンジンオーバーホール',
    created_at: '2026-03-28T09:00:00Z',
  },
]

// ── Invoices ──────────────────────────────────────────────────────────────────

export const MOCK_INVOICES: Invoice[] = [
  {
    id: 'inv-001',
    branch_id: 'branch-1',
    invoice_number: 'INV-2026-001',
    estimate_id: 'est-001',
    customer_name: '田中 太郎',
    customer_address: '東京都練馬区春日町1-2-3',
    customer_code: 'C-001',
    issue_date: '2026-03-01',
    due_date: '2026-03-31',
    tax_mode: 'exclusive',
    subtotal: 144500,
    tax_amount: 9050,
    total: 153550,
    discount: 0,
    status: 'paid',
    payment_date: '2026-03-28',
    notes: 'アルファード 車検整備一式',
    vehicle_name: 'アルファード',
    vehicle_number: '練馬 300 あ 1234',
    mileage: 45230,
    first_registration: 'R3/4',
    next_inspection_date: '2028-03-01',
    delivery_date: '2026-02-28',
    delivery_category: '車検',
    staff_name: '管理者 太郎',
    created_at: '2026-03-01T09:00:00Z',
    line_items: [
      { id: 'inv-001-l1', invoice_id: 'inv-001', description: '車検基本料', category: '技術', quantity: 1, unit_price: 35000, tax_rate: 0.1, parts_amount: 0, labor_amount: 35000, amount: 35000, line_order: 1 },
      { id: 'inv-001-l2', invoice_id: 'inv-001', description: '自賠責保険（24ヶ月）', category: 'その他', quantity: 1, unit_price: 17650, tax_rate: 0, parts_amount: 0, labor_amount: 0, amount: 17650, line_order: 2 },
      { id: 'inv-001-l3', invoice_id: 'inv-001', description: '重量税', category: 'その他', quantity: 1, unit_price: 32800, tax_rate: 0, parts_amount: 0, labor_amount: 0, amount: 32800, line_order: 3 },
      { id: 'inv-001-l4', invoice_id: 'inv-001', description: '印紙代', category: 'その他', quantity: 1, unit_price: 1800, tax_rate: 0, parts_amount: 0, labor_amount: 0, amount: 1800, line_order: 4 },
      { id: 'inv-001-l5', invoice_id: 'inv-001', description: 'エンジンオイル交換', category: '部品', quantity: 1, unit_price: 8500, tax_rate: 0.1, parts_amount: 8500, labor_amount: 0, amount: 8500, line_order: 5 },
      { id: 'inv-001-l6', invoice_id: 'inv-001', description: 'オイルフィルター交換', category: '部品', quantity: 1, unit_price: 3500, tax_rate: 0.1, parts_amount: 3500, labor_amount: 0, amount: 3500, line_order: 6 },
      { id: 'inv-001-l7', invoice_id: 'inv-001', description: 'ブレーキフルード交換', category: '部品', quantity: 1, unit_price: 6500, tax_rate: 0.1, parts_amount: 6500, labor_amount: 0, amount: 6500, line_order: 7 },
      { id: 'inv-001-l8', invoice_id: 'inv-001', description: 'ワイパーゴム交換', category: '部品', quantity: 2, unit_price: 1500, tax_rate: 0.1, parts_amount: 3000, labor_amount: 0, amount: 3000, line_order: 8 },
      { id: 'inv-001-l9', invoice_id: 'inv-001', description: 'エアコンフィルター交換', category: '部品', quantity: 1, unit_price: 4750, tax_rate: 0.1, parts_amount: 4750, labor_amount: 0, amount: 4750, line_order: 9 },
      { id: 'inv-001-l10', invoice_id: 'inv-001', description: '下回り洗浄・防錆処理', category: '技術', quantity: 1, unit_price: 31000, tax_rate: 0.1, parts_amount: 0, labor_amount: 31000, amount: 31000, line_order: 10 },
    ],
  },
  {
    id: 'inv-002',
    branch_id: 'branch-1',
    invoice_number: 'INV-2026-002',
    customer_name: '鈴木 花子',
    customer_address: '東京都世田谷区上北沢4-5-6',
    issue_date: '2026-03-05',
    due_date: '2026-04-05',
    tax_mode: 'exclusive',
    subtotal: 18500,
    tax_amount: 1850,
    total: 20350,
    status: 'paid',
    payment_date: '2026-03-20',
    notes: 'プリウス オイル交換・点検',
    created_at: '2026-03-05T09:00:00Z',
    line_items: [
      { id: 'inv-002-l1', invoice_id: 'inv-002', description: 'エンジンオイル交換（0W-20）', quantity: 1, unit_price: 7500, tax_rate: 0.1, amount: 7500, line_order: 1 },
      { id: 'inv-002-l2', invoice_id: 'inv-002', description: 'オイルフィルター交換', quantity: 1, unit_price: 3000, tax_rate: 0.1, amount: 3000, line_order: 2 },
      { id: 'inv-002-l3', invoice_id: 'inv-002', description: '12ヶ月法定点検', quantity: 1, unit_price: 8000, tax_rate: 0.1, amount: 8000, line_order: 3 },
    ],
  },
  {
    id: 'inv-003',
    branch_id: 'branch-1',
    invoice_number: 'INV-2026-003',
    customer_name: '佐藤 一郎',
    customer_address: '東京都板橋区大山町7-8-9',
    issue_date: '2026-02-10',
    due_date: '2026-02-28',
    tax_mode: 'exclusive',
    subtotal: 215800,
    tax_amount: 16380,
    total: 232180,
    status: 'overdue',
    notes: 'ハイエース 車検整備+部品交換',
    created_at: '2026-02-10T09:00:00Z',
    line_items: [
      { id: 'inv-003-l1', invoice_id: 'inv-003', description: '車検基本料', quantity: 1, unit_price: 40000, tax_rate: 0.1, amount: 40000, line_order: 1 },
      { id: 'inv-003-l2', invoice_id: 'inv-003', description: '自賠責保険（24ヶ月）', quantity: 1, unit_price: 17650, tax_rate: 0, amount: 17650, line_order: 2 },
      { id: 'inv-003-l3', invoice_id: 'inv-003', description: '重量税', quantity: 1, unit_price: 49200, tax_rate: 0, amount: 49200, line_order: 3 },
      { id: 'inv-003-l4', invoice_id: 'inv-003', description: '印紙代', quantity: 1, unit_price: 1800, tax_rate: 0, amount: 1800, line_order: 4 },
      { id: 'inv-003-l5', invoice_id: 'inv-003', description: 'ブレーキパッド交換（フロント）', quantity: 1, unit_price: 25000, tax_rate: 0.1, amount: 25000, line_order: 5 },
      { id: 'inv-003-l6', invoice_id: 'inv-003', description: 'ブレーキパッド交換（リア）', quantity: 1, unit_price: 22000, tax_rate: 0.1, amount: 22000, line_order: 6 },
      { id: 'inv-003-l7', invoice_id: 'inv-003', description: 'タイヤ交換（195/80R15）', quantity: 4, unit_price: 12500, tax_rate: 0.1, amount: 50000, line_order: 7 },
      { id: 'inv-003-l8', invoice_id: 'inv-003', description: 'エンジンオイル交換', quantity: 1, unit_price: 6500, tax_rate: 0.1, amount: 6500, line_order: 8 },
      { id: 'inv-003-l9', invoice_id: 'inv-003', description: 'LLC交換', quantity: 1, unit_price: 3650, tax_rate: 0.1, amount: 3650, line_order: 9 },
    ],
  },
  {
    id: 'inv-004',
    branch_id: 'branch-1',
    invoice_number: 'INV-2026-004',
    customer_name: '高橋 美咲',
    customer_address: '東京都杉並区荻窪2-3-4',
    issue_date: '2026-03-10',
    due_date: '2026-04-10',
    tax_mode: 'exclusive',
    subtotal: 68000,
    tax_amount: 6800,
    total: 74800,
    status: 'sent',
    notes: 'N-BOX タイヤ交換+アライメント調整',
    created_at: '2026-03-10T09:00:00Z',
    line_items: [
      { id: 'inv-004-l1', invoice_id: 'inv-004', description: 'タイヤ交換（155/65R14）', quantity: 4, unit_price: 8500, tax_rate: 0.1, amount: 34000, line_order: 1 },
      { id: 'inv-004-l2', invoice_id: 'inv-004', description: 'タイヤ組替・バランス調整', quantity: 4, unit_price: 3000, tax_rate: 0.1, amount: 12000, line_order: 2 },
      { id: 'inv-004-l3', invoice_id: 'inv-004', description: 'アライメント調整（4輪）', quantity: 1, unit_price: 15000, tax_rate: 0.1, amount: 15000, line_order: 3 },
      { id: 'inv-004-l4', invoice_id: 'inv-004', description: 'タイヤ廃棄処理費', quantity: 4, unit_price: 500, tax_rate: 0.1, amount: 2000, line_order: 4 },
      { id: 'inv-004-l5', invoice_id: 'inv-004', description: 'エアバルブ交換', quantity: 4, unit_price: 1250, tax_rate: 0.1, amount: 5000, line_order: 5 },
    ],
  },
  {
    id: 'inv-005',
    branch_id: 'branch-1',
    invoice_number: 'INV-2026-005',
    customer_name: '渡辺 健太',
    customer_address: '東京都中野区新井5-6-7',
    issue_date: '2026-03-15',
    due_date: '2026-04-15',
    tax_mode: 'exclusive',
    subtotal: 352000,
    tax_amount: 35200,
    total: 387200,
    status: 'sent',
    notes: 'クラウン エンジンオーバーホール',
    created_at: '2026-03-15T09:00:00Z',
    line_items: [
      { id: 'inv-005-l1', invoice_id: 'inv-005', description: 'エンジンオーバーホール工賃', quantity: 1, unit_price: 180000, tax_rate: 0.1, amount: 180000, line_order: 1 },
      { id: 'inv-005-l2', invoice_id: 'inv-005', description: 'ガスケットセット', quantity: 1, unit_price: 45000, tax_rate: 0.1, amount: 45000, line_order: 2 },
      { id: 'inv-005-l3', invoice_id: 'inv-005', description: 'ピストンリング', quantity: 4, unit_price: 8000, tax_rate: 0.1, amount: 32000, line_order: 3 },
      { id: 'inv-005-l4', invoice_id: 'inv-005', description: 'タイミングベルト交換', quantity: 1, unit_price: 35000, tax_rate: 0.1, amount: 35000, line_order: 4 },
      { id: 'inv-005-l5', invoice_id: 'inv-005', description: 'ウォーターポンプ交換', quantity: 1, unit_price: 28000, tax_rate: 0.1, amount: 28000, line_order: 5 },
      { id: 'inv-005-l6', invoice_id: 'inv-005', description: 'エンジンオイル交換', quantity: 1, unit_price: 8000, tax_rate: 0.1, amount: 8000, line_order: 6 },
      { id: 'inv-005-l7', invoice_id: 'inv-005', description: 'LLC交換', quantity: 1, unit_price: 4000, tax_rate: 0.1, amount: 4000, line_order: 7 },
      { id: 'inv-005-l8', invoice_id: 'inv-005', description: 'スパークプラグ交換', quantity: 4, unit_price: 5000, tax_rate: 0.1, amount: 20000, line_order: 8 },
    ],
  },
  {
    id: 'inv-006',
    branch_id: 'branch-1',
    invoice_number: 'INV-2026-006',
    customer_name: '山田 義男',
    customer_address: '東京都足立区竹の塚3-4-5',
    issue_date: '2026-03-18',
    due_date: '2026-04-18',
    tax_mode: 'exclusive',
    subtotal: 95000,
    tax_amount: 9500,
    total: 104500,
    status: 'paid',
    payment_date: '2026-04-01',
    notes: 'セレナ エアコン修理',
    created_at: '2026-03-18T09:00:00Z',
    line_items: [
      { id: 'inv-006-l1', invoice_id: 'inv-006', description: 'エアコンコンプレッサー交換', quantity: 1, unit_price: 55000, tax_rate: 0.1, amount: 55000, line_order: 1 },
      { id: 'inv-006-l2', invoice_id: 'inv-006', description: 'エアコンガス充填', quantity: 1, unit_price: 8000, tax_rate: 0.1, amount: 8000, line_order: 2 },
      { id: 'inv-006-l3', invoice_id: 'inv-006', description: 'エアコン配管洗浄', quantity: 1, unit_price: 12000, tax_rate: 0.1, amount: 12000, line_order: 3 },
      { id: 'inv-006-l4', invoice_id: 'inv-006', description: 'エアコン修理工賃', quantity: 1, unit_price: 20000, tax_rate: 0.1, amount: 20000, line_order: 4 },
    ],
  },
  {
    id: 'inv-007',
    branch_id: 'branch-1',
    invoice_number: 'INV-2026-007',
    customer_name: '中村 浩二',
    customer_address: '東京都豊島区池袋6-7-8',
    issue_date: '2026-03-20',
    due_date: '2026-04-20',
    tax_mode: 'exclusive',
    subtotal: 128500,
    tax_amount: 7850,
    total: 136350,
    status: 'sent',
    notes: 'ヴォクシー 車検整備',
    created_at: '2026-03-20T09:00:00Z',
    line_items: [
      { id: 'inv-007-l1', invoice_id: 'inv-007', description: '車検基本料', quantity: 1, unit_price: 35000, tax_rate: 0.1, amount: 35000, line_order: 1 },
      { id: 'inv-007-l2', invoice_id: 'inv-007', description: '自賠責保険（24ヶ月）', quantity: 1, unit_price: 17650, tax_rate: 0, amount: 17650, line_order: 2 },
      { id: 'inv-007-l3', invoice_id: 'inv-007', description: '重量税', quantity: 1, unit_price: 32800, tax_rate: 0, amount: 32800, line_order: 3 },
      { id: 'inv-007-l4', invoice_id: 'inv-007', description: '印紙代', quantity: 1, unit_price: 1800, tax_rate: 0, amount: 1800, line_order: 4 },
      { id: 'inv-007-l5', invoice_id: 'inv-007', description: 'エンジンオイル交換', quantity: 1, unit_price: 7500, tax_rate: 0.1, amount: 7500, line_order: 5 },
      { id: 'inv-007-l6', invoice_id: 'inv-007', description: 'ブレーキフルード交換', quantity: 1, unit_price: 6500, tax_rate: 0.1, amount: 6500, line_order: 6 },
      { id: 'inv-007-l7', invoice_id: 'inv-007', description: 'エアフィルター交換', quantity: 1, unit_price: 4500, tax_rate: 0.1, amount: 4500, line_order: 7 },
      { id: 'inv-007-l8', invoice_id: 'inv-007', description: 'バッテリー交換', quantity: 1, unit_price: 22750, tax_rate: 0.1, amount: 22750, line_order: 8 },
    ],
  },
  {
    id: 'inv-008',
    branch_id: 'branch-1',
    invoice_number: 'INV-2026-008',
    customer_name: '小林 さとみ',
    customer_address: '東京都目黒区自由が丘8-9-10',
    issue_date: '2026-03-22',
    due_date: '2026-04-22',
    tax_mode: 'exclusive',
    subtotal: 158900,
    tax_amount: 15890,
    total: 174790,
    status: 'draft',
    notes: 'フィット 板金塗装修理',
    created_at: '2026-03-22T09:00:00Z',
    line_items: [
      { id: 'inv-008-l1', invoice_id: 'inv-008', description: '板金修理（右フロントフェンダー）', quantity: 1, unit_price: 45000, tax_rate: 0.1, amount: 45000, line_order: 1 },
      { id: 'inv-008-l2', invoice_id: 'inv-008', description: '塗装（右フロントフェンダー）', quantity: 1, unit_price: 38000, tax_rate: 0.1, amount: 38000, line_order: 2 },
      { id: 'inv-008-l3', invoice_id: 'inv-008', description: '板金修理（右ドア）', quantity: 1, unit_price: 35000, tax_rate: 0.1, amount: 35000, line_order: 3 },
      { id: 'inv-008-l4', invoice_id: 'inv-008', description: '塗装（右ドア）', quantity: 1, unit_price: 32000, tax_rate: 0.1, amount: 32000, line_order: 4 },
      { id: 'inv-008-l5', invoice_id: 'inv-008', description: '部材代（塗料・パテ等）', quantity: 1, unit_price: 8900, tax_rate: 0.1, amount: 8900, line_order: 5 },
    ],
  },
  {
    id: 'inv-009',
    branch_id: 'branch-2',
    invoice_number: 'INV-2026-009',
    customer_name: '伊藤 三郎',
    customer_address: '東京都江東区豊洲1-2-3',
    issue_date: '2026-03-16',
    due_date: '2026-04-16',
    tax_mode: 'exclusive',
    subtotal: 81430,
    tax_amount: 8143,
    total: 89573,
    status: 'sent',
    notes: 'ジムニー 車検整備',
    created_at: '2026-03-16T09:00:00Z',
    line_items: [
      { id: 'inv-009-l1', invoice_id: 'inv-009', description: '車検基本料', quantity: 1, unit_price: 28000, tax_rate: 0.1, amount: 28000, line_order: 1 },
      { id: 'inv-009-l2', invoice_id: 'inv-009', description: '自賠責保険（24ヶ月）', quantity: 1, unit_price: 17650, tax_rate: 0, amount: 17650, line_order: 2 },
      { id: 'inv-009-l3', invoice_id: 'inv-009', description: '重量税', quantity: 1, unit_price: 6600, tax_rate: 0, amount: 6600, line_order: 3 },
      { id: 'inv-009-l4', invoice_id: 'inv-009', description: '印紙代', quantity: 1, unit_price: 1700, tax_rate: 0, amount: 1700, line_order: 4 },
      { id: 'inv-009-l5', invoice_id: 'inv-009', description: 'エンジンオイル交換', quantity: 1, unit_price: 5500, tax_rate: 0.1, amount: 5500, line_order: 5 },
      { id: 'inv-009-l6', invoice_id: 'inv-009', description: 'オイルフィルター交換', quantity: 1, unit_price: 2500, tax_rate: 0.1, amount: 2500, line_order: 6 },
      { id: 'inv-009-l7', invoice_id: 'inv-009', description: 'ワイパーゴム交換', quantity: 2, unit_price: 1200, tax_rate: 0.1, amount: 2400, line_order: 7 },
      { id: 'inv-009-l8', invoice_id: 'inv-009', description: 'ブレーキ清掃・調整', quantity: 1, unit_price: 8000, tax_rate: 0.1, amount: 8000, line_order: 8 },
      { id: 'inv-009-l9', invoice_id: 'inv-009', description: 'エアクリーナー交換', quantity: 1, unit_price: 3080, tax_rate: 0.1, amount: 3080, line_order: 9 },
      { id: 'inv-009-l10', invoice_id: 'inv-009', description: 'ヘッドライトバルブ交換', quantity: 2, unit_price: 2500, tax_rate: 0.1, amount: 5000, line_order: 10 },
    ],
  },
  {
    id: 'inv-010',
    branch_id: 'branch-1',
    invoice_number: 'INV-2026-010',
    customer_name: '加藤 九郎',
    customer_address: '東京都世田谷区三軒茶屋5-5-5',
    issue_date: '2026-03-25',
    due_date: '2026-04-25',
    tax_mode: 'exclusive',
    subtotal: 42000,
    tax_amount: 4200,
    total: 46200,
    status: 'draft',
    notes: 'ワゴンR バッテリー+ベルト交換',
    created_at: '2026-03-25T09:00:00Z',
    line_items: [
      { id: 'inv-010-l1', invoice_id: 'inv-010', description: 'バッテリー交換（M-42）', quantity: 1, unit_price: 15000, tax_rate: 0.1, amount: 15000, line_order: 1 },
      { id: 'inv-010-l2', invoice_id: 'inv-010', description: 'ファンベルト交換', quantity: 1, unit_price: 8000, tax_rate: 0.1, amount: 8000, line_order: 2 },
      { id: 'inv-010-l3', invoice_id: 'inv-010', description: 'エアコンベルト交換', quantity: 1, unit_price: 7000, tax_rate: 0.1, amount: 7000, line_order: 3 },
      { id: 'inv-010-l4', invoice_id: 'inv-010', description: '交換工賃', quantity: 1, unit_price: 12000, tax_rate: 0.1, amount: 12000, line_order: 4 },
    ],
  },
  {
    id: 'inv-011',
    branch_id: 'branch-1',
    invoice_number: 'INV-2026-011',
    customer_name: '吉田 裕子',
    customer_address: '東京都新宿区高田馬場2-3-4',
    issue_date: '2026-03-28',
    due_date: '2026-04-28',
    tax_mode: 'exclusive',
    subtotal: 185000,
    tax_amount: 12300,
    total: 197300,
    status: 'sent',
    notes: 'ノア 車検整備+部品交換',
    created_at: '2026-03-28T09:00:00Z',
    line_items: [
      { id: 'inv-011-l1', invoice_id: 'inv-011', description: '車検基本料', quantity: 1, unit_price: 35000, tax_rate: 0.1, amount: 35000, line_order: 1 },
      { id: 'inv-011-l2', invoice_id: 'inv-011', description: '自賠責保険（24ヶ月）', quantity: 1, unit_price: 17650, tax_rate: 0, amount: 17650, line_order: 2 },
      { id: 'inv-011-l3', invoice_id: 'inv-011', description: '重量税', quantity: 1, unit_price: 32800, tax_rate: 0, amount: 32800, line_order: 3 },
      { id: 'inv-011-l4', invoice_id: 'inv-011', description: '印紙代', quantity: 1, unit_price: 1800, tax_rate: 0, amount: 1800, line_order: 4 },
      { id: 'inv-011-l5', invoice_id: 'inv-011', description: 'ブレーキパッド交換（フロント）', quantity: 1, unit_price: 22000, tax_rate: 0.1, amount: 22000, line_order: 5 },
      { id: 'inv-011-l6', invoice_id: 'inv-011', description: 'ブレーキディスクローター研磨', quantity: 2, unit_price: 8000, tax_rate: 0.1, amount: 16000, line_order: 6 },
      { id: 'inv-011-l7', invoice_id: 'inv-011', description: 'エンジンオイル交換', quantity: 1, unit_price: 7500, tax_rate: 0.1, amount: 7500, line_order: 7 },
      { id: 'inv-011-l8', invoice_id: 'inv-011', description: 'ATF交換', quantity: 1, unit_price: 15000, tax_rate: 0.1, amount: 15000, line_order: 8 },
      { id: 'inv-011-l9', invoice_id: 'inv-011', description: '部材代（ガスケット・Oリング等）', quantity: 1, unit_price: 3250, tax_rate: 0.1, amount: 3250, line_order: 9 },
    ],
  },
  {
    id: 'inv-012',
    branch_id: 'branch-1',
    invoice_number: 'INV-2026-012',
    customer_name: '松本 大輔',
    customer_address: '東京都品川区五反田4-5-6',
    issue_date: '2026-03-30',
    due_date: '2026-04-30',
    tax_mode: 'exclusive',
    subtotal: 28000,
    tax_amount: 2800,
    total: 30800,
    status: 'draft',
    notes: 'スイフト 定期点検・オイル交換',
    created_at: '2026-03-30T09:00:00Z',
    line_items: [
      { id: 'inv-012-l1', invoice_id: 'inv-012', description: '12ヶ月法定点検', quantity: 1, unit_price: 12000, tax_rate: 0.1, amount: 12000, line_order: 1 },
      { id: 'inv-012-l2', invoice_id: 'inv-012', description: 'エンジンオイル交換（5W-30）', quantity: 1, unit_price: 6000, tax_rate: 0.1, amount: 6000, line_order: 2 },
      { id: 'inv-012-l3', invoice_id: 'inv-012', description: 'オイルフィルター交換', quantity: 1, unit_price: 2500, tax_rate: 0.1, amount: 2500, line_order: 3 },
      { id: 'inv-012-l4', invoice_id: 'inv-012', description: 'ウォッシャー液補充', quantity: 1, unit_price: 500, tax_rate: 0.1, amount: 500, line_order: 4 },
      { id: 'inv-012-l5', invoice_id: 'inv-012', description: 'タイヤ空気圧調整・点検', quantity: 1, unit_price: 0, tax_rate: 0.1, amount: 0, line_order: 5 },
      { id: 'inv-012-l6', invoice_id: 'inv-012', description: 'ワイパーゴム交換', quantity: 2, unit_price: 1500, tax_rate: 0.1, amount: 3000, line_order: 6 },
      { id: 'inv-012-l7', invoice_id: 'inv-012', description: 'エアコンフィルター交換', quantity: 1, unit_price: 4000, tax_rate: 0.1, amount: 4000, line_order: 7 },
    ],
  },
]

// ── Credit Card Transactions ──────────────────────────────────────────────────

export const MOCK_CREDIT_CARD_TRANSACTIONS: CreditCardTransaction[] = [
  {
    id: 'cc-001',
    branch_id: 'branch-1',
    transaction_date: '2026-04-01',
    customer_name: '田中 太郎',
    gross_amount: 144500,
    fee_rate: 0.032,
    fee_amount: 4624,
    net_amount: 139876,
    status: 'settled',
    settlement_date: '2026-04-05',
    journal_entry_id: 'je-003',
    created_at: '2026-04-01T09:30:00Z',
  },
  {
    id: 'cc-002',
    branch_id: 'branch-1',
    transaction_date: '2026-04-03',
    customer_name: '高橋 良子',
    gross_amount: 88000,
    fee_rate: 0.032,
    fee_amount: 2816,
    net_amount: 85184,
    status: 'settled',
    settlement_date: '2026-04-07',
    created_at: '2026-04-03T14:00:00Z',
  },
  {
    id: 'cc-003',
    branch_id: 'branch-1',
    transaction_date: '2026-04-08',
    customer_name: '中村 浩二',
    gross_amount: 220000,
    fee_rate: 0.032,
    fee_amount: 7040,
    net_amount: 212960,
    status: 'pending',
    created_at: '2026-04-08T11:00:00Z',
  },
  {
    id: 'cc-004',
    branch_id: 'branch-1',
    transaction_date: '2026-04-10',
    customer_name: '小林 さとみ',
    gross_amount: 158900,
    fee_rate: 0.032,
    fee_amount: 5085,
    net_amount: 153815,
    status: 'pending',
    created_at: '2026-04-10T16:30:00Z',
  },
  {
    id: 'cc-005',
    branch_id: 'branch-1',
    transaction_date: '2026-04-12',
    customer_name: '渡辺 健太',
    gross_amount: 77000,
    fee_rate: 0.032,
    fee_amount: 2464,
    net_amount: 74536,
    status: 'pending',
    created_at: '2026-04-12T10:00:00Z',
  },
]

// ── Trial Balance ─────────────────────────────────────────────────────────────

export interface TrialBalanceRow {
  account_id: string
  account_code: string
  account_name: string
  category: string
  sub_category: string
  debit_balance: number
  credit_balance: number
}

export function getMockTrialBalance(): TrialBalanceRow[] {
  return [
    { account_id: 'acct-001', account_code: '1000', account_name: '現金', category: 'assets', sub_category: '流動資産', debit_balance: 250000, credit_balance: 0 },
    { account_id: 'acct-002', account_code: '1010', account_name: '普通預金', category: 'assets', sub_category: '流動資産', debit_balance: 3500000, credit_balance: 0 },
    { account_id: 'acct-003', account_code: '1100', account_name: '売掛金', category: 'assets', sub_category: '流動資産', debit_balance: 880000, credit_balance: 0 },
    { account_id: 'acct-004', account_code: '1500', account_name: '車両運搬具', category: 'assets', sub_category: '固定資産', debit_balance: 2000000, credit_balance: 0 },
    { account_id: 'acct-005', account_code: '2000', account_name: '買掛金', category: 'liabilities', sub_category: '流動負債', debit_balance: 0, credit_balance: 450000 },
    { account_id: 'acct-006', account_code: '2100', account_name: '未払金', category: 'liabilities', sub_category: '流動負債', debit_balance: 0, credit_balance: 180000 },
    { account_id: 'acct-007', account_code: '2200', account_name: '預り金', category: 'liabilities', sub_category: '流動負債', debit_balance: 0, credit_balance: 320000 },
    { account_id: 'acct-008', account_code: '3000', account_name: '資本金', category: 'equity', sub_category: '純資産', debit_balance: 0, credit_balance: 5000000 },
    { account_id: 'acct-009', account_code: '3100', account_name: '繰越利益剰余金', category: 'equity', sub_category: '純資産', debit_balance: 0, credit_balance: 680000 },
    { account_id: 'acct-010', account_code: '4000', account_name: '売上高', category: 'revenue', sub_category: '営業収益', debit_balance: 0, credit_balance: 1200000 },
    { account_id: 'acct-011', account_code: '4100', account_name: '整備売上', category: 'revenue', sub_category: '営業収益', debit_balance: 0, credit_balance: 880000 },
    { account_id: 'acct-012', account_code: '4200', account_name: '車検売上', category: 'revenue', sub_category: '営業収益', debit_balance: 0, credit_balance: 650000 },
    { account_id: 'acct-013', account_code: '5000', account_name: '仕入高', category: 'expense', sub_category: '売上原価', debit_balance: 580000, credit_balance: 0 },
    { account_id: 'acct-014', account_code: '6000', account_name: '給料手当', category: 'expense', sub_category: '販管費', debit_balance: 420000, credit_balance: 0 },
    { account_id: 'acct-015', account_code: '6200', account_name: '地代家賃', category: 'expense', sub_category: '販管費', debit_balance: 150000, credit_balance: 0 },
    { account_id: 'acct-016', account_code: '6300', account_name: '水道光熱費', category: 'expense', sub_category: '販管費', debit_balance: 48000, credit_balance: 0 },
    { account_id: 'acct-017', account_code: '6500', account_name: '消耗品費', category: 'expense', sub_category: '販管費', debit_balance: 32000, credit_balance: 0 },
    { account_id: 'acct-018', account_code: '6600', account_name: '支払手数料', category: 'expense', sub_category: '販管費', debit_balance: 24000, credit_balance: 0 },
  ]
}

// ── Legacy sync helpers (kept for backwards compatibility) ────────────────────

export function getMockVehicleInspections(): VehicleInspection[] {
  return MOCK_VEHICLE_INSPECTIONS
}

export function getMockVehicleInspectionById(id: string): VehicleInspection | undefined {
  return MOCK_VEHICLE_INSPECTIONS.find((vi) => vi.id === id)
}

export function getMockCreditCardTransactions(): CreditCardTransaction[] {
  return MOCK_CREDIT_CARD_TRANSACTIONS
}

export function getMockAccounts(): Account[] {
  return MOCK_ACCOUNTS
}

export function getMockJournalEntries(): JournalEntry[] {
  return MOCK_JOURNAL_ENTRIES
}

// ── Async API simulation ──────────────────────────────────────────────────────

function delay(ms = 300): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function getBranches(): Promise<Branch[]> {
  await delay()
  return [...MOCK_BRANCHES]
}

export async function getAccounts(branchId?: string): Promise<Account[]> {
  await delay()
  if (!branchId) return [...MOCK_ACCOUNTS]
  return MOCK_ACCOUNTS.map((a) => ({ ...a, branch_id: branchId }))
}

export async function getJournalEntries(branchId?: string): Promise<JournalEntry[]> {
  await delay()
  if (!branchId) return [...MOCK_JOURNAL_ENTRIES]
  return MOCK_JOURNAL_ENTRIES.filter((e) => e.branch_id === branchId)
}

export async function getJournalEntry(id: string): Promise<JournalEntry | null> {
  await delay()
  return MOCK_JOURNAL_ENTRIES.find((e) => e.id === id) ?? null
}

let _nextEntryId = MOCK_JOURNAL_ENTRIES.length + 1

export async function createJournalEntry(entry: Partial<JournalEntry>): Promise<JournalEntry> {
  await delay(500)
  const now = new Date().toISOString()
  const newEntry: JournalEntry = {
    id: `je-${String(_nextEntryId++).padStart(3, '0')}`,
    branch_id: entry.branch_id ?? 'branch-1',
    entry_date: entry.entry_date ?? now.slice(0, 10),
    description: entry.description ?? '',
    entry_type: entry.entry_type ?? 'normal',
    status: entry.status ?? 'draft',
    created_by: 'user-1',
    created_at: now,
    updated_at: now,
    lines: entry.lines ?? [],
  }
  MOCK_JOURNAL_ENTRIES.push(newEntry)
  return newEntry
}

export async function updateJournalEntry(id: string, entry: Partial<JournalEntry>): Promise<JournalEntry | null> {
  await delay(500)
  const idx = MOCK_JOURNAL_ENTRIES.findIndex((e) => e.id === id)
  if (idx === -1) return null
  const updated: JournalEntry = {
    ...MOCK_JOURNAL_ENTRIES[idx],
    ...entry,
    updated_at: new Date().toISOString(),
  }
  MOCK_JOURNAL_ENTRIES[idx] = updated
  return updated
}

export async function voidJournalEntry(id: string): Promise<JournalEntry | null> {
  return updateJournalEntry(id, { status: 'void' })
}

export async function getVehicleInspections(branchId?: string): Promise<VehicleInspection[]> {
  await delay()
  if (!branchId) return [...MOCK_VEHICLE_INSPECTIONS]
  return MOCK_VEHICLE_INSPECTIONS.filter((v) => v.branch_id === branchId)
}

export async function getEstimates(branchId?: string): Promise<Estimate[]> {
  await delay()
  if (!branchId) return [...MOCK_ESTIMATES]
  return MOCK_ESTIMATES.filter((e) => e.branch_id === branchId)
}

export async function getInvoices(branchId?: string): Promise<Invoice[]> {
  await delay()
  if (!branchId) return [...MOCK_INVOICES]
  return MOCK_INVOICES.filter((i) => i.branch_id === branchId)
}

export async function getCreditCardTransactions(branchId?: string): Promise<CreditCardTransaction[]> {
  await delay()
  if (!branchId) return [...MOCK_CREDIT_CARD_TRANSACTIONS]
  return MOCK_CREDIT_CARD_TRANSACTIONS.filter((t) => t.branch_id === branchId)
}

export async function getEstimate(id: string): Promise<Estimate | null> {
  await delay()
  return MOCK_ESTIMATES.find((e) => e.id === id) ?? null
}

let _nextEstimateId = MOCK_ESTIMATES.length + 1

export async function createEstimate(data: Partial<Estimate>): Promise<Estimate> {
  await delay(500)
  const now = new Date().toISOString()
  const num = String(_nextEstimateId++).padStart(3, '0')
  const newEstimate: Estimate = {
    id: `est-${num}`,
    branch_id: data.branch_id ?? 'branch-1',
    estimate_number: data.estimate_number ?? `EST-${new Date().getFullYear()}-${num}`,
    customer_name: data.customer_name ?? '',
    customer_address: data.customer_address ?? '',
    issue_date: data.issue_date ?? now.slice(0, 10),
    valid_until: data.valid_until ?? now.slice(0, 10),
    tax_mode: data.tax_mode ?? 'exclusive',
    subtotal: data.subtotal ?? 0,
    tax_amount: data.tax_amount ?? 0,
    total: data.total ?? 0,
    status: data.status ?? 'draft',
    notes: data.notes ?? '',
    created_at: now,
    line_items: data.line_items ?? [],
  }
  MOCK_ESTIMATES.push(newEstimate)
  return newEstimate
}

export async function updateEstimate(id: string, data: Partial<Estimate>): Promise<Estimate | null> {
  await delay(500)
  const idx = MOCK_ESTIMATES.findIndex((e) => e.id === id)
  if (idx === -1) return null
  const updated: Estimate = { ...MOCK_ESTIMATES[idx], ...data }
  MOCK_ESTIMATES[idx] = updated
  return updated
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  await delay()
  return MOCK_INVOICES.find((i) => i.id === id) ?? null
}

export async function searchInvoices(keyword: string): Promise<Invoice[]> {
  await delay(100)
  if (!keyword.trim()) return []
  const keywords = keyword.trim().split(/\s+/)
  return MOCK_INVOICES.filter((inv) => {
    const searchableText = [
      inv.customer_name,
      inv.invoice_number,
      inv.notes,
      ...(inv.line_items?.map((l) => l.description) ?? []),
    ].join(' ')
    return keywords.every((kw) => searchableText.includes(kw))
  })
}

let _nextInvoiceId = MOCK_INVOICES.length + 1

export async function createInvoice(data: Partial<Invoice>): Promise<Invoice> {
  await delay(500)
  const now = new Date().toISOString()
  const num = String(_nextInvoiceId++).padStart(3, '0')
  const newInvoice: Invoice = {
    id: `inv-${num}`,
    branch_id: data.branch_id ?? 'branch-1',
    invoice_number: data.invoice_number ?? `INV-${new Date().getFullYear()}-${num}`,
    estimate_id: data.estimate_id,
    customer_name: data.customer_name ?? '',
    customer_address: data.customer_address ?? '',
    issue_date: data.issue_date ?? now.slice(0, 10),
    due_date: data.due_date ?? now.slice(0, 10),
    tax_mode: data.tax_mode ?? 'exclusive',
    subtotal: data.subtotal ?? 0,
    tax_amount: data.tax_amount ?? 0,
    total: data.total ?? 0,
    status: data.status ?? 'draft',
    payment_date: data.payment_date,
    notes: data.notes ?? '',
    created_at: now,
    line_items: data.line_items ?? [],
  }
  MOCK_INVOICES.push(newInvoice)
  return newInvoice
}

export async function updateInvoice(id: string, data: Partial<Invoice>): Promise<Invoice | null> {
  await delay(500)
  const idx = MOCK_INVOICES.findIndex((i) => i.id === id)
  if (idx === -1) return null
  const updated: Invoice = { ...MOCK_INVOICES[idx], ...data }
  MOCK_INVOICES[idx] = updated
  return updated
}

export async function convertEstimateToInvoice(estimateId: string): Promise<Invoice | null> {
  await delay(500)
  const estimate = MOCK_ESTIMATES.find((e) => e.id === estimateId)
  if (!estimate) return null
  const dueDate = new Date(estimate.issue_date)
  dueDate.setMonth(dueDate.getMonth() + 1)
  return createInvoice({
    branch_id: estimate.branch_id,
    estimate_id: estimate.id,
    customer_name: estimate.customer_name,
    customer_address: estimate.customer_address,
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: dueDate.toISOString().slice(0, 10),
    tax_mode: estimate.tax_mode,
    subtotal: estimate.subtotal,
    tax_amount: estimate.tax_amount,
    total: estimate.total,
    status: 'draft',
    notes: estimate.notes,
    line_items: estimate.line_items?.map((l) => ({
      id: `${l.id}-inv`,
      invoice_id: '',
      description: l.description,
      quantity: l.quantity,
      unit_price: l.unit_price,
      tax_rate: l.tax_rate,
      amount: l.amount,
      line_order: l.line_order,
    })),
  })
}
