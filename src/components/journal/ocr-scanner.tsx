'use client'

import { useState, useRef, useCallback } from 'react'
import { Camera, Upload, RotateCcw, CheckCircle2, ChevronDown, ChevronUp, Loader2, FileImage, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { processReceiptImage, type OCRResult } from '@/lib/ocr-engine'

// ── Types ─────────────────────────────────────────────────────────────────────

export type OCRScannerProps = {
  onCreateEntry: (entry: OCRResult['suggestedJournalEntry'], data: OCRResult['data']) => void
  onEditEntry: (entry: OCRResult['suggestedJournalEntry'], data: OCRResult['data']) => void
}

type ScanState = 'idle' | 'processing' | 'done' | 'error'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatYen(n: number): string {
  return `¥${n.toLocaleString('ja-JP')}`
}

function paymentMethodLabel(method: 'cash' | 'credit_card' | 'bank_transfer'): string {
  const map = { cash: '現金', credit_card: 'クレジットカード', bank_transfer: '銀行振込' }
  return map[method]
}

// ── Progress Bar ──────────────────────────────────────────────────────────────

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
      <motion.div
        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600"
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      />
    </div>
  )
}

// ── Confidence Badge ──────────────────────────────────────────────────────────

function ConfidenceBadge({ score }: { score: number }) {
  const color =
    score >= 90 ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' :
    score >= 75 ? 'bg-amber-50 text-amber-700 ring-amber-200' :
    'bg-rose-50 text-rose-700 ring-rose-200'
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ring-1', color)}>
      <CheckCircle2 className="size-3" />
      認識精度 {score}%
    </span>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function OCRScanner({ onCreateEntry, onEditEntry }: OCRScannerProps) {
  const [state, setState] = useState<ScanState>('idle')
  const [progress, setProgress] = useState(0)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [result, setResult] = useState<OCRResult | null>(null)
  const [showRawText, setShowRawText] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return
    if (file.size > 10 * 1024 * 1024) {
      toast.error('ファイルサイズは10MB以下にしてください')
      return
    }

    const url = URL.createObjectURL(file)
    setImageUrl(url)
    setState('processing')
    setProgress(0)

    try {
      const ocrResult = await processReceiptImage(file, (p) => setProgress(p))
      if (!ocrResult.success) {
        toast.error('レシートの読み取りに失敗しました。画像を確認してください。')
        setState('error')
        return
      }
      setResult(ocrResult)
      setState('done')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'OCR処理に失敗しました')
      setState('error')
    }
  }, [])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave() {
    setIsDragging(false)
  }

  function handleReset() {
    setState('idle')
    setProgress(0)
    setResult(null)
    if (imageUrl) URL.revokeObjectURL(imageUrl)
    setImageUrl(null)
    setShowRawText(false)
  }

  // ── Idle / Upload ──────────────────────────────────────────────────────────

  if (state === 'idle') {
    return (
      <div className="space-y-4">
        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 p-10',
            isDragging
              ? 'border-indigo-400 bg-indigo-50 scale-[1.01]'
              : 'border-gray-200 bg-gradient-to-b from-gray-50 to-white hover:border-indigo-300 hover:bg-indigo-50/30'
          )}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
          aria-label="レシートをアップロード"
        >
          <div className={cn(
            'flex items-center justify-center w-16 h-16 rounded-2xl transition-colors',
            isDragging ? 'bg-indigo-100' : 'bg-indigo-50'
          )}>
            <FileImage className="w-7 h-7 text-indigo-500" />
          </div>

          <div className="text-center space-y-1">
            <p className="text-sm font-semibold text-gray-700">
              レシート・領収書をアップロード
            </p>
            <p className="text-xs text-gray-400">
              ドラッグ＆ドロップ、またはクリックしてファイルを選択
            </p>
            <p className="text-xs text-gray-300">JPG / PNG / HEIC / WebP・最大10MB</p>
          </div>

          {isDragging && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 rounded-2xl bg-indigo-500/5 border-2 border-indigo-400 pointer-events-none"
            />
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/heic,image/webp,image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Camera button for mobile */}
        <Button
          type="button"
          variant="outline"
          className="w-full h-12 gap-2.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300"
          onClick={() => cameraInputRef.current?.click()}
        >
          <Camera className="size-4" />
          カメラで撮影する
        </Button>

        <p className="text-center text-xs text-gray-400">
          スマートフォンではカメラを使ってその場で撮影できます
        </p>
      </div>
    )
  }

  // ── Processing ──────────────────────────────────────────────────────────────

  if (state === 'processing') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
          {imageUrl && (
            <img
              src={imageUrl}
              alt="アップロード画像"
              className="w-20 h-20 object-cover rounded-xl border border-gray-200 shrink-0"
            />
          )}
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-center gap-2">
              <Loader2 className="size-4 text-indigo-500 animate-spin shrink-0" />
              <span className="text-sm font-semibold text-gray-700">OCR処理中...</span>
            </div>
            <ProgressBar value={progress} />
            <p className="text-xs text-gray-400">
              {progress < 30 ? '画像を解析しています...' :
               progress < 60 ? 'テキストを抽出しています...' :
               progress < 85 ? '勘定科目を推定しています...' :
               '仕訳データを生成しています...'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {['画像解析', 'テキスト抽出', '仕訳推定'].map((label, i) => {
            const threshold = [30, 65, 90]
            const done = progress >= threshold[i]
            return (
              <div key={label} className={cn(
                'flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all',
                done ? 'border-indigo-200 bg-indigo-50' : 'border-gray-100 bg-gray-50'
              )}>
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center',
                  done ? 'bg-indigo-500' : 'bg-gray-200'
                )}>
                  {done
                    ? <CheckCircle2 className="size-3.5 text-white" />
                    : <span className="text-xs text-gray-400">{i + 1}</span>
                  }
                </div>
                <span className={cn('text-xs font-medium', done ? 'text-indigo-700' : 'text-gray-400')}>
                  {label}
                </span>
              </div>
            )
          })}
        </div>
      </motion.div>
    )
  }

  // ── Error ───────────────────────────────────────────────────────────────────

  if (state === 'error') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="flex flex-col items-center gap-3 p-8 rounded-2xl bg-rose-50 border border-rose-100 text-center">
          <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
            <Upload className="size-5 text-rose-500" />
          </div>
          <p className="text-sm font-semibold text-rose-700">OCR処理に失敗しました</p>
          <p className="text-xs text-rose-500">画像を確認して、もう一度お試しください</p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          onClick={handleReset}
        >
          <RotateCcw className="size-4" />
          やり直す
        </Button>
      </motion.div>
    )
  }

  // ── Done ────────────────────────────────────────────────────────────────────

  if (state === 'done' && result) {
    const { data, suggestedJournalEntry, confidence, rawText } = result
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-5"
      >
        {/* Result card */}
        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/30 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-indigo-100 bg-indigo-500">
            <Sparkles className="size-4 text-indigo-100 shrink-0" />
            <span className="text-sm font-semibold text-white flex-1">OCR読み取り結果</span>
            <ConfidenceBadge score={confidence} />
          </div>

          {/* Body */}
          <div className="p-5">
            <div className="flex items-start gap-4">
              {/* Image thumbnail */}
              {imageUrl && (
                <div className="shrink-0">
                  <img
                    src={imageUrl}
                    alt="レシート画像"
                    className="w-24 h-28 object-cover rounded-xl border border-gray-200 shadow-sm"
                  />
                </div>
              )}

              {/* Parsed data */}
              <div className="flex-1 min-w-0 space-y-3">
                <div>
                  <p className="text-lg font-bold text-gray-900 truncate">{data.vendor}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{data.date}</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">合計金額</p>
                    <p className="text-base font-bold text-gray-900 tabular-nums">{formatYen(data.total)}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">消費税</p>
                    <p className="text-base font-bold text-gray-900 tabular-nums">{formatYen(data.tax)}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">カテゴリ</p>
                    <p className="text-sm font-semibold text-indigo-700">{data.category}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">支払方法</p>
                    <p className="text-sm font-semibold text-gray-700">{paymentMethodLabel(data.paymentMethod)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Items */}
            {data.items.length > 0 && (
              <div className="mt-4 rounded-xl border border-gray-100 overflow-hidden">
                <div className="bg-gray-50 px-3 py-1.5">
                  <p className="text-xs font-semibold text-gray-500">明細</p>
                </div>
                <div className="divide-y divide-gray-50">
                  {data.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 gap-2">
                      <span className="text-xs text-gray-600 flex-1 min-w-0 truncate">{item.description}</span>
                      <span className="text-xs font-semibold text-gray-800 tabular-nums shrink-0">
                        {item.amount > 0 ? formatYen(item.amount) : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Suggested journal entry */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 bg-gray-50">
            <span className="text-sm font-semibold text-gray-700">仕訳内容を確認</span>
            <span className="ml-auto text-xs text-gray-400">自動生成された仕訳案</span>
          </div>
          <div className="p-4">
            <p className="text-xs font-medium text-gray-500 mb-3">摘要: {suggestedJournalEntry.description}</p>
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="py-2 px-3 text-left font-medium text-gray-500">勘定科目</th>
                    <th className="py-2 px-3 text-right font-medium text-blue-600">借方</th>
                    <th className="py-2 px-3 text-right font-medium text-orange-600">貸方</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {suggestedJournalEntry.lines.map((line, i) => (
                    <tr key={i} className="group hover:bg-gray-50 transition-colors">
                      <td className="py-2.5 px-3">
                        <span className="font-medium text-gray-700">{line.accountName}</span>
                        <span className="ml-1.5 text-gray-300">{line.accountCode}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-blue-700">
                        {line.debitAmount > 0 ? formatYen(line.debitAmount) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-orange-700">
                        {line.creditAmount > 0 ? formatYen(line.creditAmount) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Raw OCR text - collapsible */}
        <div className="rounded-xl border border-gray-100 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowRawText((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
          >
            <span className="text-xs font-medium text-gray-500">OCR読み取りテキスト（原文）</span>
            {showRawText
              ? <ChevronUp className="size-3.5 text-gray-400" />
              : <ChevronDown className="size-3.5 text-gray-400" />}
          </button>
          <AnimatePresence>
            {showRawText && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <pre className="px-4 py-3 text-[11px] text-gray-500 font-mono bg-white leading-relaxed whitespace-pre-wrap overflow-x-auto">
                  {rawText}
                </pre>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2.5">
          <Button
            type="button"
            className="w-full h-11 gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200"
            onClick={() => onCreateEntry(suggestedJournalEntry, data)}
          >
            <CheckCircle2 className="size-4" />
            この内容で仕訳を作成
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            onClick={() => onEditEntry(suggestedJournalEntry, data)}
          >
            内容を編集して作成
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full h-10 gap-2 text-gray-500 hover:text-gray-700"
            onClick={handleReset}
          >
            <RotateCcw className="size-4" />
            やり直す
          </Button>
        </div>
      </motion.div>
    )
  }

  return null
}
