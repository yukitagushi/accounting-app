'use client'

import { useEffect, useRef } from 'react'
import { Building2, Check, ChevronsUpDown, Layers } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useBranchStore } from '@/hooks/use-branch'
import type { Branch } from '@/lib/types'

// 拠点一覧（トータルは id='all' の特殊エントリ）
export const APP_BRANCHES: Branch[] = [
  { id: 'all', name: 'トータル', code: 'ALL', created_at: '' },
  { id: '00000000-0000-0000-0000-000000000001', name: '本社', code: 'HQ', created_at: '' },
  { id: '00000000-0000-0000-0000-000000000002', name: '滝沢', code: 'TKZ', created_at: '' },
  { id: '00000000-0000-0000-0000-000000000003', name: '三ツ割', code: 'MTW', created_at: '' },
]

export function BranchSelector() {
  const { currentBranch, setCurrentBranch } = useBranchStore()
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    fetch('/api/branches/init', { method: 'POST' }).catch(() => {})
  }, [])

  const activeBranch = currentBranch ?? APP_BRANCHES[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex w-full items-center justify-between h-9 px-3 rounded-lg text-sm font-medium border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          {activeBranch.id === 'all' ? (
            <Layers className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          ) : (
            <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          )}
          <span className="truncate">{activeBranch.name}</span>
        </div>
        <ChevronsUpDown className="w-3.5 h-3.5 text-gray-400 shrink-0 ml-1" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-52">
        <div className="px-1.5 py-1 text-xs font-medium text-gray-500">
          拠点を選択
        </div>
        <DropdownMenuSeparator />
        {APP_BRANCHES.map((branch) => (
          <DropdownMenuItem
            key={branch.id}
            onClick={() => setCurrentBranch(branch)}
            className={cn(
              'flex items-center justify-between cursor-pointer',
              activeBranch.id === branch.id && 'bg-indigo-50 text-indigo-700 focus:bg-indigo-50 focus:text-indigo-700'
            )}
          >
            <div className="flex items-center gap-2">
              {branch.id === 'all' ? (
                <Layers className="w-3.5 h-3.5 opacity-60" />
              ) : (
                <Building2 className="w-3.5 h-3.5 opacity-60" />
              )}
              <span className="text-sm">{branch.name}</span>
            </div>
            {activeBranch.id === branch.id && (
              <Check className="w-3.5 h-3.5 text-indigo-600" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
