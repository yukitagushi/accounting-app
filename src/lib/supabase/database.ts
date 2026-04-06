// Supabase Database Access Layer
// Replaces mock-data.ts with real Supabase queries

import { createClient } from './client'
import type {
  Customer, Account, JournalEntry, JournalEntryLine,
  Estimate, EstimateLineItem, Invoice, InvoiceLineItem,
  VehicleInspection, CreditCardTransaction, AppSettings,
  Payment, InspectionJournalEntry,
  SalesLedgerEntry, TransferVoucher, TransferVoucherLine,
} from '@/lib/types'

function db() {
  return createClient()
}

// ── Customers ────────────────────────────────────────────────────────────────

export async function getCustomers(branchId?: string): Promise<Customer[]> {
  let q = db().from('customers').select('*').order('created_at', { ascending: false })
  if (branchId) q = q.eq('branch_id', branchId)
  const { data } = await q
  return data ?? []
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const { data } = await db().from('customers').select('*').eq('id', id).single()
  return data
}

export async function searchCustomers(keyword: string): Promise<Customer[]> {
  if (!keyword.trim()) return []
  const escaped = keyword.replace(/%/g, '\\%').replace(/_/g, '\\_').replace(/[,().]/g, '')
  const { data } = await db().from('customers').select('*').or(
    `name.ilike.%${escaped}%,name_kana.ilike.%${escaped}%,customer_code.ilike.%${escaped}%,address.ilike.%${escaped}%,phone.ilike.%${escaped}%,contact_person.ilike.%${escaped}%`
  )
  return data ?? []
}

export async function createCustomer(input: Partial<Customer>): Promise<Customer> {
  const { data, error } = await db().from('customers').insert({
    branch_id: input.branch_id ?? '00000000-0000-0000-0000-000000000001',
    customer_code: input.customer_code ?? '',
    name: input.name ?? '',
    name_kana: input.name_kana,
    address: input.address ?? '',
    phone: input.phone,
    fax: input.fax,
    email: input.email,
    contact_person: input.contact_person,
    payment_terms: input.payment_terms,
    notes: input.notes ?? '',
    vehicle_model: input.vehicle_model,
    vehicle_year: input.vehicle_year,
    vehicle_inspection_date: input.vehicle_inspection_date,
    vehicle_number: input.vehicle_number,
  }).select().single()
  if (error) throw error
  return data
}

export async function updateCustomer(id: string, input: Partial<Customer>): Promise<Customer | null> {
  const { data } = await db().from('customers').update({ ...input, updated_at: new Date().toISOString() }).eq('id', id).select().single()
  return data
}

export async function deleteCustomer(id: string): Promise<boolean> {
  const { error } = await db().from('customers').delete().eq('id', id)
  return !error
}

export async function getNextCustomerCode(): Promise<string> {
  const { data } = await db()
    .from('customers')
    .select('customer_code')
    .order('customer_code', { ascending: false })
    .limit(1)
  if (!data || data.length === 0) return 'C-001'
  const last = data[0].customer_code ?? ''
  const match = last.match(/(\d+)$/)
  if (!match) return 'C-001'
  const next = parseInt(match[1], 10) + 1
  const prefix = last.slice(0, last.length - match[1].length)
  return `${prefix}${String(next).padStart(match[1].length, '0')}`
}

// ── Accounts ─────────────────────────────────────────────────────────────────

export async function getAccounts(branchId?: string): Promise<Account[]> {
  let q = db().from('accounts').select('*').order('code')
  if (branchId) q = q.eq('branch_id', branchId)
  const { data } = await q
  return data ?? []
}

// ── Journal Entries ──────────────────────────────────────────────────────────

export async function getJournalEntries(branchId?: string): Promise<JournalEntry[]> {
  let q = db().from('journal_entries').select('*, lines:journal_entry_lines(*, account:accounts(*))').order('entry_date', { ascending: false })
  if (branchId) q = q.eq('branch_id', branchId)
  const { data } = await q
  return (data ?? []).map((e: Record<string, unknown>) => ({ ...e, lines: e.lines ?? [] })) as JournalEntry[]
}

export async function getJournalEntry(id: string): Promise<JournalEntry | null> {
  const { data } = await db().from('journal_entries').select('*, lines:journal_entry_lines(*, account:accounts(*))').eq('id', id).single()
  if (!data) return null
  return { ...data, lines: (data as Record<string, unknown>).lines ?? [] } as JournalEntry
}

