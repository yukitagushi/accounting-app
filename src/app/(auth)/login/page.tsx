'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calculator, Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

const DEMO_ACCOUNTS = [
  { email: 'admin@autoaccount.demo', password: 'demo1234', role: '管理者', branch: '本社' },
  { email: 'staff@autoaccount.demo', password: 'demo1234', role: 'スタッフ', branch: '東支店' },
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError('メールアドレスまたはパスワードが正しくありません。')
        setLoading(false)
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('ログインに失敗しました。')
      setLoading(false)
    }
  }

  function handleDemoLogin(account: typeof DEMO_ACCOUNTS[0]) {
    setEmail(account.email)
    setPassword(account.password)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-indigo-600 via-blue-600 to-blue-700 flex items-center justify-center p-4">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Decorative blobs */}
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-80 h-80 rounded-full bg-indigo-400/20 blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo + Brand */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 shadow-xl mb-4">
            <Calculator className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">AutoAccount</h1>
          <p className="mt-1.5 text-blue-100/80 text-sm">自動車整備業向け会計ソフト</p>
        </div>

        {/* Card */}
        <Card className="border-0 bg-white/10 backdrop-blur-xl shadow-2xl shadow-black/20">
          <CardHeader className="pb-2 pt-7 px-7">
            <h2 className="text-xl font-semibold text-white">ログイン</h2>
            <p className="text-sm text-blue-100/70 mt-0.5">アカウント情報を入力してください</p>
          </CardHeader>

          <CardContent className="px-7 pb-7">
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* Error message */}
              {error && (
                <div className="rounded-lg bg-red-500/20 border border-red-400/30 px-4 py-3 text-sm text-red-100">
                  {error}
                </div>
              )}

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-blue-100 font-medium text-sm">
                  メールアドレス
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@company.co.jp"
                  required
                  autoComplete="email"
                  className="bg-white/10 border-white/20 text-white placeholder:text-blue-200/40 focus:border-white/50 focus:bg-white/15 h-11 transition-all duration-200"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-blue-100 font-medium text-sm">
                  パスワード
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    className="bg-white/10 border-white/20 text-white placeholder:text-blue-200/40 focus:border-white/50 focus:bg-white/15 h-11 pr-11 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-200/60 hover:text-white transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full h-11 mt-2 bg-white text-indigo-700 hover:bg-blue-50 font-semibold shadow-lg shadow-black/10 transition-all duration-200 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>ログイン中...</span>
                  </>
                ) : (
                  'ログイン'
                )}
              </Button>
            </form>

            {/* Demo accounts */}
            <div className="mt-6 pt-5 border-t border-white/10">
              <p className="text-xs text-blue-200/60 mb-3 text-center">デモアカウントでログイン</p>
              <div className="space-y-2">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => handleDemoLogin(acc)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-left group"
                  >
                    <div>
                      <div className="text-sm text-white font-medium">{acc.email}</div>
                      <div className="text-xs text-blue-200/50">パスワード: ••••••••</div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-400/20 text-indigo-200 border border-indigo-400/20">
                        {acc.role}
                      </span>
                      <div className="text-xs text-blue-200/40 mt-0.5">{acc.branch}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-blue-200/50">
          © 2025 AutoAccount. All rights reserved.
        </p>
      </div>
    </div>
  )
}
