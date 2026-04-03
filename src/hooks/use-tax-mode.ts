'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TaxMode } from '@/lib/types'

type TaxModeStore = {
  taxMode: TaxMode
  taxRate: number
  setTaxMode: (mode: TaxMode) => void
  setTaxRate: (rate: number) => void
  calculateTax: (amount: number) => { subtotal: number; tax: number; total: number }
}

export const useTaxModeStore = create<TaxModeStore>()(
  persist(
    (set, get) => ({
      taxMode: 'exclusive',
      taxRate: 0.10,
      setTaxMode: (mode) => set({ taxMode: mode }),
      setTaxRate: (rate) => set({ taxRate: rate }),
      calculateTax: (amount: number) => {
        const { taxMode, taxRate } = get()
        if (taxMode === 'inclusive') {
          const subtotal = Math.round(amount / (1 + taxRate))
          const tax = amount - subtotal
          return { subtotal, tax, total: amount }
        }
        const tax = Math.round(amount * taxRate)
        return { subtotal: amount, tax, total: amount + tax }
      },
    }),
    { name: 'tax-mode-store' }
  )
)
