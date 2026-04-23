import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import type { Invoice, Estimate } from '@/lib/types'

const DEFAULT_COMPANY_NAME = '有限会社 竹花自工'
const DEFAULT_COMPANY_REP = '代表取締役 竹花 将昭'
const DEFAULT_COMPANY_ADDRESS = '〒028-5642 岩手県下閉伊郡岩泉町穴沢大宮内43-5'
const DEFAULT_COMPANY_TEL = 'TEL 0194-25-4793  FAX 0194-32-3015'
const DEFAULT_COMPANY_REG = '登録番号 T8400002011138'
const DEFAULT_BANK_INFO = '岩手銀行 久慈支店 普通 1234567 ユ）タケハナジコウ'

export type CompanyInfo = {
  name?: string
  representative?: string
  address?: string
  tel?: string
  registration_number?: string
  bank_info?: string
}

function fmt(val: number): string {
  return '¥' + val.toLocaleString('ja-JP')
}

function applyBorder(cell: ExcelJS.Cell, style: 'thin' | 'medium' = 'thin') {
  cell.border = {
    top: { style }, bottom: { style }, left: { style }, right: { style },
  }
}

function headerCell(cell: ExcelJS.Cell, value: string) {
  cell.value = value
  cell.font = { bold: true, size: 8 }
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } }
  cell.alignment = { horizontal: 'center', vertical: 'middle' }
  applyBorder(cell)
}

function valueCell(cell: ExcelJS.Cell, value: string | number, align: 'left' | 'center' | 'right' = 'center') {
  cell.value = value
  cell.font = { size: 8 }
  cell.alignment = { horizontal: align, vertical: 'middle' }
  applyBorder(cell)
}