export async function createJournalEntry(input: Partial<JournalEntry> & { lines?: Partial<JournalEntryLine>[] }): Promise<JournalEntry> {
  const { lines, ...entryData } = input
  const { data: entry, error } = await db().from('journal_entries').insert({
    branch_id: entryData.branch_id ?? '00000000-0000-0000-0000-000000000001',
    entry_date: entryData.entry_date,
    description: entryData.description ?? '',
    entry_type: entryData.entry_type ?? 'normal',
    status: entryData.status ?? 'draft',
    created_by: entryData.created_by,
  }).select().single()
  if (error) throw error

  if (lines && lines.length > 0) {
    const { error: linesError } = await db().from('journal_entry_lines').insert(
      lines.map((l) => ({
        journal_entry_id: entry.id,
        account_id: l.account_id,
        debit_amount: l.debit_amount ?? 0,
        credit_amount: l.credit_amount ?? 0,
        description: l.description ?? '',
        line_order: l.line_order ?? 0,
      }))
    )
    if (linesError) throw linesError
  }

  return { ...entry, lines: [] } as JournalEntry
}

export async function updateJournalEntry(id: string, input: Partial<JournalEntry>): Promise<JournalEntry | null> {
  const { lines, ...entryData } = input
  const { data } = await db().from('journal_entries').update({
    ...entryData,
    updated_at: new Date().toISOString(),
  }).eq('id', id).select().single()
  return data as JournalEntry | null
}

export async function voidJournalEntry(id: string): Promise<JournalEntry | null> {
  return updateJournalEntry(id, { status: 'void' })
}

// ── Estimates ────────────────────────────────────────────────────────────────

export async function getEstimates(branchId?: string): Promise<Estimate[]> {
  let q = db().from('estimates').select('*, line_items:estimate_line_items(*)').order('issue_date', { ascending: false })
  if (branchId) q = q.eq('branch_id', branchId)
  const { data } = await q
  return (data ?? []) as Estimate[]
}

export async function getEstimate(id: string): Promise<Estimate | null> {
  const { data } = await db().from('estimates').select('*, line_items:estimate_line_items(*)').eq('id', id).single()
  return data as Estimate | null
}

export async function createEstimate(input: Partial<Estimate> & { line_items?: Partial<EstimateLineItem>[] }): Promise<Estimate> {
  const { line_items, ...estData } = input
  // Generate estimate number
  const { count } = await db().from('estimates').select('*', { count: 'exact', head: true })
  const num = String((count ?? 0) + 1).padStart(3, '0')
  const estNumber = `EST-${new Date().getFullYear()}-${num}`

  const { data: est, error } = await db().from('estimates').insert({
    branch_id: estData.branch_id ?? '00000000-0000-0000-0000-000000000001',
    estimate_number: estData.estimate_number ?? estNumber,
    customer_name: estData.customer_name ?? '',
    customer_address: estData.customer_address ?? '',
    customer_code: estData.customer_code,
    issue_date: estData.issue_date,
    valid_until: estData.valid_until,
    tax_mode: estData.tax_mode ?? 'exclusive',
    subtotal: estData.subtotal ?? 0,
    tax_amount: estData.tax_amount ?? 0,
    total: estData.total ?? 0,
    discount: estData.discount ?? 0,
    status: estData.status ?? 'draft',
    notes: estData.notes ?? '',
    vehicle_name: estData.vehicle_name,
    vehicle_number: estData.vehicle_number,
    mileage: estData.mileage,
    first_registration: estData.first_registration,
    next_inspection_date: estData.next_inspection_date,
    delivery_date: estData.delivery_date,
    delivery_category: estData.delivery_category,
    staff_name: estData.staff_name,
  }).select().single()
  if (error) throw error

  if (line_items && line_items.length > 0) {
    await db().from('estimate_line_items').insert(
      line_items.map((l) => ({
        estimate_id: est.id,
        description: l.description ?? '',
        category: l.category,
        quantity: l.quantity ?? 1,
        unit_price: l.unit_price ?? 0,
        tax_rate: l.tax_rate ?? 0.1,
        parts_amount: l.parts_amount ?? 0,
        labor_amount: l.labor_amount ?? 0,
        amount: l.amount ?? 0,
        line_order: l.line_order ?? 0,
      }))
    )
  }

  return { ...est, line_items: [] } as Estimate
}

