'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Calculator,
  LayoutDashboard,
  BookOpen,
  Car,
  FileText,
  Receipt,
  Users,
  Settings,
  LogOut,
  X,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { BranchSelector } from '@/components/shared/branch-selector'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'ダッシュボード', href: '/dashboard', icon: LayoutDashboard },
  { label: '仕訳管理', href: '/journal', icon: BookOpen },
  { label: '車検管理', href: '/vehicle-inspection', icon: Car },
  { label: '見積書', href: '/estimates', icon: FileText },
  { label: '顧客管理', href: '/customers', icon: Users },
  { label: '請求書', href: '/invoices', icon: Receipt },
  { label: '会計管理', href: '/accounting', icon: Calculator },
  { label: '設定', href: '/settings', icon: Settings },
] as const

interface MobileNavProps {
  open: boolean
  onClose: () => void
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  const pathname = usePathname()
  const router = useRouter()

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    onClose()
    router.push('/login')
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent side="left" className="w-72 p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="px-4 py-5 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600">
                <Calculator className="w-4 h-4 text-white" />
              </div>
              <div>
                <SheetTitle className="text-sm font-bold text-gray-900 leading-none">
                  AutoAccount
                </SheetTitle>
                <p className="text-[10px] text-gray-400 mt-0.5">自動車整備業向け会計</p>
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* Branch Selector */}
        <div className="px-3 py-3 border-b border-gray-100">
          <BranchSelector />
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  active
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <Icon
                  className={cn(
                    'w-4 h-4 shrink-0',
                    active ? 'text-indigo-600' : 'text-gray-400'
                  )}
                />
                <span>{item.label}</span>
                {active && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* User + Logout */}
        <div className="px-3 pb-4 border-t border-gray-100 pt-3 space-y-1">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50">
            <Avatar className="w-7 h-7 shrink-0">
              <AvatarFallback className="text-xs font-semibold bg-indigo-100 text-indigo-700">
                田
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gray-800 truncate">田中 太郎</p>
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 h-4 mt-0.5 bg-gray-100 text-gray-500 font-medium"
              >
                管理者
              </Badge>
            </div>
          </div>

          <Separator className="my-1" />

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            ログアウト
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
