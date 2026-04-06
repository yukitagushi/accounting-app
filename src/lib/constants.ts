export const DEFAULT_TAX_RATE = 0.10

export const DEFAULT_ACCOUNTS: Array<{ code: string; name: string; category: string; sub_category: string }> = [
  // 資産
  { code: '1000', name: '現金', category: 'assets', sub_category: '流動資産' },
  { code: '1010', name: '普通預金', category: 'assets', sub_category: '流動資産' },
  { code: '1020', name: '当座預金', category: 'assets', sub_category: '流動資産' },
  { code: '1100', name: '売掛金', category: 'assets', sub_category: '流動資産' },
  { code: '1200', name: '前払金', category: 'assets', sub_category: '流動資産' },
  { code: '1300', name: '仮払金', category: 'assets', sub_category: '流動資産' },
  { code: '1400', name: '立替金', category: 'assets', sub_category: '流動資産' },
  { code: '1500', name: '車両運搬具', category: 'assets', sub_category: '固定資産' },
  { code: '1600', name: '工具器具備品', category: 'assets', sub_category: '固定資産' },
  // 負債
  { code: '2000', name: '買掛金', category: 'liabilities', sub_category: '流動負債' },
  { code: '2100', name: '未払金', category: 'liabilities', sub_category: '流動負債' },
  { code: '2200', name: '預り金', category: 'liabilities', sub_category: '流動負債' },
  { code: '2300', name: '仮受金', category: 'liabilities', sub_category: '流動負債' },
  { code: '2400', name: '未払消費税', category: 'liabilities', sub_category: '流動負債' },
  // 純資産
  { code: '3000', name: '資本金', category: 'equity', sub_category: '純資産' },
  { code: '3100', name: '繰越利益剰余金', category: 'equity', sub_category: '純資産' },
  // 収益
  { code: '4000', name: '売上高', category: 'revenue', sub_category: '営業収益' },
  { code: '4100', name: '整備売上', category: 'revenue', sub_category: '営業収益' },
  { code: '4200', name: '車検売上', category: 'revenue', sub_category: '営業収益' },
  { code: '4300', name: '部品売上', category: 'revenue', sub_category: '営業収益' },
  { code: '4900', name: '雑収入', category: 'revenue', sub_category: '営業外収益' },
  // 費用
  { code: '5000', name: '仕入高', category: 'expense', sub_category: '売上原価' },
  { code: '5100', name: '部品仕入', category: 'expense', sub_category: '売上原価' },
  { code: '5200', name: '外注費', category: 'expense', sub_category: '売上原価' },
  { code: '6000', name: '給料手当', category: 'expense', sub_category: '販管費' },
  { code: '6100', name: '法定福利費', category: 'expense', sub_category: '販管費' },
  { code: '6200', name: '地代家賃', category: 'expense', sub_category: '販管費' },
  { code: '6300', name: '水道光熱費', category: 'expense', sub_category: '販管費' },
  { code: '6400', name: '通信費', category: 'expense', sub_category: '販管費' },
  { code: '6500', name: '消耗品費', category: 'expense', sub_category: '販管費' },
  { code: '6600', name: '支払手数料', category: 'expense', sub_category: '販管費' },
  { code: '6700', name: '保険料', category: 'expense', sub_category: '販管費' },
  { code: '6800', name: '租税公課', category: 'expense', sub_category: '販管費' },
  { code: '6900', name: '減価償却費', category: 'expense', sub_category: '販管費' },
  { code: '7000', name: '雑費', category: 'expense', sub_category: '販管費' },
  // 車検用特別勘定
  { code: '2210', name: '車検預り金', category: 'liabilities', sub_category: '流動負債' },
  { code: '2220', name: '自賠責保険預り金', category: 'liabilities', sub_category: '流動負債' },
  { code: '2230', name: '重量税預り金', category: 'liabilities', sub_category: '流動負債' },
  { code: '2240', name: '印紙代預り金', category: 'liabilities', sub_category: '流動負債' },
]

export const ACCOUNT_CATEGORIES = {
  assets: '資産',
  liabilities: '負債',
  equity: '純資産',
  revenue: '収益',
  expense: '費用',
} as const

export const JOURNAL_ENTRY_TYPES = {
  normal: '通常仕訳',
  transfer: '振替伝票',
  vehicle_inspection: '車検仕訳',
  payment: '入金仕訳',
} as const

export const PAYMENT_METHODS: Record<string, string> = {
  cash: '現金',
  bank_transfer: '銀行振込',
  credit_card: 'クレジットカード',
  other: 'その他',
}

export const INSPECTION_ITEM_CATEGORIES = {
  jibaiseki: { type: 'passthrough' as const, account_code: '1400', label: '自賠責保険', tax_rate: 0 },
  weight_tax: { type: 'passthrough' as const, account_code: '1400', label: '重量税', tax_rate: 0 },
  stamp: { type: 'passthrough' as const, account_code: '1400', label: '印紙代', tax_rate: 0 },
  maintenance: { type: 'revenue' as const, account_code: '4100', label: '整備費用', tax_rate: 0.10 },
  parts: { type: 'revenue' as const, account_code: '4200', label: '部品代', tax_rate: 0.10 },
  substitute_car: { type: 'revenue' as const, account_code: '4100', label: '代車費用', tax_rate: 0.10 },
  other: { type: 'revenue' as const, account_code: '4000', label: 'その他', tax_rate: 0.10 },
}

export const VEHICLE_INSPECTION_ITEMS = [
  { key: 'jibaiseki', label: '自賠責保険' },
  { key: 'weight_tax', label: '重量税' },
  { key: 'stamp', label: '印紙代' },
  { key: 'maintenance', label: '整備費用' },
  { key: 'parts', label: '部品代' },
  { key: 'substitute_car', label: '代車費用' },
  { key: 'other', label: 'その他' },
] as const

export const NAV_ITEMS = [
  { label: 'ダッシュボード', href: '/dashboard', icon: 'LayoutDashboard' },
  { label: '仕訳管理', href: '/journal', icon: 'BookOpen' },
  { label: '車検管理', href: '/vehicle-inspection', icon: 'Car' },
  { label: '見積書', href: '/estimates', icon: 'FileText' },
  { label: '顧客管理', href: '/customers', icon: 'Users' },
  { label: '請求書', href: '/invoices', icon: 'Receipt' },
  { label: '会計管理', href: '/accounting', icon: 'Calculator' },
  { label: '設定', href: '/settings', icon: 'Settings' },
] as const
