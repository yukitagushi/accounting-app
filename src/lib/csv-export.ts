import type {
  JournalEntry,
  Account,
  Estimate,
  Invoice,
  VehicleInspection,
  CreditCardTransaction,
} from '@/lib/types'
import type { TrialBalanceRow } from '@/lib/supabase/database'

// ── Internal helpers ──────────────────────────────────────────────────────────

function createCSV(headers: string[], rows: string[][]): string {
  const BOM = '\uFEFF'
  const headerLine = headers.map((h) => `"${h}"`).join(',')
  const dataLines = rows.map((row) =>
    row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
  )
  return BOM + [headerLine, ...dataLines].join('\n')
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: '下書き',
    posted: '承認済み',
    void: '無効',
    sent: '送付済み',
    accepted: '承認',
    rejected: '却下',
    paid: '支払済み',
    overdue: '期限超過',
    pending: '未精算',
    settled: '精算済み',
    in_progress: '進行中',
    completed: '完了',
  }
  return map[status] ?? status
}

// ── Journal Entries ───────────────────────────────────────────────────────────

export function exportJournalEntries(
  entries: JournalEntry[],
  accounts: Account[],
  startDate: string,
  endDate: string
): void {
  const headers = [
    '日付',
    '伝票番号',
    '摘要',
    '種別',
    '借方勘定科目',
    '借方金額',
    '貸方勘定科目',
    '貸方金額',
    'ステータス',
  ]

  const typeLabel: Record<string, string> = {
    normal: '通常',
    transfer: '振替',
    vehicle_inspection: '車検',
  }

  const rows: string[][] = []

  for (const entry of entries) {
    const lines = entry.lines ?? []
    if (lines.length === 0) {
      rows.push([
        entry.entry_date,
        entry.id,
        entry.description,
        typeLabel[entry.entry_type] ?? entry.entry_type,
        '',
        '',
        '',
        '',
        statusLabel(entry.status),
      ])
    } else {
      for (const line of lines) {
        const accountName = line.account?.name ?? accounts.find((a) => a.id === line.account_id)?.name ?? ''
        const isDebit = line.debit_amount > 0
        rows.push([
          entry.entry_date,
          entry.id,
          entry.description,
          typeLabel[entry.entry_type] ?? entry.entry_type,
          isDebit ? accountName : '',
          isDebit ? String(line.debit_amount) : '0',
          !isDebit ? accountName : '',
          !isDebit ? String(line.credit_amount) : '0',
          statusLabel(entry.status),
        ])
      }
    }
  }

  const content = createCSV(headers, rows)
  downloadCSV(content, `仕訳帳_${startDate}_${endDate}.csv`)
}

// ── Trial Balance ─────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  assets: '資産',
  liabilities: '負債',
  equity: '純資産',
  revenue: '収益',
  expense: '費用',
}

export function exportTrialBalance(
  data: TrialBalanceRow[],
  period: string
): void {
  const headers = ['勘定コード', '勘定科目', 'カテゴリ', '借方残高', '貸方残高']

  const rows: string[][] = data.map((row) => [
    row.account_code,
    row.account_name,
    CATEGORY_LABELS[row.category] ?? row.category,
    String(row.debit_balance),
    String(row.credit_balance),
  ])

  const content = createCSV(headers, rows)
  downloadCSV(content, `試算表_${period}.csv`)
}

// ── Estimates ─────────────────────────────────────────────────────────────────

export function exportEstimates(
  estimates: Estimate[],
  startDate: string,
  endDate: string
): void {
  const headers = [
    '見積番号',
    '顧客名',
    '発行日',
    '有効期限',
    '小計',
    '消費税',
    '合計',
    'ステータス',
  ]

  const rows: string[][] = estimates.map((e) => [
    e.estimate_number,
    e.customer_name,
    e.issue_date,
    e.valid_until,
    String(e.subtotal),
    String(e.tax_amount),
    String(e.total),
    statusLabel(e.status),
  ])

  const content = createCSV(headers, rows)
  downloadCSV(content, `見積書一覧_${startDate}_${endDate}.csv`)
}

