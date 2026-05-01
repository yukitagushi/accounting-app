'use client'

import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/lib/rbac'
import { hasPermission, type Permission } from '@/lib/rbac'

export interface AuthUser {
  id: string
  email: string
  displayName: string
  role: UserRole
  branchId: string | null
  mfaEnabled: boolean
}

interface AuthStore {
  user: AuthUser | null
  loading: boolean
  setUser: (user: AuthUser | null) => void
  setLoading: (loading: boolean) => void
  loadUser: () => Promise<void>
  can: (permission: Permission) => boolean
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  loadUser: async () => {
    set({ loading: true })
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        set({ user: null, loading: false })
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, role, branch_id')
        .eq('id', user.id)
        .single()

      const { data: factors } = await supabase.auth.mfa.listFactors()
      const hasMFA = (factors?.totp ?? []).some((f) => f.status === 'verified')

      set({
        user: {
          id: user.id,
          email: user.email ?? '',
          displayName: profile?.display_name ?? user.email ?? '',
          role: (profile?.role as UserRole) ?? 'staff',
          branchId: profile?.branch_id ?? null,
          mfaEnabled: hasMFA,
        },
        loading: false,
      })
    } catch {
      set({ user: null, loading: false })
    }
  },
  can: (permission) => {
    const user = get().user
    if (!user) return false
    return hasPermission(user.role, permission)
  },
}))
