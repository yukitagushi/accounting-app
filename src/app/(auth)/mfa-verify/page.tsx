'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calculator, Shield, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

export default function MfaVerifyPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (code.length !== 6) {
      setError('6桁のコードを入力してください')
      return
    }
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      const { data: factors, error: listError } = await supabase.auth.mfa.listFactors()
      if (listError || !factors) {
        setError('認証情報の取得に失敗しました')
        setLoading(false)
        return
      }

      const totpFactor = (factors.totp ?? []).find((f) => f.status === 'verified')
      if (!totpFactor) {
        setError('MFAファクターが見つかりません')
        setLoading(false)
        return
      }

      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id,
      })
      if (challengeError || !challenge) {
        setError('認証チャレンジの作成に失敗しました')
        setLoading(false)
        return
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challenge.id,
        code,
      })
      if (verifyError) {
        setError('コードが正しくありません。もう一度お試しください。')
        setLoading(false)
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('認証に失敗しました。')
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-indigo-600 via-blue-600 to-blue-700 flex items-center justify-center p-4">
      {/* Background pattern */}
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
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-5 h-5 text-white" />
              <h2 className="text-xl font-semibold text-white">二要素認証</h2>
            </div>
            <p className="text-sm text-blue-100/70">認証アプリのコードを入力してください</p>
          </CardHeader>

          <CardContent className="px-7 pb-7">
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {error && (
                <div className="rounded-lg bg-red-500/20 border border-red-400/30 px-4 py-3 text-sm text-red-100">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="code" className="text-blue-100 font-medium text-sm">
                  認証コード（6桁）
                </Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  required
                  autoComplete="one-time-code"
                  className="bg-white/10 border-white/20 text-white placeholder:text-blue-200/40 focus:border-white/50 focus:bg-white/15 h-11 font-mono tracking-widest text-center text-xl transition-all duration-200"
                />
              </div>

              <Button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full h-11 mt-2 bg-white text-indigo-700 hover:bg-blue-50 font-semibold shadow-lg shadow-black/10 transition-all duration-200 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>認証中...</span>
                  </>
                ) : (
                  '認証する'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-blue-200/50">
          © 2025 AutoAccount. All rights reserved.
        </p>
      </div>
    </div>
  )
}
