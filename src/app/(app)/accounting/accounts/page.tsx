'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getAccounts } from '@/lib/mock-data'
import { ACCOUNT_CATEGORIES } from '@/lib/constants'
import type { Account, AccountCategory } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  Plus,
  ChevronDown,
  ChevronRight,
  Pencil,
  Lock,
  X,
  Check,
} from 'lucide-react'

const CATEGORY_ORDER: AccountCategory[] = ['assets', 'liabilities', 'equity', 'revenue', 'expense']

interface AccountDialogProps {
  title: string
  account?: Account
  onClose: () => void
  onSave: (data: { code: string; name: string; category: AccountCategory; sub_category: string }) => void
}

function AccountDialog({ title, account, onClose, onSave }: AccountDialogProps) {
  const [code, setCode] = useState(account?.code ?? '')
  const [name, setName] = useState(account?.name ?? '')
  const [category, setCategory] = useState<AccountCategory>(account?.category ?? 'assets')
  const [subCategory, setSubCategory] = useState(account?.sub_category ?? '')

  const errors: Record<string, string> = {}
  if (!code.trim()) errors.code = '科目コードは必須です'
  if (!name.trim()) errors.name = '科目名は必須です'
  if (!subCategory.trim()) errors.subCategory = 'サブカテゴリは必須です'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="acct-code">科目コード <span className="text-red-500">*</span></Label>
              <Input
                id="acct-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="1000"
                aria-invalid={!!errors.code}
              />
              {errors.code && <p className="text-xs text-red-500">{errors.code}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acct-category">カテゴリ <span className="text-red-500">*</span></Label>
              <select
                id="acct-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as AccountCategory)}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              >
                {CATEGORY_ORDER.map((cat) => (
                  <option key={cat} value={cat}>
                    {ACCOUNT_CATEGORIES[cat]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="acct-name">科目名 <span className="text-red-500">*</span></Label>
            <Input
              id="acct-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="普通預金"
              aria-invalid={!!errors.name}
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="acct-sub">サブカテゴリ <span className="text-red-500">*</span></Label>
            <Input
              id="acct-sub"
              value={subCategory}
              onChange={(e) => setSubCategory(e.target.value)}
              placeholder="流動資産"
              aria-invalid={!!errors.subCategory}
            />
            {errors.subCategory && <p className="text-xs text-red-500">{errors.subCategory}</p>}
          </div>
        </div>

        <div className="flex gap-2 p-5 border-t border-gray-100 bg-gray-50">
          <Button variant="outline" onClick={onClose} className="flex-1">
            キャンセル
          </Button>
          <Button
            onClick={() => {
              if (Object.keys(errors).length === 0) {
                onSave({ code, name, category, sub_category: subCategory })
              }
            }}
            disabled={Object.keys(errors).length > 0}
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

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [collapsed, setCollapsed] = useState<Set<AccountCategory>>(new Set())
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editAccount, setEditAccount] = useState<Account | null>(null)

  useEffect(() => {
    getAccounts().then(setAccounts)
  }, [])

  const grouped = useMemo(() => {
    const map = {} as Record<AccountCategory, Account[]>
    for (const cat of CATEGORY_ORDER) {
      map[cat] = accounts.filter((a) => a.category === cat).sort((a, b) => a.code.localeCompare(b.code))
    }
    return map
  }, [accounts])

  function toggleCategory(cat: AccountCategory) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  function handleAdd(data: { code: string; name: string; category: AccountCategory; sub_category: string }) {
    const newAcct: Account = {
      id: `acct-${Date.now()}`,
      branch_id: 'branch-1',
      is_system: false,
      ...data,
    }
    setAccounts((prev) => [...prev, newAcct])
    setAddDialogOpen(false)
  }

  function handleEdit(data: { code: string; name: string; category: AccountCategory; sub_category: string }) {
    if (!editAccount) return
    setAccounts((prev) =>
      prev.map((a) => (a.id === editAccount.id ? { ...a, ...data } : a))
    )
    setEditAccount(null)
  }

  return (
    <div>
      <PageHeader
        title="勘定科目"
        description="会計で使用する勘定科目を管理します"
        actions={
          <Button onClick={() => setAddDialogOpen(true)} className="gap-1.5">
            <Plus className="w-4 h-4" />
            勘定科目追加
          </Button>
        }
      />

      {/* Sub-navigation Tabs */}
      <div className="flex gap-0.5 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {[
          { label: '試算表', href: '/accounting' },
          { label: '勘定科目', href: '/accounting/accounts', active: true },
          { label: 'クレジットカード', href: '/accounting/credit-card' },
        ].map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
              tab.active
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Account Groups */}
      <div className="space-y-3">
        {CATEGORY_ORDER.map((cat) => {
          const catAccounts = grouped[cat]
          const isCollapsed = collapsed.has(cat)
          return (
            <div key={cat} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Category Header */}
              <button
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                onClick={() => toggleCategory(cat)}
              >
                <div className="flex items-center gap-3">
                  {isCollapsed ? (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                  <span className="font-semibold text-gray-900">{ACCOUNT_CATEGORIES[cat]}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {catAccounts.length}件
                  </span>
                </div>
              </button>

              {/* Account List */}
              {!isCollapsed && (
                <div className="border-t border-gray-100">
                  {catAccounts.length === 0 ? (
                    <p className="text-sm text-gray-400 py-4 px-4 pl-11">
                      勘定科目がありません
                    </p>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {catAccounts.map((account) => (
                        <div
                          key={account.id}
                          className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50/50 group transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-xs text-gray-400 font-mono w-12 shrink-0">
                              {account.code}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900 truncate">
                                  {account.name}
                                </span>
                                {account.is_system && (
                                  <Lock className="w-3 h-3 text-gray-300 shrink-0" aria-label="システム科目" />
                                )}
                              </div>
                              <p className="text-xs text-gray-400">{account.sub_category}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setEditAccount(account)}
                              className="text-gray-400 hover:text-gray-700"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            {!account.is_system && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => {
                                  if (!confirm('この勘定科目を削除しますか？')) return
                                  setAccounts((prev) => prev.filter((a) => a.id !== account.id))
                                }}
                                className="text-gray-400 hover:text-red-600"
                              >
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add Dialog */}
      {addDialogOpen && (
        <AccountDialog
          title="勘定科目追加"
          onClose={() => setAddDialogOpen(false)}
          onSave={handleAdd}
        />
      )}

      {/* Edit Dialog */}
      {editAccount && (
        <AccountDialog
          title={`編集: ${editAccount.name}`}
          account={editAccount}
          onClose={() => setEditAccount(null)}
          onSave={handleEdit}
        />
      )}
    </div>
  )
}
