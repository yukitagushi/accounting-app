'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Branch } from '@/lib/types'

interface BranchStore {
  currentBranch: Branch | null
  branches: Branch[]
  setCurrentBranch: (branch: Branch) => void
  setBranches: (branches: Branch[]) => void
}

export const useBranchStore = create<BranchStore>()(
  persist(
    (set) => ({
      currentBranch: null,
      branches: [],
      setCurrentBranch: (branch) => set({ currentBranch: branch }),
      setBranches: (branches) => set({ branches }),
    }),
    {
      name: 'branch-storage',
    }
  )
)
