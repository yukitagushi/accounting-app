'use client'

import { useState } from 'react'
import { ChevronDown, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { Account, JournalEntryType } from '@/lib/types'

// ── Template definitions ──────────────────────────────────────────────────────

export interface JournalTemplate {
  id: string
  name: string
  description: string
  entry_type: JournalEntryType
  lines: Array<{
    accountCode: string
    side: 'debit' | 'credit'
    label: string
  }>
}

const TEMPLATES: JournalTemplate[] = [
  {
    id: 'shaken-cash',
    name: '車検売上（現金）',
    description: '現金で車検代を受け取る',
    entry_type: 'vehicle_inspection',
    lines: [
      { accountCode: '1000', side: 'debit', label: '現金' },
      { accountCode: '4200', side: 'credit', label: '車検売上' },
      { accountCode: '2400', side: 'credit', label: '未払消費税' },
    ],
  },
  {
    id: 'shaken-credit',
    name: '車検売上（クレジット）',
    description: 'クレジットカードで車検代を受け取る',
    entry_type: 'vehicle_inspection',
    lines: [
      { accountCode: '1100', side: 'debit', label: '売掛金' },
      { accountCode: '4200', side: 'credit', label: '車検売上' },
      { accountCode: '2400', side: 'credit', label: '未払消費税' },
    ],
  },
  {
    id: 'parts-purchase',
    name: '部品仕入',
    description: '仕入先から部品を仕入れる',
    entry_type: 'normal',
    lines: [
      { accountCode: '5100', side: 'debit', label: '部品仕入' },
      { accountCode: '2000', side: 'credit', label: '買掛金' },
    ],
  },
  {
    id: 'salary',
    name: '給与支払',
    description: '従業員への給与振込（源泉税控除後）',
    entry_type: 'transfer',
    lines: [
      { accountCode: '6000', side: 'debit', label: '給料手当' },
      { accountCode: '2200', side: 'credit', label: '預り金（源泉税）' },
      { accountCode: '1010', side: 'credit', label: '普通預金' },
    ],
  },
  {
    id: 'rent',
    name: '家賃支払',
    description: '工場・事務所の賃料支払',
    entry_type: 'normal',
    lines: [
      { accountCode: '6200', side: 'debit', label: '地代家賃' },
      { accountCode: '1010', side: 'credit', label: '普通預金' },
    ],
  },
  {
    id: 'utilities',
    name: '水道光熱費',
    description: '電気・水道・ガス代の支払',
    entry_type: 'normal',
    lines: [
      { accountCode: '6300', side: 'debit', label: '水道光熱費' },
      { accountCode: '1010', side: 'credit', label: '普通預金' },
    ],
  },
  {
    id: 'maintenance-cash',
    name: '整備売上（現金）',
    description: '現金で整備代を受け取る',
    entry_type: 'normal',
    lines: [
      { accountCode: '1000', side: 'debit', label: '現金' },
      { accountCode: '4100', side: 'credit', label: '整備売上' },
      { accountCode: '2400', side: 'credit', label: '未払消費税' },
    ],
  },
  {
    id: 'cc-fee',
    name: 'クレジット手数料',
    description: 'カード決済手数料の計上',
    entry_type: 'normal',
    lines: [
      { accountCode: '6600', side: 'debit', label: '支払手数料' },
      { accountCode: '1010', side: 'credit', label: '普通預金' },
    ],
  },
  {
    id: 'shaken-azukari-jibaiseki',
    name: '自賠責保険 預かり',
    description: '車検時の自賠責保険料を顧客から預かる',
    entry_type: 'vehicle_inspection',
    lines: [
      { accountCode: '1000', side: 'debit', label: '現金（預かり）' },
      { accountCode: '2220', side: 'credit', label: '自賠責保険預り金' },
    ],
  },
  {
    id: 'shaken-azukari-jibaiseki-bank',
    name: '自賠責保険 預かり（振込）',
    description: '車検時の自賠責保険料を銀行振込で預かる',
    entry_type: 'vehicle_inspection',
    lines: [
      { accountCode: '1010', side: 'debit', label: '普通預金（預かり）' },
      { accountCode: '2220', side: 'credit', label: '自賠責保険預り金' },
    ],
  },
  {
    id: 'shaken-azukari-weight-tax',
    name: '重量税 預かり',
    description: '車検時の自動車重量税を顧客から預かる',
    entry_type: 'vehicle_inspection',
    lines: [
      { accountCode: '1000', side: 'debit', label: '現金（預かり）' },
      { accountCode: '2230', side: 'credit', label: '重量税預り金' },
    ],
  },
  {
    id: 'shaken-azukari-stamp',
    name: '印紙代 預かり',
    description: '車検時の印紙代を顧客から預かる',
    entry_type: 'vehicle_inspection',
    lines: [
      { accountCode: '1000', side: 'debit', label: '現金（預かり）' },
      { accountCode: '2240', side: 'credit', label: '印紙代預り金' },
    ],
  },
  {
    id: 'shaken-azukari-all',
    name: '車検預かり金 一括',
    description: '自賠責・重量税・印紙を一括預かり（現金）',
    entry_type: 'vehicle_inspection',
    lines: [
      { accountCode: '1000', side: 'debit', label: '現金（預かり合計）' },
      { accountCode: '2220', side: 'credit', label: '自賠責保険預り金' },
      { accountCode: '2230', side: 'credit', label: '重量税預り金' },
      { accountCode: '2240', side: 'credit', label: '印紙代預り金' },
    ],
  },
  {
    id: 'shaken-azukari-payment',
    name: '車検預かり金 支払',
    description: '預かった自賠責・重量税・印紙を実際に支払う',
    entry_type: 'vehicle_inspection',
    lines: [
      { accountCode: '2220', side: 'debit', label: '自賠責保険預り金' },
      { accountCode: '2230', side: 'debit', label: '重量税預り金' },
      { accountCode: '2240', side: 'debit', label: '印紙代預り金' },
      { accountCode: '1000', side: 'credit', label: '現金（支払）' },
    ],
  },
]

// ── Helper to convert template to form lines ──────────────────────────────────

export interface TemplateLine {
  accountCode: string
  accountId: string | null
  debitAmount: number | ''
  creditAmount: number | ''
  memo: string
}

export function templateToFormLines(template: JournalTemplate, accounts: Account[]): TemplateLine[] {
  return template.lines.map((tl) => {
    const account = accounts.find((a) => a.code === tl.accountCode)
    return {
      accountCode: tl.accountCode,
      accountId: account?.id ?? null,
      debitAmount: tl.side === 'debit' ? '' : 0,
      creditAmount: tl.side === 'credit' ? '' : 0,
      memo: '',
    }
  })
}

// ── Template Card ─────────────────────────────────────────────────────────────

function TemplateCard({
  template,
  onSelect,
}: {
  template: JournalTemplate
  onSelect: (t: JournalTemplate) => void
}) {
  const typeColors: Record<JournalEntryType, string> = {
    normal: 'bg-blue-50 text-blue-700',
    transfer: 'bg-purple-50 text-purple-700',
    vehicle_inspection: 'bg-emerald-50 text-emerald-700',
    payment: 'bg-amber-50 text-amber-700',
  }
  const typeLabels: Record<JournalEntryType, string> = {
    normal: '通常仕訳',
    transfer: '振替伝票',
    vehicle_inspection: '車検仕訳',
    payment: '入金仕訳',
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(template)}
      className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm active:scale-[0.98]"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
          {template.name}
        </span>
        <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-medium', typeColors[template.entry_type])}>
          {typeLabels[template.entry_type]}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{template.description}</p>
      <div className="flex flex-wrap gap-1 mt-1">
        {template.lines.map((l, i) => (
          <span
            key={i}
            className={cn(
              'rounded-md px-1.5 py-0.5 text-xs font-mono',
              l.side === 'debit' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'
            )}
          >
            {l.side === 'debit' ? '借' : '貸'} {l.label}
          </span>
        ))}
      </div>
    </button>
  )
}

