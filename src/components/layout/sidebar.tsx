'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Calculator,
  LayoutDashboard,
  BookOpen,
  Car,
  FileText,
  Receipt,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Building2,
  Camera,
  Plus,
  ChevronDown,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { BranchSelector } from '@/components/shared/branch-selector'

// ── Nav structure ─────────────────────────────────────────────────────────────

type NavSubItem = { label: string; href: string; icon: React.ElementType }

type NavItem = {
  label: string
  href: string
  icon: React.ElementType
  subItems?: NavSubItem[]
}

const navItems: NavItem[] = [
  { label: 'ダッシュボード', href: '/dashboard', icon: LayoutDashboard },
  {
    label: '仕訳管理',
    href: '/journal',
    icon: BookOpen,
    subItems: [
      { label: '仕訳一覧', href: '/journal', icon: BookOpen },
      { label: '新規仕訳', href: '/journal/new', icon: Plus },
      { label: 'レシート読取り', href: '/journal/scan', icon: Camera },
    ],
  },
  { label: '車検管理', href: '/vehicle-inspection', icon: Car },
  { label: '見積書', href: '/estimates', icon: FileText },
  { label: '顧客管理', href: '/customers', icon: Users },
  { label: '請求書', href: '/invoices', icon: Receipt },
  { label: '会計管理', href: '/accounting', icon: Calculator },
] as const

const bottomNavItems = [
  { label: '設定', href: '/settings', icon: Settings },
] as const

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<Set<string>>(
    // Auto-expand if currently in that section
    () => {
      const initial = new Set<string>()
      if (pathname.startsWith('/journal')) initial.add('/journal')
      return initial
    }
  )

  function isActive(href: string) {
    if (href === '/journal') {
      return pathname === '/journal' || pathname.startsWith('/journal/')
    }
    return pathname === href || pathname.startsWith(href + '/')
  }

  function isSubActive(href: string) {
    if (href === '/journal') return pathname === '/journal'
    return pathname === href || pathname.startsWith(href + '/')
  }

  function toggleExpand(href: string) {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(href)) next.delete(href)
      else next.add(href)
      return next
    })
  }

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-white border-r border-gray-100 transition-all duration-300 ease-in-out overflow-hidden',
        collapsed ? 'w-[72px]' : 'w-[260px]'
      )}
    >
      {/* Header */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-5 border-b border-gray-100',
        collapsed ? 'justify-center' : 'justify-between'
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 shrink-0">
              <Calculator className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">AutoAccount</p>
              <p className="text-[10px] text-gray-400 truncate">自動車整備業向け会計</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600">
            <Calculator className="w-4 h-4 text-white" />
          </div>
        )}
        <button
          onClick={onToggle}
          className={cn(
            'flex items-center justify-center w-6 h-6 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0',
            collapsed && 'hidden'
          )}
          aria-label={collapsed ? 'サイドバーを展開' : 'サイドバーを折りたたむ'}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Collapsed toggle */}
      {collapsed && (
        <button
          onClick={onToggle}
          className="flex items-center justify-center w-full py-3 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors border-b border-gray-100"
          aria-label="サイドバーを展開"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* Branch Selector */}
      {!collapsed && (
        <div className="px-3 py-3 border-b border-gray-100">
          <BranchSelector />
        </div>
      )}
      {collapsed && (
        <div className="px-2 py-3 flex justify-center border-b border-gray-100">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-600"
            title="拠点"
          >
            <Building2 className="w-4 h-4" />
          </div>
        </div>
      )}

      {/* Main Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          const hasSubItems = item.subItems && item.subItems.length > 0
          const expanded = expandedItems.has(item.href)

          return (
            <div key={item.href}>
              {/* Main item */}
              {hasSubItems && !collapsed ? (
                <button
                  type="button"
                  onClick={() => toggleExpand(item.href)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group',
                    active
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-4 h-4 shrink-0 transition-colors',
                      active ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'
                    )}
                  />
                  <span className="truncate flex-1 text-left">{item.label}</span>
                  <ChevronDown
                    className={cn(
                      'w-3.5 h-3.5 shrink-0 text-gray-400 transition-transform duration-200',
                      expanded && 'rotate-180'
                    )}
                  />
                </button>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group',
                    active
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                    collapsed ? 'justify-center px-2' : ''
                  )}
                  title={collapsed ? item.label : undefined}
                  onClick={() => hasSubItems && toggleExpand(item.href)}
                >
                  <Icon
                    className={cn(
                      'w-4 h-4 shrink-0 transition-colors',
                      active ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'
                    )}
                  />
                  {!collapsed && <span className="truncate flex-1">{item.label}</span>}
                  {active && !collapsed && !hasSubItems && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />
                  )}
                </Link>
              )}

              {/* Sub-items */}
              {hasSubItems && !collapsed && expanded && (
                <div className="ml-3 mt-0.5 mb-1 pl-4 border-l border-gray-100 space-y-0.5">
                  {item.subItems!.map((sub) => {
                    const SubIcon = sub.icon
                    const subActive = isSubActive(sub.href)
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className={cn(
                          'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 group',
                          subActive
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                        )}
                      >
                        <SubIcon
                          className={cn(
                            'w-3.5 h-3.5 shrink-0',
                            subActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'
                          )}
                        />
                        <span className="truncate">{sub.label}</span>
                        {subActive && (
                          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                        )}
                      </Link>
                    )
                  })}
                </div>
              )}

              {/* Collapsed: camera quick link for journal section */}
              {hasSubItems && collapsed && active && (
                <Link
                  href="/journal/scan"
                  className="flex items-center justify-center w-full py-1.5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors rounded-lg"
                  title="レシート読取り"
                >
                  <Camera className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-2 pb-2 border-t border-gray-100 pt-2 space-y-0.5">
        {bottomNavItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group',
                active
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                collapsed ? 'justify-center px-2' : ''
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={cn(
                  'w-4 h-4 shrink-0 transition-colors',
                  active ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'
                )}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          )
        })}

        <Separator className="my-2" />

        {/* User info */}
        {!collapsed ? (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group">
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
        ) : (
          <div className="flex justify-center py-1">
            <Avatar className="w-7 h-7">
              <AvatarFallback className="text-xs font-semibold bg-indigo-100 text-indigo-700">
                田
              </AvatarFallback>
            </Avatar>
          </div>
        )}
      </div>
    </aside>
  )
}
