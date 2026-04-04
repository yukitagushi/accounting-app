import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MAX_FILE_SIZE = 10 * 1024 * 1024
// OpenAI Vision API supports JPEG, PNG, WebP, GIF only — NOT HEIC/HEIF
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY is not configured' }, { status: 500 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      // HEIC/HEIF (iPhone default format) is not supported by OpenAI Vision API
      if (file.type === 'image/heic' || file.type === 'image/heif') {
        return NextResponse.json({ error: 'HEIC_NOT_SUPPORTED', details: 'iPhoneのHEIC形式はVision APIに対応していません。ConvertAPIで処理します。' }, { status: 415 })
      }
      return NextResponse.json({ error: 'Invalid file type. Only JPEG, PNG, WebP are allowed.' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum 10MB.' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const mimeType = file.type

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `この車検証（自動車検査証）の画像から以下の情報を読み取り、JSON形式で返してください。
情報が読み取れない場合はそのフィールドをnullにしてください。
返すJSONのフィールド:
- vehicle_number: 登録番号（例: "岩手 300 あ 1234"）
- vehicle_model: 車名（例: "アルファード", "プリウス"）
- vehicle_year: 初度登録年（元号または西暦、例: "令和3年" または "2021"）
- vehicle_inspection_date: 有効期間の満了する日（YYYY-MM-DD形式で返してください、例: "2025-10-31"）
JSONのみ返してください。説明文は不要です。`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64}`,
                  detail: 'high',
                },
              },
            ],
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('OpenAI Vision API error:', errText)
      return NextResponse.json({ error: 'Vision API processing failed', details: errText }, { status: 502 })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) {
      return NextResponse.json({ error: 'No response from Vision API' }, { status: 422 })
    }

    let parsed: Record<string, string | null>
    try {
      parsed = JSON.parse(content)
    } catch {
      return NextResponse.json({ error: 'Failed to parse Vision API response', raw: content }, { status: 422 })
    }

    return NextResponse.json({
      vehicle_number: parsed.vehicle_number ?? null,
      vehicle_model: parsed.vehicle_model ?? null,
      vehicle_year: parsed.vehicle_year ?? null,
      vehicle_inspection_date: parsed.vehicle_inspection_date ?? null,
    })
  } catch (err) {
    console.error('OCR Vision route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