// ── Desktop Dropdown ──────────────────────────────────────────────────────────

interface TemplateSelectorProps {
  accounts: Account[]
  onSelect: (template: JournalTemplate) => void
  className?: string
}

const TEMPLATE_GROUPS: Array<{ label: string; type: JournalEntryType; color: string }> = [
  { label: '🚗 車検仕訳', type: 'vehicle_inspection', color: 'text-emerald-700' },
  { label: '🔄 振替伝票', type: 'transfer', color: 'text-purple-700' },
  { label: '📋 通常仕訳', type: 'normal', color: 'text-blue-700' },
]

export function TemplateSelector({ accounts, onSelect, className }: TemplateSelectorProps) {
  const [open, setOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  function handleSelect(t: JournalTemplate) {
    onSelect(t)
    setOpen(false)
    setSheetOpen(false)
  }

  return (
    <>
      {/* Desktop */}
      <div className={cn('relative hidden md:block', className)}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(!open)}
          className="gap-1.5"
        >
          <Zap className="size-3.5" />
          テンプレート
          <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} />
        </Button>

        <AnimatePresence>
          {open && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute right-0 top-full z-50 mt-2 w-[560px] rounded-2xl border border-border bg-popover p-3 shadow-xl overflow-y-auto max-h-[80vh]"
              >
                {TEMPLATE_GROUPS.map((group) => {
                  const grouped = TEMPLATES.filter((t) => t.entry_type === group.type)
                  if (!grouped.length) return null
                  return (
                    <div key={group.type} className="mb-4 last:mb-0">
                      <p className={cn('mb-2 px-1 text-xs font-semibold', group.color)}>
                        {group.label}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {grouped.map((t) => (
                          <TemplateCard key={t.id} template={t} onSelect={handleSelect} />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile */}
      <div className={cn('md:hidden', className)}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setSheetOpen(true)}
          className="gap-1.5"
        >
          <Zap className="size-3.5" />
          テンプレート
        </Button>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="bottom" className="h-[90vh] rounded-t-2xl p-0">
            <SheetHeader className="px-4 pt-4 pb-3 border-b border-border">
              <SheetTitle className="flex items-center gap-2">
                <Zap className="size-4 text-primary" />
                テンプレートを選択
              </SheetTitle>
            </SheetHeader>
            <div className="overflow-y-auto p-4 space-y-5" style={{ height: 'calc(90vh - 80px)' }}>
              {TEMPLATE_GROUPS.map((group) => {
                const grouped = TEMPLATES.filter((t) => t.entry_type === group.type)
                if (!grouped.length) return null
                return (
                  <div key={group.type}>
                    <p className={cn('mb-2 text-sm font-semibold', group.color)}>
                      {group.label}
                    </p>
                    <div className="grid gap-2">
                      {grouped.map((t) => (
                        <TemplateCard key={t.id} template={t} onSelect={handleSelect} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}

export { TEMPLATES }