export async function updateEstimate(id: string, input: Partial<Estimate> & { line_items?: Partial<EstimateLineItem>[] }): Promise<Estimate | null> {
  const { line_items, ...estData } = input
  const { data } = await db().from('estimates').update(estData).eq('id', id).select().single()
  if (!data) return null

  if (line_items) {
    await db().from('estimate_line_items').delete().eq('estimate_id', id)
    if (line_items.length > 0) {
      await db().from('estimate_line_items').insert(
        line_items.map((l) => ({
          estimate_id: id,
          description: l.description ?? '',
          category: l.category,
          quantity: l.quantity ?? 1,
          unit_price: l.unit_price ?? 0,
          tax_rate: l.tax_rate ?? 0.1,
          parts_amount: l.parts_amount ?? 0,
          labor_amount: l.labor_amount ?? 0,
          amount: l.amount ?? 0,
          line_order: l.line_order ?? 0,
        }))
      )
    }
  }

  return data as Estimate
}

// ── Invoices ─────────────────────────────────────────────────────────────────

export async function getInvoices(branchId?: string): Promise<Invoice[]> {
  let q = db().from('invoices').select('*, line_items:invoice_line_items(*)').order('issue_date', { ascending: false })
  if (branchId) q = q.eq('branch_id', branchId)
  const { data } = await q
  return (data ?? []) as Invoice[]
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  const { data } = await db().from('invoices').select('*, line_items:invoice_line_items(*)').eq('id', id).single()
  return data as Invoice | null
}

export async function createInvoice(input: Partial<Invoice> & { line_items?: Partial<InvoiceLineItem>[] }): Promise<Invoice> {
  const { line_items, ...invData } = input
  const { count } = await db().from('invoices').select('*', { count: 'exact', head: true })
  const num = String((count ?? 0) + 1).padStart(3, '0')
  const invNumber = `INV-${new Date().getFullYear()}-${num}`

  const { data: inv, error } = await db().from('invoices').insert({
    branch_id: invData.branch_id ?? '00000000-0000-0000-0000-000000000001',
    invoice_number: invData.invoice_number ?? invNumber,
    estimate_id: invData.estimate_id,
    customer_name: invData.customer_name ?? '',
    customer_address: invData.customer_address ?? '',
    customer_code: invData.customer_code,
    issue_date: invData.issue_date,
    due_date: invData.due_date,
    tax_mode: invData.tax_mode ?? 'exclusive',
    subtotal: invData.subtotal ?? 0,
    tax_amount: invData.tax_amount ?? 0,
    total: invData.total ?? 0,
    discount: invData.discount ?? 0,
    status: invData.status ?? 'draft',
    payment_date: invData.payment_date,
    notes: invData.notes ?? '',
    vehicle_name: invData.vehicle_name,
    vehicle_number: invData.vehicle_number,
    mileage: invData.mileage,
    first_registration: invData.first_registration,
    next_inspection_date: invData.next_inspection_date,
    delivery_date: invData.delivery_date,
    delivery_category: invData.delivery_category,
    staff_name: invData.staff_name,
  }).select().single()
  if (error) throw error

  if (line_items && line_items.length > 0) {
    await db().from('invoice_line_items').insert(
      line_items.map((l) => ({
        invoice_id: inv.id,
        description: l.description ?? '',
        category: l.category,
        quantity: l.quantity ?? 1,
        unit_price: l.unit_price ?? 0,
        tax_rate: l.tax_rate ?? 0.1,
        parts_amount: l.parts_amount ?? 0,
        labor_amount: l.labor_amount ?? 0,
        amount: l.amount ?? 0,
        line_order: l.line_order ?? 0,
      }))
    )
  }

  return { ...inv, line_items: [] } as Invoice
}

export async function updateInvoice(id: string, input: Partial<Invoice> & { line_items?: Partial<InvoiceLineItem>[] }): Promise<Invoice | null> {
  const { line_items, ...invData } = input
  const { data } = await db().from('invoices').update(invData).eq('id', id).select().single()
  if (!data) return null

  if (line_items) {
    await db().from('invoice_line_items').delete().eq('invoice_id', id)
    if (line_items.length > 0) {
      await db().from('invoice_line_items').insert(
        line_items.map((l) => ({
          invoice_id: id,
          description: l.description ?? '',
          category: l.category,
          quantity: l.quantity ?? 1,
          unit_price: l.unit_price ?? 0,
          tax_rate: l.tax_rate ?? 0.1,
          parts_amount: l.parts_amount ?? 0,
          labor_amount: l.labor_amount ?? 0,
          amount: l.amount ?? 0,
          line_order: l.line_order ?? 0,
        }))
      )
    }
  }

  return data as Invoice
}

