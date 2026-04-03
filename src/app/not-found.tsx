import Link from 'next/link'
import { LayoutDashboard } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="flex flex-col items-center text-center px-6 max-w-md">
        {/* Large 404 */}
        <div className="relative mb-6">
          <p className="text-[120px] font-extrabold leading-none select-none bg-gradient-to-br from-indigo-600 to-indigo-400 bg-clip-text text-transparent">
            404
          </p>
          <div className="absolute inset-0 blur-3xl bg-indigo-200/40 rounded-full" />
        </div>

        <h1 className="text-xl font-bold text-gray-800 mb-2">
          ページが見つかりません
        </h1>
        <p className="text-sm text-gray-500 mb-8 leading-relaxed">
          お探しのページは移動、削除、または存在しない可能性があります。
          <br />
          URLをご確認の上、再度お試しください。
        </p>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-all duration-200 shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300 hover:-translate-y-0.5 active:translate-y-0"
        >
          <LayoutDashboard className="w-4 h-4" />
          ダッシュボードに戻る
        </Link>
      </div>
    </div>
  )
}
