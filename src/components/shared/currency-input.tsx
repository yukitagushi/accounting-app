'use client'

import { useState, useRef, forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number | ''
  onChange: (value: number | '') => void
  className?: string
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, className, ...props }, ref) => {
    const [focused, setFocused] = useState(false)

    // Display value: formatted on blur, raw on focus
    const displayValue = (() => {
      if (value === '' || value === undefined || value === null) return ''
      if (focused) return String(value)
      return Number(value).toLocaleString('ja-JP')
    })()

    function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
      setFocused(true)
      props.onFocus?.(e)
    }

    function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
      setFocused(false)
      props.onBlur?.(e)
    }

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const raw = e.target.value.replace(/[^0-9]/g, '')
      if (raw === '') {
        onChange('')
      } else {
        const num = parseInt(raw, 10)
        if (!isNaN(num)) onChange(num)
      }
    }

    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none select-none">
          ¥
        </span>
        <Input
          ref={ref}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={cn('pl-7 text-right tabular-nums', className)}
          {...props}
        />
      </div>
    )
  }
)

CurrencyInput.displayName = 'CurrencyInput'