export async function searchInvoices(keyword: string): Promise<Invoice[]> {
  if (!keyword.trim()) return []
  // スペース区切りでAND検索
  const terms = keyword.trim().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return []

  // 全件取得してクライアント側でANDフィルタリング（Supabase の or は複数term AND に対応しにくいため）
  const { data } = await db()
    .from('invoices')
    .select('*, line_items:invoice_line_items(*)')
    .order('issue_date', { ascending: false })
  const all = (data ?? []) as Invoice[]

  return all.filter((inv) => {
    const searchTarget = [
      inv.customer_name,
      inv.invoice_number,
      inv.notes,
      inv.vehicle_name ?? '',
      inv.vehicle_number ?? '',
      ...(inv.line_items ?? []).map((li) => li.description),
    ].join(' ').toLowerCase()
    return terms.every((t) => searchTarget.includes(t.toLowerCase()))
  })
}

// ── Vehicle Inspections ──────────────────────────────────────────────────────

export async function getVehicleInspections(branchId?: string): Promise<VehicleInspection[]> {
  let q = db().from('vehicle_inspections').select('*').order('inspection_date', { ascending: false })
  if (branchId) q = q.eq('branch_id', branchId)
  const { data } = await q
  return (data ?? []) as VehicleInspection[]
}

export async function getVehicleInspection(id: string): Promise<VehicleInspection | null> {
  const { data } = await db().from('vehicle_inspections').select('*').eq('id', id).single()
  return data as VehicleInspection | null
}

export async function createVehicleInspection(input: Partial<VehicleInspection>): Promise<VehicleInspection> {
  const { data, error } = await db().from('vehicle_inspections').insert({
    branch_id: input.branch_id ?? '00000000-0000-0000-0000-000000000001',
    customer_name: input.customer_name ?? '',
    vehicle_number: input.vehicle_number ?? '',
    inspection_date: input.inspection_date,
    status: input.status ?? 'pending',
    deposit_jibaiseki: input.deposit_jibaiseki ?? 0,
    deposit_weight_tax: input.deposit_weight_tax ?? 0,
    deposit_stamp: input.deposit_stamp ?? 0,
    deposit_maintenance: input.deposit_maintenance ?? 0,
    deposit_parts: input.deposit_parts ?? 0,
    deposit_substitute_car: input.deposit_substitute_car ?? 0,
    deposit_other: input.deposit_other ?? 0,
    actual_jibaiseki: input.actual_jibaiseki ?? 0,
    actual_weight_tax: input.actual_weight_tax ?? 0,
    actual_stamp: input.actual_stamp ?? 0,
    actual_maintenance: input.actual_maintenance ?? 0,
    actual_parts: input.actual_parts ?? 0,
    actual_substitute_car: input.actual_substitute_car ?? 0,
    actual_other: input.actual_other ?? 0,
    total_deposit: input.total_deposit ?? 0,
    total_actual: input.total_actual ?? 0,
    difference: input.difference ?? 0,
    journal_entry_id: input.journal_entry_id,
  }).select().single()
  if (error) throw error
  return data as VehicleInspection
}

export async function updateVehicleInspection(id: string, input: Partial<VehicleInspection>): Promise<VehicleInspection | null> {
  const { data } = await db().from('vehicle_inspections').update(input).eq('id', id).select().single()
  return data as VehicleInspection | null
}

// ── Credit Card Transactions ─────────────────────────────────────────────────

export async function getCreditCardTransactions(branchId?: string): Promise<CreditCardTransaction[]> {
  let q = db().from('credit_card_transactions').select('*').order('transaction_date', { ascending: false })
  if (branchId) q = q.eq('branch_id', branchId)
  const { data } = await q
  return (data ?? []) as CreditCardTransaction[]
}

// ── App Settings ─────────────────────────────────────────────────────────────

export async function getAppSettings(branchId?: string): Promise<AppSettings | null> {
  const bid = branchId ?? '00000000-0000-0000-0000-000000000001'
  const { data } = await db().from('app_settings').select('*').eq('branch_id', bid).single()
  return data as AppSettings | null
}

