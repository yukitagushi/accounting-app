// Customer (顧客)
export type Customer = {
  id: string
  branch_id: string
  customer_code: string
  name: string
  name_kana?: string
  address: string
  phone?: string
  fax?: string
  email?: string
  contact_person?: string
  payment_terms?: string
  notes?: string
  // 車両情報
  vehicle_model?: string
  vehicle_year?: string
  vehicle_inspection_date?: string
  vehicle_number?: string
  created_at: string
  updated_at: string
}

// Branch
export type Branch = { id: string; name: string; code: string; address?: string; phone?: string; created_at: string }

// User profile
export type UserRole = 'admin' | 'manager' | 'staff'
export type Profile = { id: string; email: string; display_name: string; branch_id: string; role: UserRole; created_at: string }

// Account (勘定科目)
export type AccountCategory = 'assets' | 'liabilities' | 'equity' | 'revenue' | 'expense'
export type Account = { id: string; code: string; name: string; category: AccountCategory; sub_category: string; is_system: boolean; branch_id: string }

// Journal Entry (仕訳)
export type JournalEntryType = 'normal' | 'transfer' | 'vehicle_inspection' | 'payment'
export type JournalEntryStatus = 'draft' | 'posted' | 'void'
export type JournalEntry = {
  id: string; branch_id: string; entry_date: string; description: string
  entry_type: JournalEntryType; status: JournalEntryStatus
  created_by: string; created_at: string; updated_at: string
  lines?: JournalEntryLine[]
}
export type JournalEntryLine = {
  id: string; journal_entry_id: string; account_id: string
  debit_amount: number; credit_amount: number; description: string; line_order: number
  account?: Account
}

// Vehicle Inspection (車検)
export type VehicleInspectionStatus = 'pending' | 'in_progress' | 'completed' | 'settled'
export type VehicleInspection = {
  id: string; branch_id: string; customer_name: string; vehicle_number: string
  inspection_date: string; status: VehicleInspectionStatus
  deposit_jibaiseki: number; deposit_weight_tax: number; deposit_stamp: number
  deposit_maintenance: number; deposit_parts: number; deposit_substitute_car: number; deposit_other: number
  actual_jibaiseki: number; actual_weight_tax: number; actual_stamp: number
  actual_maintenance: number; actual_parts: number; actual_substitute_car: number; actual_other: number
  total_deposit: number; total_actual: number; difference: number
  journal_entry_id?: string; created_at: string
  customer_id?: string; invoice_id?: string; customer?: Customer; invoice?: Invoice
}

// Estimate (見積書)
export type EstimateStatus = 'draft' | 'sent' | 'accepted' | 'rejected'
export type TaxMode = 'inclusive' | 'exclusive'
export type Estimate = {
  id: string; branch_id: string; estimate_number: string
  customer_name: string; customer_address: string
  customer_code?: string
  issue_date: string; valid_until: string; tax_mode: TaxMode
  subtotal: number; tax_amount: number; total: number
  discount?: number
  status: EstimateStatus; notes: string; created_at: string
  vehicle_name?: string
  vehicle_number?: string
  mileage?: number
  first_registration?: string
  next_inspection_date?: string
  delivery_date?: string
  delivery_category?: string
  staff_name?: string
  line_items?: EstimateLineItem[]
}
export type EstimateLineItem = {
  id: string; estimate_id: string; description: string
  category?: string
  quantity: number; unit_price: number; tax_rate: number
  parts_amount?: number
  labor_amount?: number
  amount: number; line_order: number
}

// Invoice (請求書)
export type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'void'
export type Invoice = {
  id: string; branch_id: string; invoice_number: string
  estimate_id?: string; customer_name: string; customer_address: string
  customer_code?: string
  issue_date: string; due_date: string; tax_mode: TaxMode
  subtotal: number; tax_amount: number; total: number
  paid_amount?: number
  discount?: number
  status: InvoiceStatus; payment_date?: string; notes: string; created_at: string
  vehicle_name?: string
  vehicle_number?: string
  mileage?: number
  first_registration?: string
  next_inspection_date?: string
  delivery_date?: string
  delivery_category?: string
  staff_name?: string
  line_items?: InvoiceLineItem[]
}
export type InvoiceLineItem = {
  id: string; invoice_id: string; description: string
  category?: string
  quantity: number; unit_price: number; tax_rate: number
  parts_amount?: number
  labor_amount?: number
  amount: number; line_order: number
}

// Credit Card Transaction
export type CreditCardStatus = 'pending' | 'settled'
export type CreditCardTransaction = {
  id: string; branch_id: string; transaction_date: string
  customer_name: string; gross_amount: number; fee_rate: number
  fee_amount: number; net_amount: number; status: CreditCardStatus
  settlement_date?: string; journal_entry_id?: string; created_at: string
}

// App Settings
export type AppSettings = {
  credit_card_fee_rate: number
  default_tax_mode: TaxMode
  default_tax_rate: number
  company_name: string
  company_address: string
  company_phone: string
  company_registration_number: string
}

// Fiscal Year
export type FiscalYear = {
  id: string; branch_id: string; start_date: string; end_date: string; is_current: boolean
}

// Payment (入金)
export type PaymentMethod = 'cash' | 'bank_transfer' | 'credit_card' | 'other'

export type Payment = {
  id: string; branch_id: string; payment_number: string; invoice_id: string
  payment_date: string; amount: number; payment_method: PaymentMethod
  description: string; journal_entry_id?: string; created_at: string
  invoice?: Invoice
}

// Inspection Journal Entry
export type InspectionJournalEntryPurpose = 'advance' | 'invoice' | 'payment' | 'settlement'

export type InspectionJournalEntry = {
  id: string; inspection_id: string; journal_entry_id: string
  entry_purpose: InspectionJournalEntryPurpose; created_at: string
  journal_entry?: JournalEntry
}