// ── Invoices ──────────────────────────────────────────────────────────────────

export function exportInvoices(
  invoices: Invoice[],
  startDate: string,
  endDate: string
): void {
  const headers = [
    '請求番号',
    '顧客名',
    '発行日',
    '支払期限',
    '小計',
    '消費税',
    '合計',
    '支払日',
    'ステータス',
  ]

  const rows: string[][] = invoices.map((inv) => [
    inv.invoice_number,
    inv.customer_name,
    inv.issue_date,
    inv.due_date,
    String(inv.subtotal),
    String(inv.tax_amount),
    String(inv.total),
    inv.payment_date ?? '',
    statusLabel(inv.status),
  ])

  const content = createCSV(headers, rows)
  downloadCSV(content, `請求書一覧_${startDate}_${endDate}.csv`)
}

// ── Vehicle Inspections ───────────────────────────────────────────────────────

export function exportVehicleInspections(
  inspections: VehicleInspection[],
  startDate: string,
  endDate: string
): void {
  const headers = [
    '顧客名',
    '車両番号',
    '車検日',
    'ステータス',
    '自賠責(預)',
    '重量税(預)',
    '印紙代(預)',
    '整備費(預)',
    '部品代(預)',
    '代車(預)',
    'その他(預)',
    '預かり合計',
    '自賠責(実)',
    '重量税(実)',
    '印紙代(実)',
    '整備費(実)',
    '部品代(実)',
    '代車(実)',
    'その他(実)',
    '実際合計',
    '差額',
  ]

  const rows: string[][] = inspections.map((ins) => [
    ins.customer_name,
    ins.vehicle_number,
    ins.inspection_date,
    statusLabel(ins.status),
    String(ins.deposit_jibaiseki),
    String(ins.deposit_weight_tax),
    String(ins.deposit_stamp),
    String(ins.deposit_maintenance),
    String(ins.deposit_parts),
    String(ins.deposit_substitute_car),
    String(ins.deposit_other),
    String(ins.total_deposit),
    String(ins.actual_jibaiseki),
    String(ins.actual_weight_tax),
    String(ins.actual_stamp),
    String(ins.actual_maintenance),
    String(ins.actual_parts),
    String(ins.actual_substitute_car),
    String(ins.actual_other),
    String(ins.total_actual),
    String(ins.difference),
  ])

  const content = createCSV(headers, rows)
  downloadCSV(content, `車検一覧_${startDate}_${endDate}.csv`)
}

// ── Credit Card Transactions ──────────────────────────────────────────────────

export function exportCreditCardTransactions(
  transactions: CreditCardTransaction[],
  startDate: string,
  endDate: string
): void {
  const headers = [
    '日付',
    '顧客名',
    '決済金額',
    '手数料率',
    '手数料額',
    '売上金額',
    'ステータス',
    '精算日',
  ]

  const rows: string[][] = transactions.map((tx) => [
    tx.transaction_date,
    tx.customer_name,
    String(tx.gross_amount),
    String((tx.fee_rate * 100).toFixed(2)),
    String(tx.fee_amount),
    String(tx.net_amount),
    statusLabel(tx.status),
    tx.settlement_date ?? '',
  ])

  const content = createCSV(headers, rows)
  downloadCSV(content, `クレカ決済_${startDate}_${endDate}.csv`)
}

// ── Accounts ──────────────────────────────────────────────────────────────────

export function exportAccounts(accounts: Account[]): void {
  const headers = [
    '勘定コード',
    '勘定科目名',
    'カテゴリ',
    'サブカテゴリ',
    'システム勘定',
  ]

  const rows: string[][] = accounts.map((a) => [
    a.code,
    a.name,
    CATEGORY_LABELS[a.category] ?? a.category,
    a.sub_category,
    a.is_system ? 'はい' : 'いいえ',
  ])

  const content = createCSV(headers, rows)
  const today = new Date().toISOString().split('T')[0]
  downloadCSV(content, `勘定科目一覧_${today}.csv`)
}