// ── Payments ────────────────────────────────────────────────────────────────

export async function getPayments(branchId?: string): Promise<Payment[]> {
  let q = db().from('payments').select('*, invoice:invoices(*)').order('payment_date', { ascending: false })
  if (branchId) q = q.eq('branch_id', branchId)
  const { data } = await q
  return (data ?? []) as Payment[]
}

export async function getPaymentsByInvoice(invoiceId: string): Promise<Payment[]> {
  const { data } = await db().from('payments').select('*').eq('invoice_id', invoiceId).order('payment_date', { ascending: false })
  return (data ?? []) as Payment[]
}

export async function createPayment(input: Partial<Payment>): Promise<Payment> {
  const { count } = await db().from('payments').select('*', { count: 'exact', head: true })
  const num = String((count ?? 0) + 1).padStart(3, '0')
  const payNumber = `PAY-${new Date().getFullYear()}-${num}`

  const { data, error } = await db().from('payments').insert({
    branch_id: input.branch_id ?? '00000000-0000-0000-0000-000000000001',
    payment_number: input.payment_number ?? payNumber,
    invoice_id: input.invoice_id,
    payment_date: input.payment_date,
    amount: input.amount ?? 0,
    payment_method: input.payment_method ?? 'cash',
    description: input.description ?? '',
    journal_entry_id: input.journal_entry_id,
  }).select().single()
  if (error) throw error
  return data as Payment
}

// ── Inspection Journal Entries ──────────────────────────────────────────────

export async function getInspectionJournalEntries(inspectionId: string): Promise<InspectionJournalEntry[]> {
  const { data } = await db().from('inspection_journal_entries')
    .select('*, journal_entry:journal_entries(*, lines:journal_entry_lines(*, account:accounts(*)))')
    .eq('inspection_id', inspectionId)
    .order('created_at', { ascending: true })
  return (data ?? []) as InspectionJournalEntry[]
}

export async function createInspectionJournalEntry(input: { inspection_id: string; journal_entry_id: string; entry_purpose: string }): Promise<InspectionJournalEntry> {
  const { data, error } = await db().from('inspection_journal_entries').insert(input).select().single()
  if (error) throw error
  return data as InspectionJournalEntry
}

// ── Sales Ledger ────────────────────────────────────────────────────────────

export async function getSalesLedgerEntries(branchId?: string): Promise<SalesLedgerEntry[]> {
  let q = db().from('sales_ledger_entries').select('*').order('entry_date', { ascending: true }).order('line_order', { ascending: true })
  if (branchId) q = q.eq('branch_id', branchId)
  const { data } = await q
  return (data ?? []) as SalesLedgerEntry[]
}

export async function createSalesLedgerEntry(input: Partial<SalesLedgerEntry>): Promise<SalesLedgerEntry> {
  const { data, error } = await db().from('sales_ledger_entries').insert({
    branch_id: input.branch_id ?? '00000000-0000-0000-0000-000000000001',
    entry_date: input.entry_date,
    customer_name: input.customer_name ?? '',
    description: input.description ?? '',
    quantity: input.quantity ?? 1,
    unit_price: input.unit_price ?? 0,
    income_amount: input.income_amount ?? 0,
    payment_amount: input.payment_amount ?? 0,
    memo: input.memo ?? '',
    line_order: input.line_order ?? 0,
  }).select().single()
  if (error) throw error
  return data as SalesLedgerEntry
}

export async function updateSalesLedgerEntry(id: string, input: Partial<SalesLedgerEntry>): Promise<SalesLedgerEntry | null> {
  const { data } = await db().from('sales_ledger_entries').update({ ...input, updated_at: new Date().toISOString() }).eq('id', id).select().single()
  return data as SalesLedgerEntry | null
}

export async function deleteSalesLedgerEntry(id: string): Promise<boolean> {
  const { error } = await db().from('sales_ledger_entries').delete().eq('id', id)
  return !error
}

// ── Transfer Vouchers ───────────────────────────────────────────────────────

export async function getTransferVouchers(branchId?: string): Promise<TransferVoucher[]> {
  let q = db().from('transfer_vouchers').select('*, lines:transfer_voucher_lines(*)').order('voucher_date', { ascending: false })
  if (branchId) q = q.eq('branch_id', branchId)
  const { data } = await q
  return (data ?? []) as TransferVoucher[]
}

