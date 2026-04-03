'use client'

import Link from 'next/link'
import { motion, type Variants } from 'framer-motion'
import {
  TrendingUp,
  TrendingDown,
  Receipt,
  BookOpen,
  Car,
  Plus,
  FileText,
  ArrowRight,
  AlertCircle,
  Camera,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import {
  MOCK_JOURNAL_ENTRIES,
  MOCK_INVOICES,
  MOCK_VEHICLE_INSPECTIONS,
} from '@/lib/mock-data'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatYen(amount: number): string {
  return `¥${amount.toLocaleString('ja-JP')}`
}

function daysOverdue(dueDateStr: string): number {
  const due = new Date(dueDateStr)
  const now = new Date('2026-04-03')
  return Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
}

// ── Mock computed data ────────────────────────────────────────────────────────

const monthlyRevenue = 2_730_000
const prevMonthRevenue = 2_480_000
const revenueTrend = ((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue) * 100

const unpaidInvoices = MOCK_INVOICES.filter((inv) => inv.status === 'sent' || inv.status === 'overdue')
const unpaidTotal = unpaidInvoices.reduce((sum, inv) => sum + inv.total, 0)

const thisMonthEntries = MOCK_JOURNAL_ENTRIES.filter(
  (e) => e.entry_date.startsWith('2026-03') || e.entry_date.startsWith('2026-04')
)

const activeInspections = MOCK_VEHICLE_INSPECTIONS.filter(
  (vi) => vi.status === 'pending' || vi.status === 'in_progress'
)

const recentEntries = [...MOCK_JOURNAL_ENTRIES]
  .sort((a, b) => b.entry_date.localeCompare(a.entry_date))
  .slice(0, 5)

const overdueInvoices = MOCK_INVOICES.filter((inv) => inv.status === 'overdue')

// ── Chart data ────────────────────────────────────────────────────────────────

const barData = [
  { month: '10月', revenue: 1_850_000 },
  { month: '11月', revenue: 2_100_000 },
  { month: '12月', revenue: 2_450_000 },
  { month: '1月', revenue: 1_980_000 },
  { month: '2月', revenue: 2_480_000 },
  { month: '3月', revenue: 2_730_000 },
]

const pieData = [
  { name: '車検売上', value: 650_000 },
  { name: '整備売上', value: 880_000 },
  { name: '部品売上', value: 420_000 },
  { name: 'その他', value: 120_000 },
]

const PIE_COLORS = ['#4f46e5', '#818cf8', '#a5b4fc', '#c7d2fe']

// ── Animation variants ────────────────────────────────────────────────────────

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] } },
}

// ── Subcomponents ─────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string
  value: string
  sub: string
  icon: React.ReactNode
  iconBg: string
  trend?: { positive: boolean; text: string }
}

