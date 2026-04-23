'use client'

import { useMemo } from 'react'

export interface InvoicePreviewProps {
  documentType?: 'invoice' | 'estimate'
  customerName: string
  customerAddress: string
  customerCode?: string
  invoiceNumber: string
  issueDate: string
  dueDate: string
  validUntil?: string
  lineItems: Array<{
    description: string
    category?: string
    quantity: number
    unitPrice: number
    taxRate: number
    partsAmount?: number
    laborAmount?: number
  }>
  taxMode: 'inclusive' | 'exclusive'
  discount?: number
  notes: string
  companyName?: string
  companyAddress?: string
  companyPhone?: string
  companyFax?: string
  companyRepresentative?: string
  companyRegistrationNumber?: string
  vehicleName?: string
  vehicleNumber?: string
  mileage?: number
  firstRegistration?: string
  nextInspectionDate?: string
  deliveryDate?: string
  deliveryCategory?: string
  staffName?: string
  bankInfo?: string
}

function fmt(val: number): string {
  return '¥' + val.toLocaleString('ja-JP')
}

function fmtNum(val: number): string {
  return val.toLocaleString('ja-JP')
}

export function InvoicePreview({
  documentType = 'invoice',
  customerName,
  customerAddress,
  customerCode,
  invoiceNumber,
  issueDate,
  dueDate,
  validUntil,
  lineItems,
  taxMode,
  discount = 0,
  notes,
  companyName = '有限会社 竹花自工',
  companyAddress = '〒028-5642 岩手県下閉伊郡岩泉町穴沢大宮内43-5',
  companyPhone = '0194-25-4793',
  companyFax = '0194-32-3015',
  companyRepresentative = '竹花 将昭',
  companyRegistrationNumber = 'T8400002011138',
  vehicleName,
  vehicleNumber,
  mileage,
  firstRegistration,
  nextInspectionDate,
  deliveryDate,
  deliveryCategory,
  staffName,
  bankInfo = '岩手銀行 久慈支店 普通 1234567 ユ）タケハナジコウ',
}: InvoicePreviewProps) {
  const isEstimate = documentType === 'estimate'
  const title = isEstimate ? '御 見 積 書' : '御 請 求 書'

  const computedItems = useMemo(
    () =>
      lineItems.map((item) => {
        const amount = item.quantity * item.unitPrice
        return {
          ...item,
          amount,
          partsAmount: item.partsAmount ?? (item.category === '部品' ? amount : 0),
          laborAmount: item.laborAmount ?? (item.category === '技術' ? amount : 0),
        }
      }),
    [lineItems]
  )

  const partsSubtotal = computedItems.reduce((sum, l) => sum + (l.partsAmount || 0), 0)
  const laborSubtotal = computedItems.reduce((sum, l) => sum + (l.laborAmount || 0), 0)
  const rawSubtotal = partsSubtotal + laborSubtotal
  const subtotalBeforeDiscount = rawSubtotal || computedItems.reduce((sum, l) => sum + l.amount, 0)

  const discountedSubtotal = subtotalBeforeDiscount - discount

  // Calculate tax respecting per-line tax rates and tax mode
  const taxAmount = (() => {
    if (subtotalBeforeDiscount === 0) return 0
    const discountRatio = subtotalBeforeDiscount > 0 ? discountedSubtotal / subtotalBeforeDiscount : 1
    if (taxMode === 'inclusive') {
      return computedItems.reduce((sum, l) => {
        const discountedAmount = l.amount * discountRatio
        return sum + Math.floor(discountedAmount * l.taxRate / (1 + l.taxRate))
      }, 0)
    }
    return computedItems.reduce((sum, l) => {
      const discountedAmount = l.amount * discountRatio
      return sum + Math.floor(discountedAmount * l.taxRate)
    }, 0)
  })()

  const subTotal = taxMode === 'inclusive' ? discountedSubtotal : discountedSubtotal + taxAmount
  const grandTotal = subTotal

  // Cell style helpers
  const cellBorder = '1px solid #333'
  const headerBg = '#e8e8e8'
  const cellPad = '2px 4px'

  return (
    <div className="origin-top-left" style={{ width: 595, minHeight: 842 }}>
      <div
        style={{
          width: 595,
          minHeight: 842,
          padding: '20px 25px',
          fontFamily: "'Noto Sans JP', 'Hiragino Kaku Gothic ProN', sans-serif",
          fontSize: 9,
          color: '#1a1a1a',
          backgroundColor: '#ffffff',
        }}
      >
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 8 }}>
            {title}
          </div>
        </div>

        {/* Header Row: Customer left, Company right */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          {/* Customer block */}
          <div style={{ flex: 1, maxWidth: '55%' }}>
            <div style={{
              fontSize: 13, fontWeight: 700,
              borderBottom: '2px solid #1a1a1a',
              paddingBottom: 2, marginBottom: 4,
            }}>
              {(customerName || '--------') + ' 御中'}
            </div>
            {customerAddress && (
              <div style={{ fontSize: 8, color: '#555', marginBottom: 2 }}>{customerAddress}</div>
            )}
            {customerCode && (
              <div style={{ fontSize: 8, color: '#555' }}>{'顧客コード: ' + customerCode}</div>
            )}
          </div>

          {/* Company block */}
          <div style={{ textAlign: 'right', fontSize: 8, maxWidth: '42%' }}>
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 2 }}>{companyName}</div>
            <div style={{ marginBottom: 1 }}>{'代表取締役 ' + companyRepresentative}</div>
            <div style={{ marginBottom: 1 }}>{companyAddress}</div>
            <div style={{ marginBottom: 1 }}>{'TEL ' + companyPhone + '  FAX ' + companyFax}</div>
            <div style={{ marginBottom: 4 }}>{'登録番号 ' + companyRegistrationNumber}</div>
          </div>
        </div>

        {/* Document number & date */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 8 }}>
          <div>{'No. ' + (invoiceNumber || '---')}</div>
          <div>{'発行日: ' + (issueDate || '----/--/--')}</div>
        </div>

        {/* Vehicle Info Bar */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8, fontSize: 7.5 }}>
          <tbody>
            <tr>
              <td style={{ border: cellBorder, backgroundColor: headerBg, padding: cellPad, fontWeight: 700, width: '10%', textAlign: 'center' }}>{'入庫日'}</td>
              <td style={{ border: cellBorder, padding: cellPad, width: '12%', textAlign: 'center' }}>{deliveryDate || ''}</td>
              <td style={{ border: cellBorder, backgroundColor: headerBg, padding: cellPad, fontWeight: 700, width: '10%', textAlign: 'center' }}>{'次回車検日'}</td>
              <td style={{ border: cellBorder, padding: cellPad, width: '12%', textAlign: 'center' }}>{nextInspectionDate || ''}</td>
              <td style={{ border: cellBorder, backgroundColor: headerBg, padding: cellPad, fontWeight: 700, width: '6%', textAlign: 'center' }}>{'車名'}</td>
              <td style={{ border: cellBorder, padding: cellPad, width: '14%', textAlign: 'center' }}>{vehicleName || ''}</td>
              <td style={{ border: cellBorder, backgroundColor: headerBg, padding: cellPad, fontWeight: 700, width: '6%', textAlign: 'center' }}>{'初年度'}</td>
              <td style={{ border: cellBorder, padding: cellPad, width: '8%', textAlign: 'center' }}>{firstRegistration || ''}</td>
              <td style={{ border: cellBorder, backgroundColor: headerBg, padding: cellPad, fontWeight: 700, width: '10%', textAlign: 'center' }}>{'走行距離'}</td>
              <td style={{ border: cellBorder, padding: cellPad, width: '12%', textAlign: 'right' }}>{mileage ? fmtNum(mileage) + ' km' : ''}</td>
            </tr>
            <tr>
              <td style={{ border: cellBorder, backgroundColor: headerBg, padding: cellPad, fontWeight: 700, textAlign: 'center' }}>{'車両番号'}</td>
              <td style={{ border: cellBorder, padding: cellPad, textAlign: 'center' }} colSpan={3}>{vehicleNumber || ''}</td>
              <td style={{ border: cellBorder, backgroundColor: headerBg, padding: cellPad, fontWeight: 700, textAlign: 'center' }}>{'納品区分'}</td>
              <td style={{ border: cellBorder, padding: cellPad, textAlign: 'center' }}>{deliveryCategory || ''}</td>
              <td style={{ border: cellBorder, backgroundColor: headerBg, padding: cellPad, fontWeight: 700, textAlign: 'center' }}>{'担当'}</td>
              <td style={{ border: cellBorder, padding: cellPad, textAlign: 'center' }} colSpan={3}>{staffName || ''}</td>
            </tr>
          </tbody>
        </table>

        {/* Main Items Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 2, fontSize: 8 }}>
          <thead>
            <tr style={{ backgroundColor: headerBg }}>
              <th style={{ border: cellBorder, padding: cellPad, textAlign: 'left', width: '36%', fontWeight: 700 }}>
                {'作業内容・使用部品名'}
              </th>
              <th style={{ border: cellBorder, padding: cellPad, textAlign: 'center', width: '8%', fontWeight: 700 }}>
                {'区分'}
              </th>
              <th style={{ border: cellBorder, padding: cellPad, textAlign: 'right', width: '8%', fontWeight: 700 }}>
                {'数量'}
              </th>
              <th style={{ border: cellBorder, padding: cellPad, textAlign: 'right', width: '12%', fontWeight: 700 }}>
                {'単価'}
              </th>
              <th style={{ border: cellBorder, padding: cellPad, textAlign: 'right', width: '18%', fontWeight: 700 }}>
                {'部品金額'}
              </th>
              <th style={{ border: cellBorder, padding: cellPad, textAlign: 'right', width: '18%', fontWeight: 700 }}>
                {'技術料'}
              </th>
            </tr>
          </thead>
          <tbody>
            {computedItems.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ border: cellBorder, padding: '8px 4px', textAlign: 'center', color: '#999' }}>
                  {'明細を入力してください'}
                </td>
              </tr>
            ) : (
              computedItems.map((item, idx) => (
                <tr key={idx} style={{ backgroundColor: idx % 2 === 1 ? '#f9f9f9' : 'transparent' }}>
                  <td style={{ border: cellBorder, padding: cellPad }}>{item.description || ''}</td>
                  <td style={{ border: cellBorder, padding: cellPad, textAlign: 'center' }}>{item.category || ''}</td>
                  <td style={{ border: cellBorder, padding: cellPad, textAlign: 'right' }}>{fmtNum(item.quantity)}</td>
                  <td style={{ border: cellBorder, padding: cellPad, textAlign: 'right' }}>{fmt(item.unitPrice)}</td>
                  <td style={{ border: cellBorder, padding: cellPad, textAlign: 'right' }}>{item.partsAmount ? fmt(item.partsAmount) : ''}</td>
                  <td style={{ border: cellBorder, padding: cellPad, textAlign: 'right' }}>{item.laborAmount ? fmt(item.laborAmount) : ''}</td>
                </tr>
              ))
            )}
            {/* Empty rows to fill space */}
            {computedItems.length < 10 && Array.from({ length: Math.max(0, 10 - computedItems.length) }).map((_, i) => (
              <tr key={`empty-${i}`}>
                <td style={{ border: cellBorder, padding: cellPad, height: 16 }}>&nbsp;</td>
                <td style={{ border: cellBorder, padding: cellPad }}>&nbsp;</td>
                <td style={{ border: cellBorder, padding: cellPad }}>&nbsp;</td>
                <td style={{ border: cellBorder, padding: cellPad }}>&nbsp;</td>
                <td style={{ border: cellBorder, padding: cellPad }}>&nbsp;</td>
                <td style={{ border: cellBorder, padding: cellPad }}>&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Notes row beneath table */}
        {notes && (
          <div style={{ border: cellBorder, padding: '4px 6px', marginBottom: 8, fontSize: 7.5, color: '#444', whiteSpace: 'pre-line' }}>
            {'備考: ' + notes}
          </div>
        )}

        {/* Bottom section: Left info + Right totals */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          {/* Left: Validity / Delivery info */}
          <div style={{ fontSize: 7.5, maxWidth: '45%' }}>
            {isEstimate && validUntil && (
              <div style={{ marginBottom: 4 }}>
                <span style={{ fontWeight: 700 }}>{'見積有効期限: '}</span>
                <span>{validUntil}</span>
              </div>
            )}
            {!isEstimate && dueDate && (
              <div style={{ marginBottom: 4 }}>
                <span style={{ fontWeight: 700 }}>{'支払期限: '}</span>
                <span>{dueDate}</span>
              </div>
            )}
            <div style={{ marginTop: 12, fontSize: 7, color: '#555' }}>
              {'お気軽にお問い合わせください'}
            </div>
            <div style={{ marginTop: 8, fontSize: 7.5 }}>
              <div style={{ fontWeight: 700, marginBottom: 2 }}>{'振込口座'}</div>
              <div>{bankInfo}</div>
            </div>
          </div>

          {/* Right: Totals table */}
          <div style={{ width: '48%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 8 }}>
              <tbody>
                <tr>
                  <td style={{ border: cellBorder, backgroundColor: headerBg, padding: cellPad, fontWeight: 700, textAlign: 'center' }}>{'合計'}</td>
                  <td style={{ border: cellBorder, padding: cellPad, textAlign: 'right' }}>{fmt(partsSubtotal)}</td>
                  <td style={{ border: cellBorder, padding: cellPad, textAlign: 'right' }}>{fmt(laborSubtotal)}</td>
                </tr>
                <tr>
                  <td style={{ border: cellBorder, backgroundColor: headerBg, padding: cellPad, fontWeight: 700, textAlign: 'center' }}>{'課税計'}</td>
                  <td style={{ border: cellBorder, padding: cellPad, textAlign: 'right' }} colSpan={2}>{fmt(discountedSubtotal)}</td>
                </tr>
                <tr>
                  <td style={{ border: cellBorder, backgroundColor: headerBg, padding: cellPad, fontWeight: 700, textAlign: 'center' }}>{'消費税'}</td>
                  <td style={{ border: cellBorder, padding: cellPad, textAlign: 'right' }} colSpan={2}>{fmt(taxAmount)}</td>
                </tr>
                <tr>
                  <td style={{ border: cellBorder, backgroundColor: headerBg, padding: cellPad, fontWeight: 700, textAlign: 'center' }}>{'(小計)'}</td>
                  <td style={{ border: cellBorder, padding: cellPad, textAlign: 'right' }} colSpan={2}>{fmt(subTotal)}</td>
                </tr>
                {discount > 0 && (
                  <tr>
                    <td style={{ border: cellBorder, backgroundColor: headerBg, padding: cellPad, fontWeight: 700, textAlign: 'center' }}>{'値引き'}</td>
                    <td style={{ border: cellBorder, padding: cellPad, textAlign: 'right', color: '#c00' }} colSpan={2}>{'-' + fmt(discount)}</td>
                  </tr>
                )}
                <tr style={{ backgroundColor: '#fef3c7' }}>
                  <td style={{ border: '2px solid #333', padding: '4px 6px', fontWeight: 700, textAlign: 'center', fontSize: 10 }}>{'総合計'}</td>
                  <td style={{ border: '2px solid #333', padding: '4px 6px', textAlign: 'right', fontWeight: 700, fontSize: 12, color: '#c0392b' }} colSpan={2}>{fmt(grandTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
