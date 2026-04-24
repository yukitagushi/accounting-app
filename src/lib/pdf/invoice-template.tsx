import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import type { Invoice } from '@/lib/types'
import { registerJapaneseFonts } from './register-fonts'
import { SEAL_IMAGE } from './seal-data'

registerJapaneseFonts()

const s = StyleSheet.create({
  page: { fontFamily: 'NotoSansJP', fontSize: 8, paddingTop: 20, paddingBottom: 20, paddingHorizontal: 25, backgroundColor: '#fff', color: '#1a1a1a' },
  title: { textAlign: 'center', fontSize: 18, fontWeight: 700, letterSpacing: 6, marginBottom: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  customerBlock: { flex: 1, maxWidth: '55%' },
  customerName: { fontSize: 12, fontWeight: 700, borderBottomWidth: 2, borderBottomColor: '#1a1a1a', paddingBottom: 2, marginBottom: 3 },
  customerDetail: { fontSize: 7, color: '#555', marginBottom: 1 },
  companyBlock: { alignItems: 'flex-end', maxWidth: '42%' },
  companyName: { fontSize: 10, fontWeight: 700, marginBottom: 2 },
  companyDetail: { fontSize: 7, color: '#333', marginBottom: 1 },
  sealWrap: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'flex-end', gap: 6 },
  sealImage: { width: 44, height: 44, marginTop: 2, opacity: 0.85 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, fontSize: 7 },
  // Vehicle info
  vehicleTable: { marginBottom: 6 },
  vehicleRow: { flexDirection: 'row' },
  vehicleHeaderCell: { backgroundColor: '#e8e8e8', borderWidth: 0.5, borderColor: '#333', padding: 2, fontSize: 6.5, fontWeight: 700, textAlign: 'center' },
  vehicleValueCell: { borderWidth: 0.5, borderColor: '#333', padding: 2, fontSize: 6.5, textAlign: 'center' },
  // Items table
  tableHeader: { flexDirection: 'row', backgroundColor: '#e8e8e8' },
  tableHeaderCell: { borderWidth: 0.5, borderColor: '#333', padding: 2, fontSize: 6.5, fontWeight: 700 },
  tableRow: { flexDirection: 'row' },
  tableCell: { borderWidth: 0.5, borderColor: '#333', padding: 2, fontSize: 7 },
  colDesc: { width: '36%' },
  colCat: { width: '8%', textAlign: 'center' },
  colQty: { width: '8%', textAlign: 'right' },
  colPrice: { width: '12%', textAlign: 'right' },
  colParts: { width: '18%', textAlign: 'right' },
  colLabor: { width: '18%', textAlign: 'right' },
  // Notes
  notesBox: { borderWidth: 0.5, borderColor: '#333', padding: 3, marginBottom: 6, fontSize: 6.5 },
  // Bottom
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  bottomLeft: { maxWidth: '45%', fontSize: 6.5 },
  bottomRight: { width: '48%' },
  totalsRow: { flexDirection: 'row' },
  totalsLabel: { borderWidth: 0.5, borderColor: '#333', backgroundColor: '#e8e8e8', padding: 2, fontSize: 7, fontWeight: 700, textAlign: 'center', width: '40%' },
  totalsValue: { borderWidth: 0.5, borderColor: '#333', padding: 2, fontSize: 7, textAlign: 'right', width: '60%' },
  grandTotalLabel: { borderWidth: 1.5, borderColor: '#333', backgroundColor: '#fef3c7', padding: 3, fontSize: 9, fontWeight: 700, textAlign: 'center', width: '40%' },
  grandTotalValue: { borderWidth: 1.5, borderColor: '#333', backgroundColor: '#fef3c7', padding: 3, fontSize: 11, fontWeight: 700, textAlign: 'right', color: '#c0392b', width: '60%' },
})

function fmt(val: number): string {
  return '\u00a5' + val.toLocaleString('en-US')
}
function fmtNum(val: number): string {
  return val.toLocaleString('en-US')
}

interface InvoicePDFProps {
  invoice: Invoice
  companyName?: string
  companyAddress?: string
  companyPhone?: string
  companyFax?: string
  companyRepresentative?: string
  companyRegistrationNumber?: string
  bankInfo?: string
}

