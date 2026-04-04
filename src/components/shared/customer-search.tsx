'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { searchCustomers } from '@/lib/mock-data'
import type { Customer } from '@/lib/types'
import { Search, Users, Loader2, Building2, Phone, Mail, User } from 'lucide-react'

interface CustomerSearchProps {
  onSelect: (customer: Customer) => void
  currentCustomerName?: string
}

export function CustomerSearch({ onSelect, currentCustomerName }: CustomerSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Customer[]>([])
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
      const found = await searchCustomers(keyword)
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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelect(customer: Customer) {
    onSelect(customer)
    setQuery('')
    setResults([])
    setHasSearched(false)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
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
          placeholder="顧客検索... (名前・コード・住所・電話番号)"
          className="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-300 bg-gray-50 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />
        )}
      </div>

      {currentCustomerName && !query && (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500">
          <Building2 className="w-3 h-3" />
          <span>選択中: {currentCustomerName}</span>
        </div>
      )}

      {isOpen && hasSearched && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg max-h-[360px] overflow-y-auto">
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-400">
              該当する顧客が見つかりません
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {results.map((cust) => (
                <button
                  key={cust.id}
                  type="button"
                  onClick={() => handleSelect(cust)}
                  className="w-full px-4 py-3 hover:bg-blue-50 transition-colors text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                          {cust.customer_code}
                        </span>
                        {cust.name_kana && (
                          <span className="text-xs text-gray-400">{cust.name_kana}</span>
                        )}
                      </div>
                      <div className="text-sm font-semibold text-gray-900">
                        {cust.name}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{cust.address}</div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        {cust.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {cust.phone}
                          </span>
                        )}
                        {cust.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {cust.email}
                          </span>
                        )}
                        {cust.contact_person && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {cust.contact_person}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {isOpen && !hasSearched && query === '' && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg">
          <div className="px-4 py-5 text-center text-sm text-gray-400">
            <Users className="w-5 h-5 mx-auto mb-1.5 text-gray-300" />
            顧客名・コード・住所で検索
          </div>
        </div>
      )}
    </div>
  )
}