export async function getTransferVoucher(id: string): Promise<TransferVoucher | null> {
  const { data } = await db().from('transfer_vouchers').select('*, lines:transfer_voucher_lines(*)').eq('id', id).single()
  return data as TransferVoucher | null
}

export async function createTransferVoucher(input: Partial<TransferVoucher> & { lines?: Partial<TransferVoucherLine>[] }): Promise<TransferVoucher> {
  const { lines, ...vData } = input
  const { count } = await db().from('transfer_vouchers').select('*', { count: 'exact', head: true })
  const num = String((count ?? 0) + 1).padStart(3, '0')

  const { data: voucher, error } = await db().from('transfer_vouchers').insert({
    branch_id: vData.branch_id ?? '00000000-0000-0000-0000-000000000001',
    voucher_number: vData.voucher_number || `TV-${new Date().getFullYear()}-${num}`,
    voucher_date: vData.voucher_date,
    memo: vData.memo ?? '',
    total_amount: vData.total_amount ?? 0,
  }).select().single()
  if (error) throw error

  if (lines && lines.length > 0) {
    const { error: linesError } = await db().from('transfer_voucher_lines').insert(
      lines.map((l) => ({
        voucher_id: voucher.id,
        debit_account: l.debit_account ?? '',
        debit_amount: l.debit_amount ?? 0,
        credit_account: l.credit_account ?? '',
        credit_amount: l.credit_amount ?? 0,
        description: l.description ?? '',
        line_order: l.line_order ?? 0,
      }))
    )
    if (linesError) throw linesError
  }

  return { ...voucher, lines: [] } as TransferVoucher
}

export async function updateTransferVoucher(id: string, input: Partial<TransferVoucher> & { lines?: Partial<TransferVoucherLine>[] }): Promise<TransferVoucher | null> {
  const { lines, ...vData } = input
  const { data } = await db().from('transfer_vouchers').update({ ...vData, updated_at: new Date().toISOString() }).eq('id', id).select().single()
  if (!data) return null

  if (lines) {
    await db().from('transfer_voucher_lines').delete().eq('voucher_id', id)
    if (lines.length > 0) {
      await db().from('transfer_voucher_lines').insert(
        lines.map((l) => ({
          voucher_id: id,
          debit_account: l.debit_account ?? '',
          debit_amount: l.debit_amount ?? 0,
          credit_account: l.credit_account ?? '',
          credit_amount: l.credit_amount ?? 0,
          description: l.description ?? '',
          line_order: l.line_order ?? 0,
        }))
      )
    }
  }

  return data as TransferVoucher
}

export async function deleteTransferVoucher(id: string): Promise<boolean> {
  const { error } = await db().from('transfer_vouchers').delete().eq('id', id)
  return !error
}

// ── Invoice Payment Helpers ─────────────────────────────────────────────────

export async function updateInvoicePaidAmount(invoiceId: string): Promise<void> {
  const payments = await getPaymentsByInvoice(invoiceId)
  const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0)

  const { data: invoice } = await db().from('invoices').select('total').eq('id', invoiceId).single()
  if (!invoice) return

  let status: string = 'sent'
  if (paidAmount >= invoice.total) status = 'paid'
  else if (paidAmount > 0) status = 'partial'

  await db().from('invoices').update({ paid_amount: paidAmount, status }).eq('id', invoiceId)
}

export async function searchInvoicesByPaymentKeyword(keyword: string): Promise<Invoice[]> {
  // Parse customer name from patterns like "田中車検代入金", "田中 入金", "田中"
  const cleaned = keyword.replace(/車検代?入金|入金|代金/g, '').trim()
  if (!cleaned) {
    // If no customer name extracted, return all unpaid invoices (limited)
    const { data } = await db().from('invoices')
      .select('*, line_items:invoice_line_items(*)')
      .in('status', ['sent', 'partial', 'overdue'])
      .order('issue_date', { ascending: false })
      .limit(10)
    return (data ?? []) as Invoice[]
  }

  const escaped = cleaned.replace(/%/g, '\\%').replace(/_/g, '\\_')
  const { data } = await db().from('invoices')
    .select('*, line_items:invoice_line_items(*)')
    .ilike('customer_name', `%${escaped}%`)
    .in('status', ['sent', 'partial', 'overdue'])
    .order('issue_date', { ascending: false })
  return (data ?? []) as Invoice[]
}
