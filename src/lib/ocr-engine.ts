// OCR Engine - Client-side receipt scanning simulation
// This module simulates OCR processing with realistic templates for Japanese receipts

export type OCRResult = {
  success: boolean
  confidence: number // 0-100
  data: {
    vendor: string
    date: string
    total: number
    tax: number
    subtotal: number
    items: Array<{ description: string; amount: number }>
    paymentMethod: 'cash' | 'credit_card' | 'bank_transfer'
    category: string
  }
  rawText: string
  suggestedJournalEntry: {
    description: string
    entryType: 'normal'
    lines: Array<{
      accountName: string
      accountCode: string
      debitAmount: number
      creditAmount: number
    }>
  }
}

type ReceiptTemplate = {
  vendor: string
  category: string
  accountCode: string
  accountName: string
  creditCode: string
  creditName: string
  items: Array<{ description: string; baseAmount: number }>
  paymentMethod: 'cash' | 'credit_card' | 'bank_transfer'
}

const RECEIPT_TEMPLATES: ReceiptTemplate[] = [
  {
    vendor: 'エネオス 渋谷SS',
    category: '車両費',
    accountCode: '7000',
    accountName: '雑費',
    creditCode: '1000',
    creditName: '現金',
    items: [
      { description: 'レギュラーガソリン 45L', baseAmount: 7920 },
      { description: '洗車サービス', baseAmount: 550 },
    ],
    paymentMethod: 'cash',
  },
  {
    vendor: 'オートバックス 東京本店',
    category: '消耗品費',
    accountCode: '6500',
    accountName: '消耗品費',
    creditCode: '1000',
    creditName: '現金',
    items: [
      { description: 'エンジンオイル 4L', baseAmount: 3800 },
      { description: 'オイルフィルター', baseAmount: 1200 },
      { description: 'ワイパーブレード', baseAmount: 1800 },
    ],
    paymentMethod: 'cash',
  },
  {
    vendor: '東京電力エナジーパートナー',
    category: '水道光熱費',
    accountCode: '6300',
    accountName: '水道光熱費',
    creditCode: '2100',
    creditName: '未払金',
    items: [
      { description: '電気料金（3月分）', baseAmount: 28500 },
      { description: '再エネ賦課金', baseAmount: 1500 },
    ],
    paymentMethod: 'bank_transfer',
  },
  {
    vendor: '東京ガス株式会社',
    category: '水道光熱費',
    accountCode: '6300',
    accountName: '水道光熱費',
    creditCode: '2100',
    creditName: '未払金',
    items: [
      { description: 'ガス料金（3月分）', baseAmount: 12800 },
    ],
    paymentMethod: 'bank_transfer',
  },
  {
    vendor: 'コーナン 新宿店',
    category: '消耗品費',
    accountCode: '6500',
    accountName: '消耗品費',
    creditCode: '1000',
    creditName: '現金',
    items: [
      { description: '清掃用品セット', baseAmount: 1980 },
      { description: 'ゴミ袋 45L×20枚', baseAmount: 680 },
      { description: '洗剤（業務用）', baseAmount: 1280 },
    ],
    paymentMethod: 'cash',
  },
  {
    vendor: 'ヤマト運輸株式会社',
    category: '荷造運賃',
    accountCode: '7000',
    accountName: '雑費',
    creditCode: '1000',
    creditName: '現金',
    items: [
      { description: '宅急便 60サイズ×3個', baseAmount: 1650 },
      { description: '着払い手数料', baseAmount: 0 },
    ],
    paymentMethod: 'cash',
  },
  {
    vendor: '居酒屋 和らく',
    category: '会議費',
    accountCode: '7000',
    accountName: '雑費',
    creditCode: '1000',
    creditName: '現金',
    items: [
      { description: 'お通し×4名', baseAmount: 1600 },
      { description: '飲み放題コース×4名', baseAmount: 10800 },
      { description: '追加注文', baseAmount: 3200 },
    ],
    paymentMethod: 'cash',
  },
  {
    vendor: 'Amazon Business',
    category: '事務用品費',
    accountCode: '6500',
    accountName: '消耗品費',
    creditCode: '2100',
    creditName: '未払金',
    items: [
      { description: 'コピー用紙 A4 500枚×5冊', baseAmount: 2980 },
      { description: 'ボールペン 10本入り', baseAmount: 880 },
      { description: 'クリアファイル 30枚', baseAmount: 650 },
    ],
    paymentMethod: 'credit_card',
  },
  {
    vendor: '株式会社NTTドコモ',
    category: '通信費',
    accountCode: '6400',
    accountName: '通信費',
    creditCode: '2100',
    creditName: '未払金',
    items: [
      { description: '法人向け携帯料金（3回線）', baseAmount: 18000 },
      { description: 'データプラン追加', baseAmount: 1100 },
    ],
    paymentMethod: 'bank_transfer',
  },
  {
    vendor: '部品商事 有限会社',
    category: '部品仕入',
    accountCode: '5100',
    accountName: '部品仕入',
    creditCode: '2000',
    creditName: '買掛金',
    items: [
      { description: 'ブレーキパッド（前輪用）', baseAmount: 8500 },
      { description: 'エアフィルター', baseAmount: 2800 },
      { description: 'スパークプラグ×4', baseAmount: 3600 },
    ],
    paymentMethod: 'bank_transfer',
  },
]

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function getRandomVariation(base: number, variationPct = 0.3): number {
  const factor = 1 + (Math.random() - 0.5) * 2 * variationPct
  return Math.round(base * factor)
}

