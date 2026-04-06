'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'

export type AccountingTab = 'trial-balance' | 'accounts' | 'credit-card' | 'sales-ledger' | 'transfer-voucher'

const TABS: { key: AccountingTab; label: string; href: string }[] = [
  { key: 'trial-balance', label: '試算表', href: '/accounting' },
  { key: 'accounts', label: '勘定科目', href: '/accounting/accounts' },
  { key: 'credit-card', label: 'クレカ決済', href: '/accounting/credit-card' },
  { key: 'sales-ledger', label: '売上台帳', href: '/accounting/sales-ledger' },
  { key: 'transfer-voucher', label: '振替伝票', href: '/accounting/transfer-voucher' },
]

export function AccountingTabs({ active }: { active: AccountingTab }) {
  return (
    <div className="flex gap-0.5 bg-gray-100 rounded-xl p-1 mb-6 w-fit overflow-x-auto">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={cn(
            'px-4 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
            tab.key === active
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  )
}
