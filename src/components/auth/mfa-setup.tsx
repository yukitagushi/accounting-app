'use client'

import { useState } from 'react'
import { Shield, ShieldCheck, QrCode, Key, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/hooks/use-auth'

type Step = 'idle' | 'qr' | 'verify' | 'done'

export function MfaSetup() {
  const { user, loadUser } = useAuthStore()
  const [step, setStep] = useState<Step>('idle')
  const [loading, setLoading] = useState(false)
  const [factorId, setFactorId] = useState('')
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')

  const mfaEnabled = user?.mfaEnabled ?? false

  async function handleEnroll() {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'AutoAccount',
      })
      if (error || !data) {
        toast.error('MFA設定の開始に失敗しました')
        return
      }
      setFactorId(data.id)
      setQrCode(data.totp.qr_code)
      setSecret(data.totp.secret)
      setStep('qr')
    } catch {
      toast.error('MFA設定の開始に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify() {
    if (code.length !== 6) {
      toast.error('6桁のコードを入力してください')
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code,
      })
      if (error) {
        toast.error('コードが正しくありません')
        return
      }
      toast.success('MFA有効化完了')
      setStep('done')
      await loadUser()
    } catch {
      toast.error('認証に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  async function handleUnenroll() {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const totpFactor = (factors?.totp ?? []).find((f) => f.status === 'verified')
      if (!totpFactor) {
        toast.error('有効なMFAファクターが見つかりません')
        return
      }
      const { error } = await supabase.auth.mfa.unenroll({ factorId: totpFactor.id })
      if (error) {
        toast.error('MFA無効化に失敗しました')
        return
      }
      toast.success('MFAを無効化しました')
      await loadUser()
      setStep('idle')
      setCode('')
      setQrCode('')
    } catch {
      toast.error('MFA無効化に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  if (mfaEnabled && step !== 'idle') {
    // After unenroll flow, show enabled state again
  }

  return (
    <Card className="border-0 shadow-sm ring-1 ring-gray-100">
      <CardHeader>
        <div className="flex items-center gap-2">
          {mfaEnabled ? (
            <ShieldCheck className="w-4 h-4 text-green-600" />
          ) : (
            <Shield className="w-4 h-4 text-gray-400" />
          )}
          <CardTitle className="text-sm font-semibold text-gray-700">
            二要素認証（MFA）
          </CardTitle>
          {mfaEnabled && (
            <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] px-1.5 py-0 h-4 font-medium">
              MFA有効
            </Badge>
          )}
        </div>
        <CardDescription>
          認証アプリ（Google Authenticator等）を使って二要素認証を設定します
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Already enabled */}
        {mfaEnabled && step === 'idle' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              二要素認証が有効です。ログイン時に認証コードの入力が必要です。
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleUnenroll}
              disabled={loading}
              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              MFAを無効化する
            </Button>
          </div>
        )}

        {/* Not enabled – idle */}
        {!mfaEnabled && step === 'idle' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              二要素認証は現在無効です。有効化するとセキュリティが向上します。
            </p>
            <Button
              size="sm"
              onClick={handleEnroll}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <QrCode className="w-3.5 h-3.5" />
              )}
              MFAを有効化する
            </Button>
          </div>
        )}

        {/* QR code step */}
        {step === 'qr' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              認証アプリでQRコードをスキャンしてください。
            </p>
            {qrCode && (
              <div className="flex justify-center p-4 bg-white border border-gray-200 rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrCode} alt="MFA QRコード" className="w-40 h-40" />
              </div>
            )}
            {secret && (
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">シークレットキー（手動入力用）</Label>
                <p className="text-xs font-mono bg-gray-50 border border-gray-200 rounded px-3 py-2 break-all text-gray-700">
                  {secret}
                </p>
              </div>
            )}
            <Button
              size="sm"
              onClick={() => setStep('verify')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Key className="w-3.5 h-3.5" />
              コードを入力する
            </Button>
          </div>
        )}

        {/* Verify step */}
        {step === 'verify' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              認証アプリに表示された6桁のコードを入力してください。
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="mfa-code" className="text-xs font-medium text-gray-600">
                認証コード
              </Label>
              <Input
                id="mfa-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="h-9 text-sm font-mono tracking-widest max-w-[160px]"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleVerify}
                disabled={loading || code.length !== 6}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                認証する
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setStep('qr'); setCode('') }}
                disabled={loading}
              >
                戻る
              </Button>
            </div>
          </div>
        )}

        {/* Done step */}
        {step === 'done' && (
          <div className="flex items-center gap-2 text-sm text-green-700">
            <ShieldCheck className="w-4 h-4" />
            MFAが正常に有効化されました
          </div>
        )}
      </CardContent>
    </Card>
  )
}
