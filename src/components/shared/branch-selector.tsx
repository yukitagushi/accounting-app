'use client'

import { Building2, Check, ChevronsUpDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useBranchStore } from '@/hooks/use-branch'
import type { Branch } from '@/lib/types'

// Demo branches for display
const DEMO_BRANCHES: Branch[] = [
  { id: '1', name: '本社', code: 'HQ', created_at: '' },
  { id: '2', name: '新宿支店', code: 'SJK', created_at: '' },
  { id: '3', name: '渋谷支店', code: 'SBY', created_at: '' },
]

export function BranchSelector() {
  const { currentBranch, branches, setCurrentBranch } = useBranchStore()

  const displayBranches = branches.length > 0 ? branches : DEMO_BRANCHES
  const activeBranch = currentBranch ?? DEMO_BRANCHES[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex w-full items-center justify-between h-9 px-3 rounded-lg text-sm font-medium border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span className="truncate">{activeBranch.name}</span>
        </div>
        <ChevronsUpDown className="w-3.5 h-3.5 text-gray-400 shrink-0 ml-1" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuLabel className="text-xs text-gray-500 font-medium">
          拠点を選択
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {displayBranches.map((branch) => (
          <DropdownMenuItem
            key={branch.id}
            onClick={() => setCurrentBranch(branch)}
            className={cn(
              'flex items-center justify-between cursor-pointer',
              activeBranch.id === branch.id && 'bg-indigo-50 text-indigo-700 focus:bg-indigo-50 focus:text-indigo-700'
            )}
          >
            <div className="flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 opacity-60" />
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
