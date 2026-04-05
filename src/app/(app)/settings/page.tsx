'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Settings,
  Building2,
  CreditCard,
  Calendar,
  Database,
  Save,
  Plus,
  Pencil,
  Trash2,
  Download,
  Layers,
  CheckCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import {
  MOCK_BRANCHES,
  getMockTrialBalance,
  getJournalEntries,
  getAccounts,
  getVehicleInspections,
  getCreditCardTransactions,
  getEstimates,
  getInvoices,
} from '@/lib/mock-data'
import {
  exportJournalEntries,
  exportTrialBalance,
  exportEstimates,
  exportInvoices,
  exportVehicleInspections,
  exportCreditCardTransactions,
  exportAccounts,
} from '@/lib/csv-export'
import type { Branch } from '@/lib/types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface GeneralSettings {
  company_name: string
  company_address: string
  company_phone: string
  company_registration_number: string
  default_tax_mode: 'inclusive' | 'exclusive'
  default_tax_rate: number
}

// ── Tab definitions ───────────────────────────────────────────────────────────

const TABS = [
  { id: 'general', label: '基本設定', icon: Settings },
  { id: 'branches', label: '拠点管理', icon: Building2 },
  { id: 'credit-card', label: 'クレジットカード設定', icon: CreditCard },
  { id: 'fiscal-year', label: '会計期間', icon: Calendar },
  { id: 'data', label: 'データ管理', icon: Database },
] as const

type TabId = (typeof TABS)[number]['id']

// ── General Tab ───────────────────────────────────────────────────────────────

