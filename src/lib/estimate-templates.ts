export type TemplateType =
  | 'vehicle_inspection_car'
  | 'vehicle_inspection_truck'
  | 'vehicle_inspection_kei'
  | 'oil_change'
  | 'inspection'
  | 'other'

export interface TemplateLineItem {
  description: string
  category: '部品' | '技術' | 'その他'
  quantity: number
  unit_price: number | null // null = 重量税など別途計算
  tax_rate: number
}

export interface EstimateTemplate {
  type: TemplateType
  label: string
  needsWeight: boolean // 重量税計算が必要かどうか
  lines: TemplateLineItem[]
}

/** 車両重量（kg）から重量税を計算 */
export function calcWeightTax(weightKg: number): number {
  if (weightKg <= 500) return 8200
  if (weightKg <= 1000) return 16400
  if (weightKg <= 1500) return 24600
  if (weightKg <= 2000) return 32800
  if (weightKg <= 2500) return 41000
  return 49200
}

export const ESTIMATE_TEMPLATES: EstimateTemplate[] = [
  {
    type: 'vehicle_inspection_car',
    label: '車検（乗用車）',
    needsWeight: true,
    lines: [
      { description: '車検基本料金', category: '技術', quantity: 1, unit_price: 25000, tax_rate: 0.1 },
      { description: '24ヶ月法定点検', category: '技術', quantity: 1, unit_price: 15000, tax_rate: 0.1 },
      { description: '自賠責保険（24ヶ月）', category: 'その他', quantity: 1, unit_price: 17650, tax_rate: 0 },
      { description: '重量税', category: 'その他', quantity: 1, unit_price: null, tax_rate: 0 },
      { description: '印紙代', category: 'その他', quantity: 1, unit_price: 1800, tax_rate: 0 },
      { description: 'テスター代', category: 'その他', quantity: 1, unit_price: 3000, tax_rate: 0.1 },
      { description: '代行手数料', category: 'その他', quantity: 1, unit_price: 10000, tax_rate: 0.1 },
    ],
  },
  {
    type: 'vehicle_inspection_truck',
    label: '車検（トラック）',
    needsWeight: true,
    lines: [
      { description: '車検基本料金', category: '技術', quantity: 1, unit_price: 35000, tax_rate: 0.1 },
      { description: '24ヶ月法定点検', category: '技術', quantity: 1, unit_price: 20000, tax_rate: 0.1 },
      { description: '自賠責保険（24ヶ月）', category: 'その他', quantity: 1, unit_price: 27840, tax_rate: 0 },
      { description: '重量税', category: 'その他', quantity: 1, unit_price: null, tax_rate: 0 },
      { description: '印紙代', category: 'その他', quantity: 1, unit_price: 1800, tax_rate: 0 },
      { description: 'テスター代', category: 'その他', quantity: 1, unit_price: 3000, tax_rate: 0.1 },
      { description: '代行手数料', category: 'その他', quantity: 1, unit_price: 10000, tax_rate: 0.1 },
      { description: 'ドライブシャフトブーツ点検', category: '技術', quantity: 1, unit_price: 3000, tax_rate: 0.1 },
    ],
  },
  {
    type: 'vehicle_inspection_kei',
    label: '車検（軽自動車）',
    needsWeight: false,
    lines: [
      { description: '車検基本料金', category: '技術', quantity: 1, unit_price: 20000, tax_rate: 0.1 },
      { description: '24ヶ月法定点検', category: '技術', quantity: 1, unit_price: 12000, tax_rate: 0.1 },
      { description: '自賠責保険（24ヶ月）', category: 'その他', quantity: 1, unit_price: 17540, tax_rate: 0 },
      { description: '重量税（軽自動車）', category: 'その他', quantity: 1, unit_price: 6600, tax_rate: 0 },
      { description: '印紙代', category: 'その他', quantity: 1, unit_price: 1400, tax_rate: 0 },
      { description: 'テスター代', category: 'その他', quantity: 1, unit_price: 3000, tax_rate: 0.1 },
      { description: '代行手数料', category: 'その他', quantity: 1, unit_price: 8000, tax_rate: 0.1 },
    ],
  },
  {
    type: 'oil_change',
    label: 'オイル交換',
    needsWeight: false,
    lines: [
      { description: 'オイル交換工賃', category: '技術', quantity: 1, unit_price: 1000, tax_rate: 0.1 },
      { description: 'エンジンオイル', category: '部品', quantity: 4, unit_price: 1200, tax_rate: 0.1 },
      { description: 'オイルフィルター', category: '部品', quantity: 1, unit_price: 800, tax_rate: 0.1 },
    ],
  },
  {
    type: 'inspection',
    label: '点検整備',
    needsWeight: false,
    lines: [
      { description: '12ヶ月定期点検', category: '技術', quantity: 1, unit_price: 10000, tax_rate: 0.1 },
      { description: 'エンジンオイル交換工賃', category: '技術', quantity: 1, unit_price: 1000, tax_rate: 0.1 },
      { description: 'エンジンオイル', category: '部品', quantity: 4, unit_price: 1200, tax_rate: 0.1 },
      { description: 'オイルフィルター', category: '部品', quantity: 1, unit_price: 800, tax_rate: 0.1 },
      { description: 'エアクリーナー点検', category: '技術', quantity: 1, unit_price: 500, tax_rate: 0.1 },
    ],
  },
  {
    type: 'other',
    label: 'その他',
    needsWeight: false,
    lines: [],
  },
]
