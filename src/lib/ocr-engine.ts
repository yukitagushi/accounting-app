// OCR Engine - Real receipt scanning via ConvertAPI + text parsing

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

// ── Text parsing helpers ─────��───────────────────────────────────────────────

function extractDate(text: string): string {
  // Try various Japanese date formats
  // 2024年3月15日, 2024/03/15, 2024-03-15, R6.3.15, 令和6年3月15日
  const patterns = [
    /(\d{4})\s*[年\/\-\.]\s*(\d{1,2})\s*[月\/\-\.]\s*(\d{1,2})\s*日?/,
    /令和\s*(\d{1,2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/,
    /R\s*(\d{1,2})\s*[\.\/]\s*(\d{1,2})\s*[\.\/]\s*(\d{1,2})/,
  ]

  for (const pat of patterns) {
    const m = text.match(pat)
    if (m) {
      if (pat.source.includes('令和') || pat.source.startsWith('R')) {
        const year = 2018 + parseInt(m[1])
        return `${year}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
      }
      return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
    }
  }
  return new Date().toISOString().slice(0, 10)
}

function extractAmounts(text: string): { total: number; tax: number; subtotal: number } {
  const lines = text.split('\n')
  let total = 0
  let tax = 0
  let subtotal = 0

  for (const line of lines) {
    const cleaned = line.replace(/\s+/g, '').replace(/,/g, '')

    // Total patterns: 合計, 総合計, お会計, ご請求額, Total
    if (/(?:総合計|お会計|ご請求|合計金額|お支払|税込合計|請求額)/.test(cleaned)) {
      const m = cleaned.match(/[¥￥]?\s*(\d+)/)
      if (m) total = parseInt(m[1])
    } else if (/合計/.test(cleaned) && !/小計/.test(cleaned) && !/税/.test(cleaned)) {
      const m = cleaned.match(/[¥￥]?\s*(\d+)/)
      if (m) {
        const val = parseInt(m[1])
        if (val > total) total = val
      }
    }

    // Tax patterns: 消費税, 税額, 内税, 外税
    if (/(?:消費税|税額|内税|外税|税\s*\()/.test(cleaned)) {
      const m = cleaned.match(/[¥���]?\s*(\d+)/)
      if (m) tax = parseInt(m[1])
    }

    // Subtotal patterns: 小計, 税抜
    if (/(?:小計|税抜|税別)/.test(cleaned)) {
      const m = cleaned.match(/[¥￥]?\s*(\d+)/)
      if (m) subtotal = parseInt(m[1])
    }
  }

  // Fallback: if we only found total, estimate tax
  if (total > 0 && tax === 0 && subtotal === 0) {
    tax = Math.floor(total * 10 / 110) // assume 10% inclusive
    subtotal = total - tax
  }
  if (total === 0 && subtotal > 0) {
    if (tax === 0) tax = Math.floor(subtotal * 0.1)
    total = subtotal + tax
  }
  if (subtotal === 0 && total > 0 && tax > 0) {
    subtotal = total - tax
  }

  // Last resort: find the largest number in the text
  if (total === 0) {
    const allNums = text.match(/[¥￥]\s*[\d,]+/g)
    if (allNums) {
      const nums = allNums.map((n) => parseInt(n.replace(/[¥￥,\s]/g, ''))).filter((n) => n > 0)
      if (nums.length > 0) {
        total = Math.max(...nums)
        tax = Math.floor(total * 10 / 110)
        subtotal = total - tax
      }
    }
  }

  return { total, tax, subtotal }
}

function extractVendor(text: string): string {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)

  // Usually the vendor name is in the first few lines
  for (const line of lines.slice(0, 5)) {
    const cleaned = line.replace(/[━─═＝\-=*#]+/g, '').trim()
    if (!cleaned) continue
    // Skip lines that are just numbers, dates, or common receipt headers
    if (/^[\d\s\-\/\.]+$/.test(cleaned)) continue
    if (/^(レシート|領収書|領収証|納品書|請求書|TEL|tel|FAX|fax|\d{2,4}[\/\-])/.test(cleaned)) continue
    if (cleaned.length >= 2 && cleaned.length <= 30) {
      return cleaned
    }
  }
  return '不明な店���'
}

function extractItems(text: string): Array<{ description: string; amount: number }> {
  const items: Array<{ description: string; amount: number }> = []
  const lines = text.split('\n')

  for (const line of lines) {
    const cleaned = line.trim()
    if (!cleaned) continue

    // Match lines with description and amount: "商品名 ¥1,234" or "商品名 1,234円" or "商品名  1234"
    const m = cleaned.match(/^(.+?)\s+[¥￥]?\s*([\d,]+)\s*円?\s*$/)
    if (m) {
      const desc = m[1].trim()
      const amount = parseInt(m[2].replace(/,/g, ''))

      // Skip totals, tax lines, etc.
      if (/(?:合計|小計|消費税|税額|お釣り|お預かり|値引|割引|ポイント)/.test(desc)) continue
      if (desc.length < 1 || amount <= 0) continue

      items.push({ description: desc, amount })
    }
  }
  return items
}

function detectPaymentMethod(text: string): 'cash' | 'credit_card' | 'bank_transfer' {
  const lower = text.toLowerCase()
  if (/(?:クレジット|credit|visa|master|jcb|amex|カード払|ｸﾚｼﾞｯﾄ)/.test(lower)) return 'credit_card'
  if (/(?:振込|振替|口座|bank)/.test(lower)) return 'bank_transfer'
  return 'cash'
}

// ── Category & account mapping ─────���─────────────────────────────────────────

type CategoryMapping = {
  category: string
  accountCode: string
  accountName: string
  creditCode: string
  creditName: string
  keywords: string[]
}

const CATEGORY_MAPPINGS: CategoryMapping[] = [
  {
    category: '燃料費', accountCode: '6500', accountName: '消耗品費',
    creditCode: '1000', creditName: '現金',
    keywords: ['ガソリン', 'ガソリンスタンド', '給油', '軽油', 'エネオス', 'ENEOS', 'シェル', 'コスモ', 'SS', '燃料'],
  },
  {
    category: '部品仕入', accountCode: '5100', accountName: '部品仕入',
    creditCode: '2000', creditName: '買���金',
    keywords: ['部品', 'パーツ', 'ブレーキ', 'オイル', 'フィルター', 'プラグ', 'タイヤ', 'バッテリー', 'オートバックス', 'イエローハット'],
  },
  {
    category: '水道光熱費', accountCode: '6300', accountName: '水道光熱費',
    creditCode: '2100', creditName: '未払金',
    keywords: ['電気', '電力', 'ガス', '水道', '光熱', '東京電力', '東北電力', '東京ガス'],
  },
  {
    category: '通信費', accountCode: '6400', accountName: '通信費',
    creditCode: '2100', creditName: '未払金',
    keywords: ['電話', '通信', 'ドコモ', 'ソフトバンク', 'au', 'KDDI', 'NTT', 'インターネット', 'Wi-Fi'],
  },
  {
    category: '消耗品費', accountCode: '6500', accountName: '消耗品費',
    creditCode: '1000', creditName: '���金',
    keywords: ['文具', '事務用品', 'コピー', 'プリンター', 'トナー', 'Amazon', '消耗品', '清掃', '洗剤'],
  },
  {
    category: '会議費', accountCode: '7000', accountName: '雑費',
    creditCode: '1000', creditName: '現金',
    keywords: ['飲食', 'レストラン', '居酒屋', 'カフェ', '喫茶', '弁当', '会議', '打ち合わせ', '接待'],
  },
  {
    category: '荷造運賃', accountCode: '7000', accountName: '雑費',
    creditCode: '1000', creditName: '現金',
    keywords: ['宅急便', '宅配', '運送', '配送', 'ヤマト', '佐川', 'ゆうパック', '郵便'],
  },
  {
    category: '地代家賃', accountCode: '6200', accountName: '地代家賃',
    creditCode: '1010', creditName: '普通預金',
    keywords: ['家賃', '賃料', '駐車場', '倉庫'],
  },
  {
    category: '保険料', accountCode: '6700', accountName: '保険料',
    creditCode: '1010', creditName: '普通預金',
    keywords: ['保険', '自賠責', '任意保険', '損害保険'],
  },
]

function categorize(text: string, vendor: string): CategoryMapping {
  const searchText = (text + ' ' + vendor).toLowerCase()

  for (const mapping of CATEGORY_MAPPINGS) {
    for (const kw of mapping.keywords) {
      if (searchText.includes(kw.toLowerCase())) {
        return mapping
      }
    }
  }

  // Default: 消耗品費
  return {
    category: 'その他',
    accountCode: '7000',
    accountName: '雑費',
    creditCode: '1000',
    creditName: '現金',
    keywords: [],
  }
}

// ── Main OCR function ────────────────────────────────────��───────────────────

export async function processReceiptImage(
  file: File,
  onProgress?: (progress: number) => void
): Promise<OCRResult> {
  onProgress?.(10)

  // Upload to our API route for OCR processing
  const formData = new FormData()
  formData.append('file', file)

  onProgress?.(25)

  const res = await fetch('/api/ocr', {
    method: 'POST',
    body: formData,
  })

  onProgress?.(60)

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(err.error || 'OCR processing failed')
  }

  const { text: rawText } = await res.json()

  onProgress?.(75)

  // Parse the OCR text
  const vendor = extractVendor(rawText)
  const date = extractDate(rawText)
  const { total, tax, subtotal } = extractAmounts(rawText)
  const items = extractItems(rawText)
  const paymentMethod = detectPaymentMethod(rawText)
  const mapping = categorize(rawText, vendor)

  onProgress?.(90)

  // Adjust credit account based on payment method
  let creditCode = mapping.creditCode
  let creditName = mapping.creditName
  if (paymentMethod === 'credit_card') {
    creditCode = '2100'
    creditName = '未払金'
  } else if (paymentMethod === 'bank_transfer') {
    creditCode = '1010'
    creditName = '普通預金'
  }

  // Build suggested journal entry
  const description = `${vendor} ${mapping.category}`
  const journalLines = [
    {
      accountName: mapping.accountName,
      accountCode: mapping.accountCode,
      debitAmount: subtotal,
      creditAmount: 0,
    },
  ]

  if (tax > 0) {
    journalLines.push({
      accountName: '仮払消費税',
      accountCode: '1300',
      debitAmount: tax,
      creditAmount: 0,
    })
  }

  journalLines.push({
    accountName: creditName,
    accountCode: creditCode,
    debitAmount: 0,
    creditAmount: total,
  })

  // Estimate confidence based on how much data we could extract
  let confidence = 50
  if (vendor !== '不明な店舗') confidence += 15
  if (total > 0) confidence += 15
  if (tax > 0) confidence += 5
  if (items.length > 0) confidence += 10
  if (date !== new Date().toISOString().slice(0, 10)) confidence += 5
  confidence = Math.min(confidence, 98)

  onProgress?.(100)

  return {
    success: total > 0,
    confidence,
    data: {
      vendor,
      date,
      total,
      tax,
      subtotal,
      items: items.length > 0 ? items : [{ description: mapping.category, amount: subtotal }],
      paymentMethod,
      category: mapping.category,
    },
    rawText,
    suggestedJournalEntry: {
      description,
      entryType: 'normal',
      lines: journalLines,
    },
  }
}
