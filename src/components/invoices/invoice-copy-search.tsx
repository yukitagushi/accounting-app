'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { searchInvoices } from '@/lib/mock-data'
import type { Invoice } from '@/lib/types'
import { Search, Copy, FileText, Loader2 } from 'lucide-react'

function formatCurrency(val: number): string {
  return '\u00a5' + val.toLocaleString('ja-JP')
}

interface InvoiceCopySearchProps {
  onCopy: (invoice: Invoice) => void
}

export function InvoiceCopySearch({ onCopy }: InvoiceCopySearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doSearch = useCallback(async (keyword: string) => {
    if (!keyword.trim()) {
      setResults([])
      setHasSearched(false)
      setLoading(false)
      return
    }
    setLoading(true)
    setHasSearched(true)
    try {
      const found = await searchInvoices(keyword)
      setResults(found)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      doSearch(query)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, doSearch])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleCopy(invoice: Invoice) {
    onCopy(invoice)
    setQuery('')
    setResults([])
    setHasSearched(false)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className="relative mb-6">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4 text-blue-500" />
          <h3 className="text-sm font-semibold text-gray-700">
            過去の請求書からコピー
          </h3>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setIsOpen(true)
            }}
            onFocus={() => {
              if (query.trim()) setIsOpen(true)
            }}
            placeholder="過去の請求書から検索... (例: 車検 アルファード)"
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-300 bg-gray-50 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />
          )}
        </div>
      </div>

      {/* Dropdown results */}
      {isOpen && hasSearched && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg max-h-[400px] overflow-y-auto">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              該当する請求書が見つかりません
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {results.map((inv) => (
                <div
                  key={inv.id}
                  className="px-4 py-3 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-gray-500">
                          {inv.invoice_number}
                        </span>
                        <span className="text-xs text-gray-400">{inv.issue_date}</span>
                      </div>
                      <div className="text-sm font-semibold text-gray-900 mb-1">
                        {inv.customer_name}
                      </div>
                      {inv.line_items && inv.line_items.length > 0 && (
                        <div className="text-xs text-gray-500 space-y-0.5">
                          {inv.line_items.slice(0, 3).map((item, i) => (
                            <div key={i} className="truncate">
                              {item.description}
                              {item.quantity > 1 ? ` x${item.quantity}` : ''}
                              {' '}
                              <span className="text-gray-400">
                                {formatCurrency(item.amount)}
                              </span>
                            </div>
                          ))}
                          {inv.line_items.length > 3 && (
                            <div className="text-gray-400">
                              ...他 {inv.line_items.length - 3}件
                            </div>
                          )}
                        </div>
                      )}
                      {inv.notes && (
                        <div className="text-xs text-gray-400 mt-1 truncate">
                          {inv.notes}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="text-sm font-bold tabular-nums text-gray-900">
                        {formatCurrency(inv.total)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(inv)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
                      >
                        <Copy className="w-3 h-3" />
                        コピーして作成
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty state hint */}
      {isOpen && !hasSearched && query === '' && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg">
          <div className="px-4 py-6 text-center text-sm text-gray-400">
            キーワードを入力して過去の請求書を検索
          </div>
        </div>
      )}
    </div>
  )
}