export function InvoicePDF({
  invoice,
  companyName = '有限会社 竹花自工',
  companyAddress = '〒028-5642 岩手県下閉伊郡岩泉町穴沢大宮内43-5',
  companyPhone = '0194-25-4793',
  companyFax = '0194-32-3015',
  companyRepresentative = '竹花 将昭',
  companyRegistrationNumber = 'T8400002011138',
  bankInfo = '岩手銀行・岩泉支店（普）0192367',
}: InvoicePDFProps) {
  const lines = invoice.line_items ?? []
  const partsSubtotal = lines.reduce((sum, l) => sum + (l.parts_amount ?? 0), 0)
  const laborSubtotal = lines.reduce((sum, l) => sum + (l.labor_amount ?? 0), 0)
  const disc = invoice.discount ?? 0
  const rawSubtotal = partsSubtotal + laborSubtotal || invoice.subtotal
  const discountedSubtotal = rawSubtotal - disc
  const taxMode = invoice.tax_mode ?? 'exclusive'

  // Calculate tax respecting per-line tax rates and tax mode
  const taxAmount = (() => {
    if (rawSubtotal === 0) return 0
    const discountRatio = rawSubtotal > 0 ? discountedSubtotal / rawSubtotal : 1
    if (taxMode === 'inclusive') {
      return lines.reduce((sum, l) => {
        const amount = l.quantity * l.unit_price
        const discountedAmount = amount * discountRatio
        return sum + Math.floor(discountedAmount * l.tax_rate / (1 + l.tax_rate))
      }, 0)
    }
    return lines.reduce((sum, l) => {
      const amount = l.quantity * l.unit_price
      const discountedAmount = amount * discountRatio
      return sum + Math.floor(discountedAmount * l.tax_rate)
    }, 0)
  })()

  const subTotal = taxMode === 'inclusive' ? discountedSubtotal : discountedSubtotal + taxAmount
  const grandTotal = subTotal

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Title */}
        <Text style={s.title}>{'\u5fa1 \u8acb \u6c42 \u66f8'}</Text>

        {/* Header */}
        <View style={s.headerRow}>
          <View style={s.customerBlock}>
            <Text style={s.customerName}>{invoice.customer_name} {'\u5fa1\u4e2d'}</Text>
            {invoice.customer_address ? <Text style={s.customerDetail}>{invoice.customer_address}</Text> : null}
            {invoice.customer_code ? <Text style={s.customerDetail}>{'\u9867\u5ba2\u30b3\u30fc\u30c9: ' + invoice.customer_code}</Text> : null}
          </View>
          <View style={s.sealWrap}>
            <View style={s.companyBlock}>
              <Text style={s.companyName}>{companyName}</Text>
              <Text style={s.companyDetail}>{'\u4ee3\u8868\u53d6\u7de0\u5f79 ' + companyRepresentative}</Text>
              <Text style={s.companyDetail}>{companyAddress}</Text>
              <Text style={s.companyDetail}>{'TEL ' + companyPhone + '  FAX ' + companyFax}</Text>
              <Text style={s.companyDetail}>{'\u767b\u9332\u756a\u53f7 ' + companyRegistrationNumber}</Text>
            </View>
            <Image style={s.sealImage} src={SEAL_IMAGE} />
          </View>
        </View>

        {/* Number & date */}
        <View style={s.metaRow}>
          <Text>{'No. ' + invoice.invoice_number}</Text>
          <Text>{'\u767a\u884c\u65e5: ' + invoice.issue_date}</Text>
        </View>

        {/* Vehicle info */}
        <View style={s.vehicleTable}>
          <View style={s.vehicleRow}>
            <Text style={[s.vehicleHeaderCell, { width: '10%' }]}>{'\u5165\u5eab\u65e5'}</Text>
            <Text style={[s.vehicleValueCell, { width: '12%' }]}>{invoice.delivery_date ?? ''}</Text>
            <Text style={[s.vehicleHeaderCell, { width: '10%' }]}>{'\u6b21\u56de\u8eca\u691c\u65e5'}</Text>
            <Text style={[s.vehicleValueCell, { width: '12%' }]}>{invoice.next_inspection_date ?? ''}</Text>
            <Text style={[s.vehicleHeaderCell, { width: '6%' }]}>{'\u8eca\u540d'}</Text>
            <Text style={[s.vehicleValueCell, { width: '14%' }]}>{invoice.vehicle_name ?? ''}</Text>
            <Text style={[s.vehicleHeaderCell, { width: '6%' }]}>{'\u521d\u5e74\u5ea6'}</Text>
            <Text style={[s.vehicleValueCell, { width: '8%' }]}>{invoice.first_registration ?? ''}</Text>
            <Text style={[s.vehicleHeaderCell, { width: '10%' }]}>{'\u8d70\u884c\u8ddd\u96e2'}</Text>
            <Text style={[s.vehicleValueCell, { width: '12%' }]}>{invoice.mileage ? fmtNum(invoice.mileage) + ' km' : ''}</Text>
          </View>
          <View style={s.vehicleRow}>
            <Text style={[s.vehicleHeaderCell, { width: '10%' }]}>{'\u8eca\u4e21\u756a\u53f7'}</Text>
            <Text style={[s.vehicleValueCell, { width: '34%' }]}>{invoice.vehicle_number ?? ''}</Text>
            <Text style={[s.vehicleHeaderCell, { width: '6%' }]}>{'\u7d0d\u54c1\u533a\u5206'}</Text>
            <Text style={[s.vehicleValueCell, { width: '14%' }]}>{invoice.delivery_category ?? ''}</Text>
            <Text style={[s.vehicleHeaderCell, { width: '6%' }]}>{'\u62c5\u5f53'}</Text>
            <Text style={[s.vehicleValueCell, { width: '30%' }]}>{invoice.staff_name ?? ''}</Text>
          </View>
        </View>

        {/* Items table */}
        <View style={{ marginBottom: 2 }}>
          <View style={s.tableHeader}>
            <Text style={[s.tableHeaderCell, s.colDesc]}>{'\u4f5c\u696d\u5185\u5bb9\u30fb\u4f7f\u7528\u90e8\u54c1\u540d'}</Text>
            <Text style={[s.tableHeaderCell, s.colCat]}>{'\u533a\u5206'}</Text>
            <Text style={[s.tableHeaderCell, s.colQty]}>{'\u6570\u91cf'}</Text>
            <Text style={[s.tableHeaderCell, s.colPrice]}>{'\u5358\u4fa1'}</Text>
            <Text style={[s.tableHeaderCell, s.colParts]}>{'\u90e8\u54c1\u91d1\u984d'}</Text>
            <Text style={[s.tableHeaderCell, s.colLabor]}>{'\u6280\u8853\u6599'}</Text>
          </View>
          {lines.map((item, idx) => (
            <View key={item.id} style={s.tableRow}>
              <Text style={[s.tableCell, s.colDesc]}>{item.description}</Text>
              <Text style={[s.tableCell, s.colCat]}>{item.category ?? ''}</Text>
              <Text style={[s.tableCell, s.colQty]}>{fmtNum(item.quantity)}</Text>
              <Text style={[s.tableCell, s.colPrice]}>{fmt(item.unit_price)}</Text>
              <Text style={[s.tableCell, s.colParts]}>{item.parts_amount ? fmt(item.parts_amount) : ''}</Text>
              <Text style={[s.tableCell, s.colLabor]}>{item.labor_amount ? fmt(item.labor_amount) : ''}</Text>
            </View>
          ))}
        </View>

        {/* Notes */}
        {invoice.notes ? (
          <View style={s.notesBox}>
            <Text>{'\u5099\u8003: ' + invoice.notes}</Text>
          </View>
        ) : null}

        {/* Bottom */}
        <View style={s.bottomRow}>
          <View style={s.bottomLeft}>
            <Text style={{ marginBottom: 3 }}>{'\u652f\u6255\u671f\u9650: ' + invoice.due_date}</Text>
            <Text style={{ marginTop: 8, fontSize: 6, color: '#555' }}>{'\u304a\u6c17\u8efd\u306b\u304a\u554f\u3044\u5408\u308f\u305b\u304f\u3060\u3055\u3044'}</Text>
            <Text style={{ marginTop: 6, fontWeight: 700, marginBottom: 2 }}>{'\u632f\u8fbc\u53e3\u5ea7'}</Text>
            <Text>{bankInfo}</Text>
          </View>
          <View style={s.bottomRight}>
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>{'\u5408\u8a08'}</Text>
              <Text style={[s.totalsValue, { width: '30%' }]}>{fmt(partsSubtotal)}</Text>
              <Text style={[s.totalsValue, { width: '30%' }]}>{fmt(laborSubtotal)}</Text>
            </View>
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>{'\u8ab2\u7a0e\u8a08'}</Text>
              <Text style={s.totalsValue}>{fmt(discountedSubtotal)}</Text>
            </View>
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>{'\u6d88\u8cbb\u7a0e'}</Text>
              <Text style={s.totalsValue}>{fmt(taxAmount)}</Text>
            </View>
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>{'(\u5c0f\u8a08)'}</Text>
              <Text style={s.totalsValue}>{fmt(subTotal)}</Text>
            </View>
            {disc > 0 ? (
              <View style={s.totalsRow}>
                <Text style={s.totalsLabel}>{'\u5024\u5f15\u304d'}</Text>
                <Text style={[s.totalsValue, { color: '#cc0000' }]}>{'-' + fmt(disc)}</Text>
              </View>
            ) : null}
            <View style={s.totalsRow}>
              <Text style={s.grandTotalLabel}>{'\u7dcf\u5408\u8a08'}</Text>
              <Text style={s.grandTotalValue}>{fmt(grandTotal)}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}