function getRecentDate(): string {
  const now = new Date()
  const daysBack = Math.floor(Math.random() * 30)
  now.setDate(now.getDate() - daysBack)
  return now.toISOString().slice(0, 10)
}

function buildRawText(template: ReceiptTemplate, date: string, subtotal: number, tax: number, total: number): string {
  const lines: string[] = [
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    `　　　　${template.vendor}`,
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    `日付：${date}`,
    '',
    '【ご購入明細】',
    ...template.items.map((item) => `${item.description}`),
    '',
    '─────────────────────────',
    `小計　　　　¥${subtotal.toLocaleString('ja-JP')}`,
    `消費税（10%）　¥${tax.toLocaleString('ja-JP')}`,
    `合計　　　　¥${total.toLocaleString('ja-JP')}`,
    '─────────────────────────',
    `お支払い：${
      template.paymentMethod === 'cash'
        ? '現金'
        : template.paymentMethod === 'credit_card'
        ? 'クレジットカード'
        : '銀行振込'
    }`,
    '',
    'ありがとうございました',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  ]
  return lines.join('\n')
}

export async function processReceiptImage(
  file: File,
  onProgress?: (progress: number) => void
): Promise<OCRResult> {
  // Simulate OCR processing with realistic delays
  const steps = [10, 25, 45, 65, 80, 92, 100]
  for (const step of steps) {
    await new Promise<void>((resolve) => setTimeout(resolve, 280 + Math.random() * 220))
    onProgress?.(step)
  }

  const template = pickRandom(RECEIPT_TEMPLATES)
  const date = getRecentDate()

  // Calculate amounts with random variation
  const items = template.items.map((item) => ({
    description: item.description,
    amount: item.baseAmount > 0 ? getRandomVariation(item.baseAmount) : 0,
  }))

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0)
  const tax = Math.round(subtotal * 0.1)
  const total = subtotal + tax
  const confidence = 88 + Math.floor(Math.random() * 11) // 88-98

  const rawText = buildRawText(template, date, subtotal, tax, total)

  const description = `${template.vendor} ${template.category}`

  return {
    success: true,
    confidence,
    data: {
      vendor: template.vendor,
      date,
      total,
      tax,
      subtotal,
      items,
      paymentMethod: template.paymentMethod,
      category: template.category,
    },
    rawText,
    suggestedJournalEntry: {
      description,
      entryType: 'normal',
      lines: [
        {
          accountName: template.accountName,
          accountCode: template.accountCode,
          debitAmount: subtotal,
          creditAmount: 0,
        },
        {
          accountName: '仮払消費税',
          accountCode: '1300',
          debitAmount: tax,
          creditAmount: 0,
        },
        {
          accountName: template.creditName,
          accountCode: template.creditCode,
          debitAmount: 0,
          creditAmount: total,
        },
      ],
    },
  }
}