function StatCard({ title, value, sub, icon, iconBg, trend }: StatCardProps) {
  return (
    <motion.div variants={cardVariants}>
      <Card className="relative overflow-hidden border-0 shadow-sm ring-1 ring-gray-100">
        {/* subtle gradient accent */}
        <div className="absolute inset-0 bg-gradient-to-br from-white to-indigo-50/40 pointer-events-none" />
        <CardContent className="relative pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-500 truncate">{title}</p>
              <p className="mt-1.5 text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
              <p className="mt-1 text-xs text-gray-400">{sub}</p>
              {trend && (
                <div className={`mt-2 inline-flex items-center gap-1 text-xs font-medium ${trend.positive ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {trend.positive ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {trend.text}
                </div>
              )}
            </div>
            <div className={`flex items-center justify-center w-11 h-11 rounded-xl ${iconBg} shrink-0`}>
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="ダッシュボード"
        description="AutoAccount の概要と最新情報"
      />

      {/* ── Stats row ── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
      >
        <StatCard
          title="今月の売上"
          value={formatYen(monthlyRevenue)}
          sub="2026年3月"
          iconBg="bg-indigo-100"
          icon={<TrendingUp className="w-5 h-5 text-indigo-600" />}
          trend={{
            positive: revenueTrend > 0,
            text: `前月比 ${revenueTrend > 0 ? '+' : ''}${revenueTrend.toFixed(1)}%`,
          }}
        />
        <StatCard
          title="未払い請求"
          value={formatYen(unpaidTotal)}
          sub={`${unpaidInvoices.length} 件の未払い`}
          iconBg="bg-amber-100"
          icon={<Receipt className="w-5 h-5 text-amber-600" />}
        />
        <StatCard
          title="今月の仕訳数"
          value={`${thisMonthEntries.length} 件`}
          sub="3月〜4月合計"
          iconBg="bg-emerald-100"
          icon={<BookOpen className="w-5 h-5 text-emerald-600" />}
        />
        <StatCard
          title="車検進行中"
          value={`${activeInspections.length} 件`}
          sub="未完了の車検"
          iconBg="bg-sky-100"
          icon={<Car className="w-5 h-5 text-sky-600" />}
        />
      </motion.div>

      {/* ── Charts ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
      >
        {/* Bar chart */}
        <Card className="border-0 shadow-sm ring-1 ring-gray-100">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-gray-700">月次売上推移（直近6ヶ月）</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `¥${(v / 10000).toFixed(0)}万`}
                  width={56}
                />
                <Tooltip
                  formatter={(value) => [formatYen(Number(value)), '売上']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: '12px' }}
                  cursor={{ fill: '#f1f5f9' }}
                />
                <Bar dataKey="revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie chart */}
        <Card className="border-0 shadow-sm ring-1 ring-gray-100">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-gray-700">売上内訳（カテゴリ別）</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [formatYen(Number(value)), '']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2.5 min-w-0">
                {pieData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: PIE_COLORS[index] }}
                    />
                    <span className="text-xs text-gray-600 truncate flex-1">{entry.name}</span>
                    <span className="text-xs font-semibold text-gray-800 tabular-nums shrink-0">
                      {formatYen(entry.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Recent Activity ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
      >
        {/* Recent journal entries */}
        <Card className="border-0 shadow-sm ring-1 ring-gray-100">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-700">最近の仕訳</CardTitle>
              <Link
                href="/journal"
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
              >
                すべて表示
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-0 divide-y divide-gray-50">
              {recentEntries.map((entry) => {
                const totalAmount = entry.lines?.reduce(
                  (sum, line) => sum + line.debit_amount,
                  0
                ) ?? 0
                return (
                  <div key={entry.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-800 truncate">{entry.description}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{entry.entry_date}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold text-gray-900 tabular-nums">
                        {formatYen(totalAmount)}
                      </p>
                      <Badge
                        variant={entry.status === 'posted' ? 'default' : entry.status === 'draft' ? 'secondary' : 'destructive'}
                        className="text-[10px] h-4 mt-0.5 px-1.5"
                      >
                        {entry.status === 'posted' ? '承認済' : entry.status === 'draft' ? '下書き' : '無効'}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Overdue invoices */}
        <Card className="border-0 shadow-sm ring-1 ring-gray-100">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-700">未払い請求書</CardTitle>
              <Link
                href="/invoices"
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
              >
                すべて表示
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {unpaidInvoices.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">未払い請求書はありません</p>
            ) : (
              <div className="space-y-0 divide-y divide-gray-50">
                {unpaidInvoices.slice(0, 5).map((inv) => {
                  const days = daysOverdue(inv.due_date)
                  const isOverdue = inv.status === 'overdue'
                  return (
                    <div key={inv.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {isOverdue && (
                            <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          )}
                          <p className="text-xs font-medium text-gray-800 truncate">{inv.customer_name}</p>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5">{inv.invoice_number}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-semibold text-gray-900 tabular-nums">
                          {formatYen(inv.total)}
                        </p>
                        {isOverdue && days > 0 ? (
                          <p className="text-[11px] text-rose-500 font-medium mt-0.5">{days}日超過</p>
                        ) : (
                          <p className="text-[11px] text-gray-400 mt-0.5">期限: {inv.due_date}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Quick Actions ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.45 }}
      >
        <Card className="border-0 shadow-sm ring-1 ring-gray-100">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-gray-700">クイックアクション</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { label: '新規仕訳', href: '/journal/new', icon: BookOpen, bg: 'bg-indigo-50 hover:bg-indigo-100', text: 'text-indigo-700' },
                { label: 'レシート読取り', href: '/journal/scan', icon: Camera, bg: 'bg-violet-50 hover:bg-violet-100', text: 'text-violet-700' },
                { label: '見積書作成', href: '/estimates/new', icon: FileText, bg: 'bg-emerald-50 hover:bg-emerald-100', text: 'text-emerald-700' },
                { label: '請求書作成', href: '/invoices/new', icon: Receipt, bg: 'bg-amber-50 hover:bg-amber-100', text: 'text-amber-700' },
                { label: '車検登録', href: '/vehicle-inspection/new', icon: Car, bg: 'bg-sky-50 hover:bg-sky-100', text: 'text-sky-700' },
              ].map((action) => {
                const Icon = action.icon
                return (
                  <Link key={action.href} href={action.href}>
                    <div
                      className={`flex flex-col items-center justify-center gap-2.5 p-4 rounded-xl ${action.bg} transition-all duration-200 cursor-pointer group hover:shadow-sm hover:scale-[1.02] active:scale-[0.99]`}
                    >
                      <div className={`flex items-center justify-center w-10 h-10 rounded-lg bg-white shadow-sm ${action.text}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className={`text-xs font-semibold ${action.text}`}>{action.label}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
