'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Check, ChevronDown, Search, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { ACCOUNT_CATEGORIES } from '@/lib/constants'
import type { Account, AccountCategory } from '@/lib/types'

// ── Hooks ─────────────────────────────────────────────────────────────────────

const RECENT_KEY = 'journal_recent_accounts'
const RECENT_MAX = 5

function getRecentAccountIds(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
  } catch {
    return []
  }
}

function saveRecentAccountId(id: string): void {
  if (typeof window === 'undefined') return
  const current = getRecentAccountIds().filter((x) => x !== id)
  const next = [id, ...current].slice(0, RECENT_MAX)
  localStorage.setItem(RECENT_KEY, JSON.stringify(next))
}

// ── Desktop Popover ───────────────────────────────────────────────────────────

interface AccountPopoverProps {
  accounts: Account[]
  value: string | null
  onChange: (account: Account) => void
  placeholder?: string
  disabled?: boolean
}

function AccountPopover({ accounts, value, onChange, placeholder = '勘定科目を選択', disabled }: AccountPopoverProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [recentIds, setRecentIds] = useState<string[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = accounts.find((a) => a.id === value) ?? null

  useEffect(() => {
    setRecentIds(getRecentAccountIds())
  }, [open])

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
    }
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return accounts
    return accounts.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.code.includes(q) ||
        a.sub_category.includes(q)
    )
  }, [accounts, query])

  const grouped = useMemo(() => {
    const order: AccountCategory[] = ['assets', 'liabilities', 'equity', 'revenue', 'expense']
    const map = new Map<AccountCategory, Account[]>()
    for (const a of filtered) {
      if (!map.has(a.category)) map.set(a.category, [])
      map.get(a.category)!.push(a)
    }
    return order.filter((k) => map.has(k)).map((k) => ({ category: k, items: map.get(k)! }))
  }, [filtered])

  const recentAccounts = useMemo(
    () => recentIds.map((id) => accounts.find((a) => a.id === id)).filter(Boolean) as Account[],
    [recentIds, accounts]
  )

  function handleSelect(account: Account) {
    onChange(account)
    saveRecentAccountId(account.id)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={cn(
          'flex h-8 w-full items-center justify-between gap-1 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none',
          'hover:border-ring/60 focus:border-ring focus:ring-3 focus:ring-ring/50',
          'disabled:cursor-not-allowed disabled:opacity-50',
          open && 'border-ring ring-3 ring-ring/50',
          !selected && 'text-muted-foreground'
        )}
      >
        {selected ? (
          <span className="flex items-center gap-1.5 min-w-0 truncate">
            <span className="shrink-0 text-xs font-mono text-muted-foreground">{selected.code}</span>
            <span className="truncate">{selected.name}</span>
          </span>
        ) : (
          <span>{placeholder}</span>
        )}
        <ChevronDown className={cn('size-3.5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-72 rounded-xl border border-border bg-popover shadow-lg overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="科目名・コードで検索"
                className="h-8 w-full rounded-lg border border-input bg-background pl-8 pr-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* List */}
          <div className="max-h-72 overflow-y-auto py-1">
            {/* Recent */}
            {!query && recentAccounts.length > 0 && (
              <>
                <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                  <Clock className="size-3" />
                  最近使った科目
                </div>
                {recentAccounts.map((a) => (
                  <AccountItem key={a.id} account={a} selected={a.id === value} onSelect={handleSelect} />
                ))}
                <div className="my-1 h-px bg-border mx-2" />
              </>
            )}

            {/* Grouped */}
            {grouped.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                該当する科目がありません
              </div>
            ) : (
              grouped.map(({ category, items }) => (
                <div key={category}>
                  <div className="px-3 py-1 text-xs font-semibold text-muted-foreground bg-muted/30">
                    {ACCOUNT_CATEGORIES[category]}
                  </div>
                  {items.map((a) => (
                    <AccountItem key={a.id} account={a} selected={a.id === value} onSelect={handleSelect} />
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function AccountItem({
  account,
  selected,
  onSelect,
}: {
  account: Account
  selected: boolean
  onSelect: (a: Account) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(account)}
      className={cn(
        'flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors',
        selected && 'bg-primary/5 text-primary'
      )}
    >
      <span className="w-10 shrink-0 font-mono text-xs text-muted-foreground">{account.code}</span>
      <span className="flex-1 truncate text-left">{account.name}</span>
      {selected && <Check className="size-3.5 shrink-0 text-primary" />}
    </button>
  )
}

// ── Mobile Sheet ──────────────────────────────────────────────────────────────

interface AccountSheetProps extends AccountPopoverProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function AccountSheet({ accounts, value, onChange, open, onOpenChange }: AccountSheetProps) {
  const [query, setQuery] = useState('')
  const [recentIds, setRecentIds] = useState<string[]>([])

  useEffect(() => {
    if (open) setRecentIds(getRecentAccountIds())
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return accounts
    return accounts.filter(
      (a) => a.name.toLowerCase().includes(q) || a.code.includes(q)
    )
  }, [accounts, query])

  const grouped = useMemo(() => {
    const order: AccountCategory[] = ['assets', 'liabilities', 'equity', 'revenue', 'expense']
    const map = new Map<AccountCategory, Account[]>()
    for (const a of filtered) {
      if (!map.has(a.category)) map.set(a.category, [])
      map.get(a.category)!.push(a)
    }
    return order.filter((k) => map.has(k)).map((k) => ({ category: k, items: map.get(k)! }))
  }, [filtered])

  const recentAccounts = useMemo(
    () => recentIds.map((id) => accounts.find((a) => a.id === id)).filter(Boolean) as Account[],
    [recentIds, accounts]
  )

  function handleSelect(account: Account) {
    onChange(account)
    saveRecentAccountId(account.id)
    onOpenChange(false)
    setQuery('')
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl p-0">
        <SheetHeader className="px-4 pt-4 pb-0">
          <SheetTitle>勘定科目を選択</SheetTitle>
        </SheetHeader>
        <div className="px-4 py-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="科目名・コードで検索..."
              className="pl-9 h-10"
            />
          </div>
        </div>
        <div className="overflow-y-auto" style={{ height: 'calc(80vh - 140px)' }}>
          {!query && recentAccounts.length > 0 && (
            <>
              <div className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-muted-foreground">
                <Clock className="size-3" />
                最近使った科目
              </div>
              {recentAccounts.map((a) => (
                <MobileAccountItem key={a.id} account={a} selected={a.id === value} onSelect={handleSelect} />
              ))}
              <div className="my-2 h-px bg-border" />
            </>
          )}
          {grouped.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">
              該当する科目がありません
            </div>
          ) : (
            grouped.map(({ category, items }) => (
              <div key={category}>
                <div className="px-4 py-2 text-xs font-semibold text-muted-foreground bg-muted/30 sticky top-0">
                  {ACCOUNT_CATEGORIES[category]}
                </div>
                {items.map((a) => (
                  <MobileAccountItem key={a.id} account={a} selected={a.id === value} onSelect={handleSelect} />
                ))}
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function MobileAccountItem({
  account,
  selected,
  onSelect,
}: {
  account: Account
  selected: boolean
  onSelect: (a: Account) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(account)}
      className={cn(
        'flex w-full items-center gap-3 px-4 py-3 border-b border-border/50 text-sm active:bg-accent transition-colors',
        selected && 'bg-primary/5'
      )}
    >
      <span className="w-12 shrink-0 font-mono text-xs text-muted-foreground">{account.code}</span>
      <span className="flex-1 text-left font-medium">{account.name}</span>
      <span className="text-xs text-muted-foreground">{account.sub_category}</span>
      {selected && <Check className="size-4 shrink-0 text-primary" />}
    </button>
  )
}

// ── Public AccountSelector (responsive) ──────────────────────────────────────

export interface AccountSelectorProps {
  accounts: Account[]
  value: string | null
  onChange: (account: Account) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function AccountSelector({ accounts, value, onChange, placeholder, disabled, className }: AccountSelectorProps) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const selected = accounts.find((a) => a.id === value) ?? null

  return (
    <>
      {/* Desktop: inline popover */}
      <div className={cn('hidden md:block', className)}>
        <AccountPopover
          accounts={accounts}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
        />
      </div>

      {/* Mobile: full-screen sheet */}
      <div className={cn('md:hidden', className)}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setSheetOpen(true)}
          className={cn(
            'flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-input bg-transparent px-3 py-2 text-sm transition-colors',
            'active:bg-accent',
            'disabled:cursor-not-allowed disabled:opacity-50',
            !selected && 'text-muted-foreground'
          )}
        >
          {selected ? (
            <span className="flex items-center gap-2 min-w-0 truncate">
              <span className="shrink-0 text-xs font-mono text-muted-foreground">{selected.code}</span>
              <span className="truncate font-medium">{selected.name}</span>
            </span>
          ) : (
            <span>{placeholder ?? '勘定科目を選択'}</span>
          )}
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
        <AccountSheet
          accounts={accounts}
          value={value}
          onChange={onChange}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
        />
      </div>
    </>
  )
}