function GeneralTab() {
  const [settings, setSettings] = useState<GeneralSettings>({
    company_name: '株式会社AutoService',
    company_address: '東京都渋谷区1-1-1',
    company_phone: '03-1234-5678',
    company_registration_number: 'T1234567890123',
    default_tax_mode: 'exclusive',
    default_tax_rate: 10,
  })
  const [saved, setSaved] = useState(false)

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm ring-1 ring-gray-100">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-gray-700">会社情報</CardTitle>
          <CardDescription>請求書・見積書に表示される会社情報を設定します</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="company_name" className="text-xs font-medium text-gray-600">会社名</Label>
              <Input
                id="company_name"
                value={settings.company_name}
                onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company_phone" className="text-xs font-medium text-gray-600">電話番号</Label>
              <Input
                id="company_phone"
                value={settings.company_phone}
                onChange={(e) => setSettings({ ...settings, company_phone: e.target.value })}
                className="h-9 text-sm"
              />
            </div>
            <div className="col-span-full space-y-1.5">
              <Label htmlFor="company_address" className="text-xs font-medium text-gray-600">住所</Label>
              <Input
                id="company_address"
                value={settings.company_address}
                onChange={(e) => setSettings({ ...settings, company_address: e.target.value })}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company_reg" className="text-xs font-medium text-gray-600">
                登録番号
                <span className="ml-1 text-gray-400 font-normal">（インボイス）</span>
              </Label>
              <Input
                id="company_reg"
                value={settings.company_registration_number}
                onChange={(e) => setSettings({ ...settings, company_registration_number: e.target.value })}
                className="h-9 text-sm font-mono"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm ring-1 ring-gray-100">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-gray-700">税設定</CardTitle>
          <CardDescription>見積書・請求書作成時のデフォルト税設定</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-600">デフォルト税区分</Label>
              <div className="flex rounded-lg overflow-hidden border border-gray-200">
                <button
                  onClick={() => setSettings({ ...settings, default_tax_mode: 'exclusive' })}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${
                    settings.default_tax_mode === 'exclusive'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  税抜（外税）
                </button>
                <button
                  onClick={() => setSettings({ ...settings, default_tax_mode: 'inclusive' })}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${
                    settings.default_tax_mode === 'inclusive'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  税込（内税）
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-600">デフォルト税率</Label>
              <div className="flex rounded-lg overflow-hidden border border-gray-200">
                {[10, 8].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => setSettings({ ...settings, default_tax_rate: rate })}
                    className={`flex-1 py-2 text-xs font-medium transition-colors ${
                      settings.default_tax_rate === rate
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {rate}%
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-400">※ 8%は軽減税率対象品目に適用</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
        >
          {saved ? (
            <>
              <CheckCircle className="w-4 h-4" />
              保存しました
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              設定を保存
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

// ── Branches Tab ──────────────────────────────────────────────────────────────

function BranchesTab() {
  const [branches, setBranches] = useState<Branch[]>(MOCK_BRANCHES)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Branch>>({})
  const [newForm, setNewForm] = useState({ name: '', code: '', address: '', phone: '' })

  function startEdit(branch: Branch) {
    setEditingId(branch.id)
    setEditForm({ ...branch })
  }

  function saveEdit() {
    setBranches((prev) =>
      prev.map((b) => (b.id === editingId ? { ...b, ...editForm } : b))
    )
    setEditingId(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm({})
  }

  function addBranch() {
    if (!newForm.name || !newForm.code) return
    const newBranch: Branch = {
      id: `branch-${Date.now()}`,
      name: newForm.name,
      code: newForm.code,
      address: newForm.address || undefined,
      phone: newForm.phone || undefined,
      created_at: new Date().toISOString(),
    }
    setBranches((prev) => [...prev, newBranch])
    setNewForm({ name: '', code: '', address: '', phone: '' })
    setShowAddForm(false)
  }

  function deleteBranch(id: string) {
    if (branches.length <= 1) return
    setBranches((prev) => prev.filter((b) => b.id !== id))
  }

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm ring-1 ring-gray-100">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-gray-700">拠点一覧</CardTitle>
              <CardDescription>会社の拠点（店舗・支店）を管理します</CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => setShowAddForm(!showAddForm)}
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8"
            >
              <Plus className="w-3.5 h-3.5" />
              拠点を追加
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <AnimatePresence>
            {showAddForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 overflow-hidden"
              >
                <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 space-y-3">
                  <p className="text-xs font-semibold text-indigo-700">新規拠点を追加</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-600">拠点名 *</Label>
                      <Input
                        value={newForm.name}
                        onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                        placeholder="例：南支店"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-600">拠点コード *</Label>
                      <Input
                        value={newForm.code}
                        onChange={(e) => setNewForm({ ...newForm, code: e.target.value.toUpperCase() })}
                        placeholder="例：STH"
                        className="h-8 text-sm font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-600">住所</Label>
                      <Input
                        value={newForm.address}
                        onChange={(e) => setNewForm({ ...newForm, address: e.target.value })}
                        placeholder="例：東京都港区..."
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-600">電話番号</Label>
                      <Input
                        value={newForm.phone}
                        onChange={(e) => setNewForm({ ...newForm, phone: e.target.value })}
                        placeholder="例：03-xxxx-xxxx"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAddForm(false)}
                      className="h-8 text-xs"
                    >
                      キャンセル
                    </Button>
                    <Button
                      size="sm"
                      onClick={addBranch}
                      disabled={!newForm.name || !newForm.code}
                      className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      追加する
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            {branches.map((branch) => (
              <div
                key={branch.id}
                className="rounded-xl border border-gray-100 bg-gray-50/50 overflow-hidden"
              >
                {editingId === branch.id ? (
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-600">拠点名</Label>
                        <Input
                          value={editForm.name ?? ''}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-600">拠点コード</Label>
                        <Input
                          value={editForm.code ?? ''}
                          onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                          className="h-8 text-sm font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-600">住所</Label>
                        <Input
                          value={editForm.address ?? ''}
                          onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-600">電話番号</Label>
                        <Input
                          value={editForm.phone ?? ''}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="outline" onClick={cancelEdit} className="h-7 text-xs">
                        キャンセル
                      </Button>
                      <Button
                        size="sm"
                        onClick={saveEdit}
                        className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        保存
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-gray-100 shrink-0">
                        <Building2 className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-800">{branch.name}</p>
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-mono">
                            {branch.code}
                          </Badge>
                        </div>
                        {(branch.address || branch.phone) && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">
                            {[branch.address, branch.phone].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(branch)}
                        className="h-7 w-7 p-0 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteBranch(branch.id)}
                        disabled={branches.length <= 1}
                        className="h-7 w-7 p-0 text-gray-400 hover:text-rose-500 hover:bg-rose-50 disabled:opacity-30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {branches.length <= 1 && (
            <p className="text-xs text-gray-400 text-center mt-3">
              最後の拠点は削除できません
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ── Credit Card Tab ───────────────────────────────────────────────────────────

function CreditCardTab() {
  const [feeRate, setFeeRate] = useState('3.20')
  const [cardCompany, setCardCompany] = useState('JCB / Visa / Mastercard')
  const [settlementCycle, setSettlementCycle] = useState('月末締め翌月払い')
  const [saved, setSaved] = useState(false)

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm ring-1 ring-gray-100">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-gray-700">クレジットカード手数料設定</CardTitle>
          <CardDescription>クレジットカード決済の手数料率と精算サイクルを設定します</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="fee_rate" className="text-xs font-medium text-gray-600">
                手数料率 (%)
              </Label>
              <div className="relative">
                <Input
                  id="fee_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  value={feeRate}
                  onChange={(e) => setFeeRate(e.target.value)}
                  className="h-9 text-sm pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
              </div>
              <p className="text-[11px] text-gray-400">
                例: 3.25 → 売上100,000円に対して手数料3,250円
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="card_company" className="text-xs font-medium text-gray-600">
                取扱カード会社
                <span className="ml-1 text-gray-400 font-normal">（任意）</span>
              </Label>
              <Input
                id="card_company"
                value={cardCompany}
                onChange={(e) => setCardCompany(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="settlement_cycle" className="text-xs font-medium text-gray-600">
                精算サイクル
              </Label>
              <Input
                id="settlement_cycle"
                value={settlementCycle}
                onChange={(e) => setSettlementCycle(e.target.value)}
                className="h-9 text-sm"
              />
              <p className="text-[11px] text-gray-400">
                例: 月末締め翌月払い、20日締め翌月10日払い
              </p>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-indigo-50 border border-indigo-100">
            <p className="text-xs font-medium text-indigo-700 mb-1">手数料プレビュー</p>
            <p className="text-xs text-indigo-600">
              売上 ¥100,000 → 手数料 ¥{Math.round(100000 * (parseFloat(feeRate) / 100)).toLocaleString('ja-JP')} →
              入金額 ¥{(100000 - Math.round(100000 * (parseFloat(feeRate) / 100))).toLocaleString('ja-JP')}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
        >
          {saved ? (
            <>
              <CheckCircle className="w-4 h-4" />
              保存しました
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              設定を保存
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

// ── Fiscal Year Tab ───────────────────────────────────────────────────────────

interface FiscalYearEntry {
  id: string
  start_date: string
  end_date: string
  is_current: boolean
}

function FiscalYearTab() {
  const [fiscalYears, setFiscalYears] = useState<FiscalYearEntry[]>([
    { id: 'fy-2024', start_date: '2024-04-01', end_date: '2025-03-31', is_current: false },
    { id: 'fy-2025', start_date: '2025-04-01', end_date: '2026-03-31', is_current: true },
  ])
  const [showNew, setShowNew] = useState(false)
  const [newStart, setNewStart] = useState('2026-04-01')
  const [newEnd, setNewEnd] = useState('2027-03-31')

  function createFiscalYear() {
    if (!newStart || !newEnd) return
    const newFY: FiscalYearEntry = {
      id: `fy-${Date.now()}`,
      start_date: newStart,
      end_date: newEnd,
      is_current: false,
    }
    setFiscalYears((prev) => [...prev, newFY])
    setShowNew(false)
  }

  function setCurrent(id: string) {
    setFiscalYears((prev) =>
      prev.map((fy) => ({ ...fy, is_current: fy.id === id }))
    )
  }

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm ring-1 ring-gray-100">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-gray-700">会計期間管理</CardTitle>
              <CardDescription>会計年度を管理します</CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => setShowNew(!showNew)}
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8"
            >
              <Plus className="w-3.5 h-3.5" />
              新規作成
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <AnimatePresence>
            {showNew && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 overflow-hidden"
              >
                <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 space-y-3">
                  <p className="text-xs font-semibold text-indigo-700">新しい会計期間</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-600">開始日</Label>
                      <Input
                        type="date"
                        value={newStart}
                        onChange={(e) => setNewStart(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-600">終了日</Label>
                      <Input
                        type="date"
                        value={newEnd}
                        onChange={(e) => setNewEnd(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="outline" onClick={() => setShowNew(false)} className="h-7 text-xs">
                      キャンセル
                    </Button>
                    <Button
                      size="sm"
                      onClick={createFiscalYear}
                      className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      作成する
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            {fiscalYears.map((fy) => (
              <div
                key={fy.id}
                className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border ${
                  fy.is_current
                    ? 'bg-indigo-50 border-indigo-200'
                    : 'bg-gray-50/50 border-gray-100'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${fy.is_current ? 'bg-indigo-600' : 'bg-white border border-gray-200'}`}>
                    <Calendar className={`w-4 h-4 ${fy.is_current ? 'text-white' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-800">
                        {fy.start_date} 〜 {fy.end_date}
                      </p>
                      {fy.is_current && (
                        <Badge className="text-[10px] h-4 px-1.5 bg-indigo-600 text-white">
                          当期
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">
                      {new Date(fy.start_date).getFullYear()}年度
                    </p>
                  </div>
                </div>
                {!fy.is_current && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrent(fy.id)}
                    className="h-7 text-xs shrink-0"
                  >
                    当期に設定
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Data Tab ──────────────────────────────────────────────────────────────────

function DataTab() {
  const [seeding, setSeeding] = useState(false)
  const [seeded, setSeeded] = useState(false)

  function handleSeedData() {
    setSeeding(true)
    setTimeout(() => {
      setSeeding(false)
      setSeeded(true)
      setTimeout(() => setSeeded(false), 3000)
    }, 1500)
  }

  async function handleExportAll() {
    const today = new Date().toISOString().split('T')[0]
    const startOfYear = `${new Date().getFullYear()}-01-01`
    const period = new Date().toISOString().slice(0, 7)
    const [journals, accounts, inspections, transactions, estimates, invoices] = await Promise.all([
      getJournalEntries(),
      getAccounts(),
      getVehicleInspections(),
      getCreditCardTransactions(),
      getEstimates(),
      getInvoices(),
    ])
    const trialBalance = getMockTrialBalance()

    exportJournalEntries(journals, accounts, startOfYear, today)
    setTimeout(() => exportTrialBalance(trialBalance, period), 300)
    setTimeout(() => exportEstimates(estimates, startOfYear, today), 600)
    setTimeout(() => exportInvoices(invoices, startOfYear, today), 900)
    setTimeout(() => exportVehicleInspections(inspections, startOfYear, today), 1200)
    setTimeout(() => exportCreditCardTransactions(transactions, startOfYear, today), 1500)
    setTimeout(() => exportAccounts(accounts), 1800)
  }

  const exportItems = [
    {
      label: '仕訳帳 (CSV)',
      desc: '仕訳一覧を CSV 形式でエクスポート',
      onClick: async () => {
        const today = new Date().toISOString().split('T')[0]
        const start = `${new Date().getFullYear()}-01-01`
        const [journals, accounts] = await Promise.all([getJournalEntries(), getAccounts()])
        exportJournalEntries(journals, accounts, start, today)
      },
    },
    {
      label: '試算表 (CSV)',
      desc: '試算表を CSV 形式でエクスポート',
      onClick: () => {
        const period = new Date().toISOString().slice(0, 7)
        exportTrialBalance(getMockTrialBalance(), period)
      },
    },
    {
      label: '見積書一覧 (CSV)',
      desc: '見積書データをエクスポート',
      onClick: async () => {
        const today = new Date().toISOString().split('T')[0]
        const start = `${new Date().getFullYear()}-01-01`
        const estimates = await getEstimates()
        exportEstimates(estimates, start, today)
      },
    },
    {
      label: '請求書一覧 (CSV)',
      desc: '請求書・入金状況をエクスポート',
      onClick: async () => {
        const today = new Date().toISOString().split('T')[0]
        const start = `${new Date().getFullYear()}-01-01`
        const invoices = await getInvoices()
        exportInvoices(invoices, start, today)
      },
    },
    {
      label: '車検一覧 (CSV)',
      desc: '車検データをエクスポート',
      onClick: async () => {
        const today = new Date().toISOString().split('T')[0]
        const start = `${new Date().getFullYear()}-01-01`
        const inspections = await getVehicleInspections()
        exportVehicleInspections(inspections, start, today)
      },
    },
    {
      label: 'クレカ決済 (CSV)',
      desc: 'クレジットカード決済データをエクスポート',
      onClick: async () => {
        const today = new Date().toISOString().split('T')[0]
        const start = `${new Date().getFullYear()}-01-01`
        const transactions = await getCreditCardTransactions()
        exportCreditCardTransactions(transactions, start, today)
      },
    },
    {
      label: '勘定科目一覧 (CSV)',
      desc: '勘定科目マスタをエクスポート',
      onClick: async () => {
        const accounts = await getAccounts()
        exportAccounts(accounts)
      },
    },
  ]

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm ring-1 ring-gray-100">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-gray-700">データエクスポート</CardTitle>
              <CardDescription>会計データを CSV 形式でエクスポートします（UTF-8 BOM付き・Excel対応）</CardDescription>
            </div>
            <Button
              size="sm"
              onClick={handleExportAll}
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              全データ一括エクスポート
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {exportItems.map((item) => (
              <button
                key={item.label}
                onClick={item.onClick}
                className="flex items-start gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-indigo-50 hover:border-indigo-200 transition-all text-left group"
              >
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white border border-gray-100 group-hover:border-indigo-200 group-hover:bg-indigo-100 transition-colors shrink-0">
                  <Download className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-800 group-hover:text-indigo-700">{item.label}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{item.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm ring-1 ring-gray-100">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-gray-700">デモデータ管理</CardTitle>
          <CardDescription>テスト用のサンプルデータを操作します</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-amber-50 border border-amber-100">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-100 shrink-0">
                <Layers className="w-4 h-4 text-amber-700" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-800">デモデータを投入</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  サンプルの仕訳・請求書・車検データを生成します。既存データは上書きされません。
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleSeedData}
              disabled={seeding}
              className="shrink-0 h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white"
            >
              {seeding ? (
                '生成中...'
              ) : seeded ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5 mr-1" />
                  完了
                </>
              ) : (
                'データ投入'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('general')

  return (
    <div className="space-y-6">
      <PageHeader
        title="設定"
        description="アプリケーションの設定・拠点・会計期間を管理します"
      />

      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150 shrink-0 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'general' && <GeneralTab />}
          {activeTab === 'branches' && <BranchesTab />}
          {activeTab === 'credit-card' && <CreditCardTab />}
          {activeTab === 'fiscal-year' && <FiscalYearTab />}
          {activeTab === 'data' && <DataTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
