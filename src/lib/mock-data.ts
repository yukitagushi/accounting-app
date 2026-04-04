// Data Access Layer — delegates to Supabase
// Static data kept for dashboard/trial-balance; all CRUD goes to Supabase

import type {
  Branch, Profile, Account, JournalEntry, JournalEntryLine,
  VehicleInspection, Estimate, Invoice, CreditCardTransaction,
} from '@/lib/types'
import { DEFAULT_ACCOUNTS } from '@/lib/constants'
import * as supabase from '@/lib/supabase/database'

// ── Re-export all Supabase functions ────────────────────────────────────────

export const getCustomers = supabase.getCustomers
export const getCustomer = supabase.getCustomer
export const searchCustomers = supabase.searchCustomers
export const createCustomer = supabase.createCustomer
export const updateCustomer = supabase.updateCustomer
export const deleteCustomer = supabase.deleteCustomer

export const getAccounts = supabase.getAccounts
export const getJournalEntries = supabase.getJournalEntries
export const getJournalEntry = supabase.getJournalEntry
export const createJournalEntry = supabase.createJournalEntry
export const updateJournalEntry = supabase.updateJournalEntry
export const voidJournalEntry = supabase.voidJournalEntry

export const getEstimates = supabase.getEstimates
export const getEstimate = supabase.getEstimate
export const createEstimate = supabase.createEstimate
export const updateEstimate = supabase.updateEstimate

export const getInvoices = supabase.getInvoices
export const getInvoice = supabase.getInvoice
export const createInvoice = supabase.createInvoice
export const updateInvoice = supabase.updateInvoice
export const searchInvoices = supabase.searchInvoices

export const getVehicleInspections = supabase.getVehicleInspections
export const createVehicleInspection = supabase.createVehicleInspection
export const updateVehicleInspection = supabase.updateVehicleInspection

export const getCreditCardTransactions = supabase.getCreditCardTransactions

export async function convertEstimateToInvoice(estimateId: string): Promise<Invoice | null> {
  const estimate = await supabase.getEstimate(estimateId)
  if (!estimate) return null
  const dueDate = new Date(estimate.issue_date)
  dueDate.setMonth(dueDate.getMonth() + 1)
  return supabase.createInvoice({
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
      id: '',
      invoice_id: '',
      description: l.description,
      category: l.category,
      quantity: l.quantity,
      unit_price: l.unit_price,
      tax_rate: l.tax_rate,
      parts_amount: l.parts_amount,
      labor_amount: l.labor_amount,
      amount: l.amount,
      line_order: l.line_order,
    })),
  })
}

// ── Static data (for dashboard, trial balance, etc.) ────────────────────────

export const MOCK_BRANCHES: Branch[] = [
  { id: '00000000-0000-0000-0000-000000000001', name: '本店', code: 'HQ', address: '〒028-0041 岩手県久慈市長内町', phone: '0194-52-3955', created_at: '2024-01-01T00:00:00Z' },
]

export const MOCK_CURRENT_USER: Profile = {
  id: 'user-1',
  email: 'admin@autoaccount.demo',
  display_name: '竹花 太郎',
  branch_id: '00000000-0000-0000-0000-000000000001',
  role: 'admin',
  created_at: '2024-01-01T00:00:00Z',
}

export const MOCK_ACCOUNTS: Account[] = DEFAULT_ACCOUNTS.map((a, i) => ({
  id: `acct-${String(i + 1).padStart(3, '0')}`,
  code: a.code,
  name: a.name,
  category: a.category as Account['category'],
  sub_category: a.sub_category,
  is_system: true,
  branch_id: '00000000-0000-0000-0000-000000000001',
}))

// Sync helper for components that need sync access
export function getMockAccounts(): Account[] { return MOCK_ACCOUNTS }

export async function getBranches(): Promise<Branch[]> { return MOCK_BRANCHES }

// Synchronous helpers used by dashboard, trial balance, etc.
export function getMockVehicleInspections(): VehicleInspection[] { return [] }
export function getMockVehicleInspectionById(id: string): VehicleInspection | undefined { return undefined }
export function getMockCreditCardTransactions(): CreditCardTransaction[] { return [] }
export function getMockJournalEntries(): JournalEntry[] { return [] }

// Empty arrays for static references (MOCK_ exports used by some pages)
export const MOCK_JOURNAL_ENTRIES: JournalEntry[] = []
export const MOCK_VEHICLE_INSPECTIONS: VehicleInspection[] = []
export const MOCK_ESTIMATES: Estimate[] = []
export const MOCK_INVOICES: Invoice[] = []
export const MOCK_CREDIT_CARD_TRANSACTIONS: CreditCardTransaction[] = []
export const MOCK_CUSTOMERS: never[] = []

export type TrialBalanceRow = {
  account_id: string; account_code: string; account_name: string
  category: string; sub_category: string
  debit_balance: number; credit_balance: number
}
export function getMockTrialBalance(): TrialBalanceRow[] { return [] }

// Re-export getVehicleInspection for detail pages
export async function getVehicleInspection(id: string): Promise<VehicleInspection | null> {
  return supabase.getVehicleInspection(id)
}
