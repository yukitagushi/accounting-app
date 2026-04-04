'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '@/lib/mock-data'
import type { Customer } from '@/lib/types'
import {
  Users,
  Plus,
  Search,
  Upload,
  Pencil,
  Trash2,
  Download,
  X,
  Building2,
  Phone,
  Mail,
  User,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'

// ---------------------------------------------------------------------------
// CSV helpers (no external dependency)
// ---------------------------------------------------------------------------

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        result.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
  }
  result.push(current.trim())
  return result
}

function parseCSV(text: string): string[][] {
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((l) => l.trim() !== '')
  return lines.map(parseCSVLine)
}

const CSV_COLUMN_MAP: Record<string, keyof Customer> = {
  顧客コード: 'customer_code',
  顧客名: 'name',
  フリガナ: 'name_kana',
  住所: 'address',
  電話番号: 'phone',
  FAX: 'fax',
  メール: 'email',
  担当者: 'contact_person',
  支払条件: 'payment_terms',
  備考: 'notes',
}

function mapCSVRowToCustomer(
  headers: string[],
  row: string[]
): Partial<Customer> {
  const data: Record<string, string> = {}
  headers.forEach((h, i) => {
    const key = CSV_COLUMN_MAP[h]
    if (key && row[i]) {
      data[key] = row[i]
    }
  })
  return data
}

function customerToCSVRow(c: Customer): string {
  const fields = [
    c.customer_code,
    c.name,
    c.name_kana ?? '',
    c.address,
    c.phone ?? '',
    c.fax ?? '',
    c.email ?? '',
    c.contact_person ?? '',
    c.payment_terms ?? '',
    c.notes ?? '',
  ]
  return fields.map((f) => (f.includes(',') || f.includes('"') ? `"${f.replace(/"/g, '""')}"` : f)).join(',')
}

function generateCSV(customers: Customer[]): string {
  const header = '顧客コード,顧客名,フリガナ,住所,電話番号,FAX,メール,担当者,支払条件,備考'
  const rows = customers.map(customerToCSVRow)
  return [header, ...rows].join('\n')
}

// ---------------------------------------------------------------------------
// Customer Form Dialog
// ---------------------------------------------------------------------------

type CustomerFormData = {
  customer_code: string
  name: string
  name_kana: string
  address: string
  phone: string
  fax: string
  email: string
  contact_person: string
  payment_terms: string
  notes: string
}

const EMPTY_FORM: CustomerFormData = {
  customer_code: '',
  name: '',
  name_kana: '',
  address: '',
  phone: '',
  fax: '',
  email: '',
  contact_person: '',
  payment_terms: '',
  notes: '',
}

function customerToForm(c: Customer): CustomerFormData {
  return {
    customer_code: c.customer_code,
    name: c.name,
    name_kana: c.name_kana ?? '',
    address: c.address,
    phone: c.phone ?? '',
    fax: c.fax ?? '',
    email: c.email ?? '',
    contact_person: c.contact_person ?? '',
    payment_terms: c.payment_terms ?? '',
    notes: c.notes ?? '',
  }
}

interface CustomerDialogProps {
  title: string
  initial?: CustomerFormData
  onClose: () => void
  onSave: (data: CustomerFormData) => void
  saving?: boolean
}