function buildWorkbook(
  type: 'invoice' | 'estimate',
  data: Invoice | Estimate,
  companyInfo?: CompanyInfo,
) {
  const COMPANY_NAME = companyInfo?.name ?? DEFAULT_COMPANY_NAME
  const COMPANY_REP = companyInfo?.representative ?? DEFAULT_COMPANY_REP
  const COMPANY_ADDRESS = companyInfo?.address ?? DEFAULT_COMPANY_ADDRESS
  const COMPANY_TEL = companyInfo?.tel ?? DEFAULT_COMPANY_TEL
  const COMPANY_REG = companyInfo?.registration_number ?? DEFAULT_COMPANY_REG
  const BANK_INFO = companyInfo?.bank_info ?? DEFAULT_BANK_INFO
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(type === 'invoice' ? '御請求書' : '御見積書')

  // Column widths (A-J = 10 columns)
  ws.columns = [
    { width: 6 },  // A
    { width: 22 }, // B - description
    { width: 8 },  // C - category
    { width: 7 },  // D - qty
    { width: 12 }, // E - unit price
    { width: 14 }, // F - parts amount
    { width: 14 }, // G - labor amount
    { width: 10 }, // H
    { width: 14 }, // I
    { width: 14 }, // J
  ]

  // Row 1: Title
  const titleRow = ws.getRow(1)
  ws.mergeCells('A1:J1')
  const titleCell = ws.getCell('A1')
  titleCell.value = type === 'invoice' ? '御 請 求 書' : '御 見 積 書'
  titleCell.font = { bold: true, size: 18 }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  titleRow.height = 32

  // Row 2-3: Customer (left) + Company (right)
  ws.mergeCells('A2:E2')
  const custCell = ws.getCell('A2')
  custCell.value = (data.customer_name || '') + ' 御中'
  custCell.font = { bold: true, size: 12 }
  custCell.border = { bottom: { style: 'medium' } }

  ws.mergeCells('F2:J2')
  const compCell = ws.getCell('F2')
  compCell.value = COMPANY_NAME
  compCell.font = { bold: true, size: 10 }
  compCell.alignment = { horizontal: 'right' }

  ws.mergeCells('A3:E3')
  ws.getCell('A3').value = data.customer_address || ''
  ws.getCell('A3').font = { size: 8 }

  ws.mergeCells('F3:J3')
  ws.getCell('F3').value = COMPANY_REP
  ws.getCell('F3').font = { size: 8 }
  ws.getCell('F3').alignment = { horizontal: 'right' }

  // Row 4: more company info
  ws.mergeCells('F4:J4')
  ws.getCell('F4').value = COMPANY_ADDRESS
  ws.getCell('F4').font = { size: 8 }
  ws.getCell('F4').alignment = { horizontal: 'right' }

  ws.mergeCells('A4:E4')
  const codeStr = 'customer_code' in data && data.customer_code ? '顧客コード: ' + data.customer_code : ''
  ws.getCell('A4').value = codeStr
  ws.getCell('A4').font = { size: 8 }

  // Row 5: Tel/Fax + Registration
  ws.mergeCells('F5:J5')
  ws.getCell('F5').value = COMPANY_TEL
  ws.getCell('F5').font = { size: 8 }
  ws.getCell('F5').alignment = { horizontal: 'right' }

  ws.mergeCells('A5:E5')
  const numLabel = type === 'invoice' ? 'No. ' + (data as Invoice).invoice_number : 'No. ' + (data as Estimate).estimate_number
  ws.getCell('A5').value = numLabel
  ws.getCell('A5').font = { size: 8 }

  ws.mergeCells('F6:J6')
  ws.getCell('F6').value = COMPANY_REG
  ws.getCell('F6').font = { size: 8 }
  ws.getCell('F6').alignment = { horizontal: 'right' }

  ws.mergeCells('A6:E6')
  ws.getCell('A6').value = '発行日: ' + data.issue_date
  ws.getCell('A6').font = { size: 8 }

  // Row 8-9: Vehicle info
  let r = 8
  // Row 8: vehicle row 1
  headerCell(ws.getCell(r, 1), '入庫日')
  valueCell(ws.getCell(r, 2), data.delivery_date ?? '')
  headerCell(ws.getCell(r, 3), '次回車検日')
  valueCell(ws.getCell(r, 4), data.next_inspection_date ?? '')
  headerCell(ws.getCell(r, 5), '車名')
  valueCell(ws.getCell(r, 6), data.vehicle_name ?? '')
  headerCell(ws.getCell(r, 7), '初年度')
  valueCell(ws.getCell(r, 8), data.first_registration ?? '')
  headerCell(ws.getCell(r, 9), '走行距離')
  valueCell(ws.getCell(r, 10), data.mileage ? data.mileage.toLocaleString('ja-JP') + ' km' : '', 'right')

  r = 9
  headerCell(ws.getCell(r, 1), '車両番号')
  ws.mergeCells(r, 2, r, 4)
  valueCell(ws.getCell(r, 2), data.vehicle_number ?? '')
  headerCell(ws.getCell(r, 5), '納品区分')
  valueCell(ws.getCell(r, 6), data.delivery_category ?? '')
  headerCell(ws.getCell(r, 7), '担当')
  ws.mergeCells(r, 8, r, 10)
  valueCell(ws.getCell(r, 8), data.staff_name ?? '')

  // Row 11: Table header
  r = 11
  const headers = ['No', '作業内容・使用部品名', '区分', '数量', '単価', '部品金額', '技術料']
  const hCols = [1, 2, 3, 4, 5, 6, 7]
  headers.forEach((h, i) => headerCell(ws.getCell(r, hCols[i]), h))

  // Line items
  const lines = data.line_items ?? []
  lines.forEach((item, idx) => {
    r = 12 + idx
    valueCell(ws.getCell(r, 1), String(idx + 1), 'center')
    valueCell(ws.getCell(r, 2), item.description, 'left')
    valueCell(ws.getCell(r, 3), item.category ?? '', 'center')
    valueCell(ws.getCell(r, 4), String(item.quantity), 'right')
    valueCell(ws.getCell(r, 5), fmt(item.unit_price), 'right')
    valueCell(ws.getCell(r, 6), item.parts_amount ? fmt(item.parts_amount) : '', 'right')
    valueCell(ws.getCell(r, 7), item.labor_amount ? fmt(item.labor_amount) : '', 'right')
  })

  // Totals section
  const totalsStartRow = 12 + Math.max(lines.length, 1) + 1
  const disc = data.discount ?? 0
  const partsSubtotal = lines.reduce((sum, l) => sum + (l.parts_amount ?? 0), 0)
  const laborSubtotal = lines.reduce((sum, l) => sum + (l.labor_amount ?? 0), 0)
  const rawSubtotal = partsSubtotal + laborSubtotal || data.subtotal
  const taxableAmount = rawSubtotal - disc
  const taxAmount = lines.reduce((sum, l) => {
    const lineAmount = (l.parts_amount ?? 0) + (l.labor_amount ?? 0)
    return sum + Math.floor(lineAmount * (l.tax_rate ?? 0))
  }, 0)
  const subTotal = taxableAmount + taxAmount
  const grandTotal = subTotal

  const totalsData: [string, string][] = [
    ['合計', fmt(partsSubtotal) + '  /  ' + fmt(laborSubtotal)],
    ['課税計', fmt(taxableAmount)],
    ['消費税', fmt(taxAmount)],
    ['(小計)', fmt(subTotal)],
  ]
  if (disc > 0) {
    totalsData.push(['値引き', '-' + fmt(disc)])
  }
  totalsData.push(['総合計', fmt(grandTotal)])

  totalsData.forEach(([label, value], idx) => {
    const row = totalsStartRow + idx
    ws.mergeCells(row, 8, row, 9)
    headerCell(ws.getCell(row, 8), label)
    valueCell(ws.getCell(row, 10), value, 'right')
    if (label === '総合計') {
      ws.getCell(row, 8).font = { bold: true, size: 10 }
      ws.getCell(row, 8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }
      ws.getCell(row, 10).font = { bold: true, size: 12, color: { argb: 'FFC0392B' } }
      ws.getCell(row, 10).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }
      applyBorder(ws.getCell(row, 8), 'medium')
      applyBorder(ws.getCell(row, 10), 'medium')
    }
  })

  // Bottom left info
  const infoRow = totalsStartRow
  if (type === 'invoice') {
    ws.mergeCells(infoRow, 1, infoRow, 4)
    ws.getCell(infoRow, 1).value = '支払期限: ' + (data as Invoice).due_date
    ws.getCell(infoRow, 1).font = { bold: true, size: 8 }
  } else {
    ws.mergeCells(infoRow, 1, infoRow, 4)
    ws.getCell(infoRow, 1).value = '見積有効期限: ' + (data as Estimate).valid_until
    ws.getCell(infoRow, 1).font = { bold: true, size: 8 }
  }

  const bankRow = infoRow + 2
  ws.mergeCells(bankRow, 1, bankRow, 4)
  ws.getCell(bankRow, 1).value = '振込口座: ' + BANK_INFO
  ws.getCell(bankRow, 1).font = { size: 8 }

  // Notes
  if (data.notes) {
    const notesRow = bankRow + 1
    ws.mergeCells(notesRow, 1, notesRow, 7)
    ws.getCell(notesRow, 1).value = '備考: ' + data.notes
    ws.getCell(notesRow, 1).font = { size: 8 }
  }

  return wb
}

export async function exportInvoiceToExcel(invoice: Invoice, companyInfo?: CompanyInfo): Promise<void> {
  const wb = buildWorkbook('invoice', invoice, companyInfo)
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const dateStr = invoice.issue_date.replace(/-/g, '')
  saveAs(blob, `御請求書_${invoice.customer_name}_${dateStr}.xlsx`)
}

export async function exportEstimateToExcel(estimate: Estimate, companyInfo?: CompanyInfo): Promise<void> {
  const wb = buildWorkbook('estimate', estimate, companyInfo)
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const dateStr = estimate.issue_date.replace(/-/g, '')
  saveAs(blob, `御見積書_${estimate.customer_name}_${dateStr}.xlsx`)
}
