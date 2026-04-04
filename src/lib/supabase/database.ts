// Supabase Database Access Layer
// Replaces mock-data.ts with real Supabase queries

import { createClient } from './client'
import type {
  Customer, Account, JournalEntry, JournalEntryLine,
  Estimate, EstimateLineItem, Invoice, InvoiceLineItem,
  VehicleInspection, CreditCardTransaction, AppSettings,
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
  const { data } = await db().from('customers').select('*').or(
    `name.ilike.%${keyword}%,name_kana.ilike.%${keyword}%,customer_code.ilike.%${keyword}%,address.ilike.%${keyword}%,phone.ilike.%${keyword}%,contact_person.ilike.%${keyword}%`
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
  const { data } = await db().from('invoices').select('*, line_items:invoice_line_items(*)').or(
    `customer_name.ilike.%${keyword}%,invoice_number.ilike.%${keyword}%,notes.ilike.%${keyword}%`
  ).order('issue_date', { ascending: false })
  return (data ?? []) as Invoice[]
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