function CustomerDialog({ title, initial, onClose, onSave, saving }: CustomerDialogProps) {
  const [form, setForm] = useState<CustomerFormData>(initial ?? EMPTY_FORM)

  const set = (key: keyof CustomerFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const errors: Record<string, string> = {}
  if (!form.customer_code.trim()) errors.customer_code = '顧客コードは必須です'
  if (!form.name.trim()) errors.name = '顧客名は必須です'
  if (!form.address.trim()) errors.address = '住所は必須です'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cust-code">顧客コード <span className="text-red-500">*</span></Label>
              <Input id="cust-code" value={form.customer_code} onChange={set('customer_code')} placeholder="C-007" aria-invalid={!!errors.customer_code} />
              {errors.customer_code && <p className="text-xs text-red-500">{errors.customer_code}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cust-name">顧客名 <span className="text-red-500">*</span></Label>
              <Input id="cust-name" value={form.name} onChange={set('name')} placeholder="株式会社サンプル" aria-invalid={!!errors.name} />
              {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cust-kana">フリガナ</Label>
            <Input id="cust-kana" value={form.name_kana} onChange={set('name_kana')} placeholder="カブシキガイシャサンプル" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cust-address">住所 <span className="text-red-500">*</span></Label>
            <Input id="cust-address" value={form.address} onChange={set('address')} placeholder="〒000-0000 東京都..." aria-invalid={!!errors.address} />
            {errors.address && <p className="text-xs text-red-500">{errors.address}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cust-phone">電話番号</Label>
              <Input id="cust-phone" value={form.phone} onChange={set('phone')} placeholder="03-1234-5678" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cust-fax">FAX</Label>
              <Input id="cust-fax" value={form.fax} onChange={set('fax')} placeholder="03-1234-5679" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cust-email">メール</Label>
              <Input id="cust-email" type="email" value={form.email} onChange={set('email')} placeholder="info@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cust-contact">担当者</Label>
              <Input id="cust-contact" value={form.contact_person} onChange={set('contact_person')} placeholder="山田 太郎" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cust-payment">支払条件</Label>
            <Input id="cust-payment" value={form.payment_terms} onChange={set('payment_terms')} placeholder="月末締め翌月末払い" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cust-notes">備考</Label>
            <textarea
              id="cust-notes"
              value={form.notes}
              onChange={set('notes')}
              rows={2}
              className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none"
              placeholder="メモ・備考"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-5 border-t border-gray-100 bg-gray-50 shrink-0">
          <Button variant="outline" onClick={onClose} className="flex-1">
            キャンセル
          </Button>
          <Button
            onClick={() => {
              if (Object.keys(errors).length === 0) onSave(form)
            }}
            disabled={Object.keys(errors).length > 0 || saving}
            className="flex-1"
          >
            <Check className="w-4 h-4 mr-1" />
            保存
          </Button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// CSV Import Dialog
// ---------------------------------------------------------------------------

interface CSVImportDialogProps {
  onClose: () => void
  onImport: (rows: Partial<Customer>[]) => void
  importing?: boolean
}

function CSVImportDialog({ onClose, onImport, importing }: CSVImportDialogProps) {
  const [parsed, setParsed] = useState<{ headers: string[]; rows: string[][] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string
        const allRows = parseCSV(text)
        if (allRows.length < 2) {
          setError('CSVにデータ行がありません')
          return
        }
        const headers = allRows[0]
        const requiredCols = ['顧客コード', '顧客名', '住所']
        const missing = requiredCols.filter((c) => !headers.includes(c))
        if (missing.length > 0) {
          setError(`必須列が見つかりません: ${missing.join(', ')}`)
          return
        }
        setParsed({ headers, rows: allRows.slice(1) })
      } catch {
        setError('CSVの解析に失敗しました')
      }
    }
    reader.readAsText(file, 'UTF-8')
  }

  const handleImport = () => {
    if (!parsed) return
    const customerRows = parsed.rows.map((row) => mapCSVRowToCustomer(parsed.headers, row))
    onImport(customerRows)
  }

  const previewRows = parsed ? parsed.rows.slice(0, 5) : []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-bold text-gray-900">CSVインポート</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="space-y-2">
            <Label>CSVファイルを選択</Label>
            <Input ref={fileRef} type="file" accept=".csv" onChange={handleFile} />
            <p className="text-xs text-gray-400">
              必須列: 顧客コード, 顧客名, 住所 / 任意列: フリガナ, 電話番号, FAX, メール, 担当者, 支払条件, 備考
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {parsed && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">
                プレビュー ({parsed.rows.length}件中 最大5件表示)
              </p>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {parsed.headers.map((h, i) => (
                        <th key={i} className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {previewRows.map((row, ri) => (
                      <tr key={ri} className="hover:bg-gray-50/50">
                        {parsed.headers.map((_, ci) => (
                          <td key={ci} className="px-3 py-2 whitespace-nowrap text-gray-700">
                            {row[ci] ?? ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 p-5 border-t border-gray-100 bg-gray-50 shrink-0">
          <Button variant="outline" onClick={onClose} className="flex-1">
            キャンセル
          </Button>
          <Button onClick={handleImport} disabled={!parsed || importing} className="flex-1">
            <Upload className="w-4 h-4 mr-1" />
            {importing ? 'インポート中...' : `インポート (${parsed?.rows.length ?? 0}件)`}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Delete Confirmation Dialog
// ---------------------------------------------------------------------------

interface DeleteDialogProps {
  customer: Customer
  onClose: () => void
  onConfirm: () => void
  deleting?: boolean
}

function DeleteDialog({ customer, onClose, onConfirm, deleting }: DeleteDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="p-5 space-y-3">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mx-auto">
            <Trash2 className="w-5 h-5 text-red-500" />
          </div>
          <h2 className="text-base font-bold text-gray-900 text-center">顧客を削除</h2>
          <p className="text-sm text-gray-500 text-center">
            <span className="font-medium text-gray-700">{customer.name}</span> を削除しますか？<br />
            この操作は元に戻せません。
          </p>
        </div>
        <div className="flex gap-2 p-5 border-t border-gray-100 bg-gray-50">
          <Button variant="outline" onClick={onClose} className="flex-1">
            キャンセル
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={deleting} className="flex-1">
            <Trash2 className="w-4 h-4 mr-1" />
            {deleting ? '削除中...' : '削除'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Customer | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null)
  const [csvDialogOpen, setCsvDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Load customers on mount
  useEffect(() => {
    getCustomers().then((data) => {
      setCustomers(data)
      setLoading(false)
    })
  }, [])

  // Filtered customers
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return customers
    const keywords = searchQuery.toLowerCase().split(/\s+/)
    return customers.filter((c) => {
      const searchable = [
        c.customer_code,
        c.name,
        c.name_kana ?? '',
        c.address,
        c.phone ?? '',
        c.contact_person ?? '',
      ]
        .join(' ')
        .toLowerCase()
      return keywords.every((kw) => searchable.includes(kw))
    })
  }, [customers, searchQuery])

  // Handlers
  const handleAdd = useCallback(async (form: CustomerFormData) => {
    setSaving(true)
    try {
      const created = await createCustomer({
        customer_code: form.customer_code,
        name: form.name,
        name_kana: form.name_kana || undefined,
        address: form.address,
        phone: form.phone || undefined,
        fax: form.fax || undefined,
        email: form.email || undefined,
        contact_person: form.contact_person || undefined,
        payment_terms: form.payment_terms || undefined,
        notes: form.notes || undefined,
      })
      setCustomers((prev) => [...prev, created])
      setAddDialogOpen(false)
      toast.success('顧客を登録しました')
    } catch {
      toast.error('登録に失敗しました')
    } finally {
      setSaving(false)
    }
  }, [])

  const handleEdit = useCallback(
    async (form: CustomerFormData) => {
      if (!editTarget) return
      setSaving(true)
      try {
        const updated = await updateCustomer(editTarget.id, {
          customer_code: form.customer_code,
          name: form.name,
          name_kana: form.name_kana || undefined,
          address: form.address,
          phone: form.phone || undefined,
          fax: form.fax || undefined,
          email: form.email || undefined,
          contact_person: form.contact_person || undefined,
          payment_terms: form.payment_terms || undefined,
          notes: form.notes || undefined,
        })
        if (updated) {
          setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
          toast.success('顧客情報を更新しました')
        }
        setEditTarget(null)
      } catch {
        toast.error('更新に失敗しました')
      } finally {
        setSaving(false)
      }
    },
    [editTarget]
  )

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    setSaving(true)
    try {
      const ok = await deleteCustomer(deleteTarget.id)
      if (ok) {
        setCustomers((prev) => prev.filter((c) => c.id !== deleteTarget.id))
        toast.success('顧客を削除しました')
      }
      setDeleteTarget(null)
    } catch {
      toast.error('削除に失敗しました')
    } finally {
      setSaving(false)
    }
  }, [deleteTarget])

  const handleCSVImport = useCallback(async (rows: Partial<Customer>[]) => {
    setSaving(true)
    try {
      const created: Customer[] = []
      for (const row of rows) {
        const c = await createCustomer(row)
        created.push(c)
      }
      setCustomers((prev) => [...prev, ...created])
      setCsvDialogOpen(false)
      toast.success(`${created.length}件の顧客をインポートしました`)
    } catch {
      toast.error('インポートに失敗しました')
    } finally {
      setSaving(false)
    }
  }, [])

  const handleExportCSV = useCallback(() => {
    const csv = generateCSV(filtered)
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `顧客一覧_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSVをダウンロードしました')
  }, [filtered])

  return (
    <div>
      <PageHeader
        title="顧客管理"
        description="顧客情報の管理・検索"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setCsvDialogOpen(true)} className="gap-1.5">
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">CSVインポート</span>
            </Button>
            <Button variant="outline" onClick={handleExportCSV} className="gap-1.5">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">CSVエクスポート</span>
            </Button>
            <Button onClick={() => setAddDialogOpen(true)} className="gap-1.5">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">顧客追加</span>
            </Button>
          </div>
        }
      />

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="顧客名、コード、住所、電話番号で検索..."
          className="pl-9"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <Users className="w-4 h-4" />
          <span>{filtered.length}件</span>
          {searchQuery && <span className="text-gray-400">/ {customers.length}件中</span>}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full" />
          <span className="ml-3 text-sm">読み込み中...</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Building2 className="w-12 h-12 mb-3 text-gray-300" />
          {searchQuery ? (
            <p className="text-sm">検索条件に一致する顧客が見つかりません</p>
          ) : (
            <>
              <p className="text-sm mb-3">顧客が登録されていません</p>
              <Button onClick={() => setAddDialogOpen(true)} className="gap-1.5">
                <Plus className="w-4 h-4" />
                最初の顧客を追加
              </Button>
            </>
          )}
        </div>
      )}

      {/* Desktop Table */}
      {!loading && filtered.length > 0 && (
        <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">コード</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">顧客名</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">住所</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">電話番号</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">担当者</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">支払条件</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((customer) => (
                  <tr
                    key={customer.id}
                    className="hover:bg-gray-50/50 group transition-colors cursor-pointer"
                    onClick={() => setEditTarget(customer)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs text-gray-400 font-mono">{customer.customer_code}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{customer.name}</div>
                      {customer.name_kana && (
                        <div className="text-xs text-gray-400">{customer.name_kana}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">{customer.address}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{customer.phone ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{customer.contact_person ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">{customer.payment_terms ?? '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditTarget(customer)
                          }}
                          className="text-gray-400 hover:text-gray-700"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteTarget(customer)
                          }}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mobile Card List */}
      {!loading && filtered.length > 0 && (
        <div className="md:hidden space-y-3">
          {filtered.map((customer) => (
            <div
              key={customer.id}
              className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 active:bg-gray-50 transition-colors"
              onClick={() => setEditTarget(customer)}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 font-mono">{customer.customer_code}</span>
                  </div>
                  <h3 className="font-medium text-gray-900 mt-0.5">{customer.name}</h3>
                  {customer.name_kana && (
                    <p className="text-xs text-gray-400">{customer.name_kana}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditTarget(customer)
                    }}
                    className="text-gray-400 hover:text-gray-700"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteTarget(customer)
                    }}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-1.5 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="truncate">{customer.address}</span>
                </div>
                {customer.phone && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>{customer.phone}</span>
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                )}
                {customer.contact_person && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>{customer.contact_person}</span>
                  </div>
                )}
              </div>

              {customer.payment_terms && (
                <div className="pt-2 border-t border-gray-100">
                  <span className="text-xs text-gray-400">{customer.payment_terms}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Dialog */}
      {addDialogOpen && (
        <CustomerDialog
          title="顧客追加"
          onClose={() => setAddDialogOpen(false)}
          onSave={handleAdd}
          saving={saving}
        />
      )}

      {/* Edit Dialog */}
      {editTarget && (
        <CustomerDialog
          title={`編集: ${editTarget.name}`}
          initial={customerToForm(editTarget)}
          onClose={() => setEditTarget(null)}
          onSave={handleEdit}
          saving={saving}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <DeleteDialog
          customer={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          deleting={saving}
        />
      )}

      {/* CSV Import Dialog */}
      {csvDialogOpen && (
        <CSVImportDialog
          onClose={() => setCsvDialogOpen(false)}
          onImport={handleCSVImport}
          importing={saving}
        />
      )}
    </div>
  )
}
