'use client'

import { usePathname } from 'next/navigation'
import { Menu, LogOut, User, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { BranchSelector } from '@/components/shared/branch-selector'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const PAGE_LABELS: Record<string, string> = {
  '/dashboard': 'ダッシュボード',
  '/journal': '仕訳管理',
  '/vehicle-inspection': '車検管理',
  '/estimates': '見積書',
  '/invoices': '請求書',
  '/accounting': '会計管理',
  '/settings': '設定',
}

function getBreadcrumb(pathname: string): string[] {
  const segments = pathname.split('/').filter(Boolean)
  const crumbs: string[] = []

  let path = ''
  for (const seg of segments) {
    path += '/' + seg
    const label = PAGE_LABELS[path]
    if (label) crumbs.push(label)
    else crumbs.push(seg)
  }

  return crumbs.length > 0 ? crumbs : ['ダッシュボード']
}

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const breadcrumbs = getBreadcrumb(pathname)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="h-14 border-b border-gray-100 bg-white flex items-center px-4 gap-4 shrink-0">
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden text-gray-500 hover:text-gray-700 hover:bg-gray-100 w-8 h-8"
        onClick={onMenuClick}
        aria-label="メニューを開く"
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Breadcrumb / Page title */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        {breadcrumbs.map((crumb, index) => (
          <span key={index} className="flex items-center gap-1.5">
            {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />}
            <span
              className={
                index === breadcrumbs.length - 1
                  ? 'text-sm font-semibold text-gray-900 truncate'
                  : 'text-sm text-gray-400 truncate'
              }
            >
              {crumb}
            </span>
          </span>
        ))}
      </div>

      {/* Desktop branch selector */}
      <div className="hidden md:block w-48 shrink-0">
        <BranchSelector />
      </div>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex items-center gap-2.5 h-9 px-2.5 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Avatar className="w-7 h-7">
            <AvatarFallback className="text-xs font-semibold bg-indigo-100 text-indigo-700">
              田
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold text-gray-800 leading-none">田中 太郎</p>
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 h-4 mt-1 bg-gray-100 text-gray-500 font-medium"
            >
              管理者
            </Badge>
          </div>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-52">
          <div className="px-1.5 py-1 pb-1">
            <p className="text-sm font-semibold text-gray-900">田中 太郎</p>
            <p className="text-xs text-gray-500 font-normal mt-0.5">tanaka@company.co.jp</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer gap-2 text-sm">
            <User className="w-4 h-4 text-gray-400" />
            プロフィール
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleLogout}
            className="cursor-pointer gap-2 text-sm text-red-600 focus:text-red-600 focus:bg-red-50"
          >
            <LogOut className="w-4 h-4" />
            ログアウト
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
