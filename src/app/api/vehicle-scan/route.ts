import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

const MAX_FILE_SIZE = 10 * 1024 * 1024

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY is not configured' }, { status: 500 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum 10MB.' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const fileType = file.type || ''
    const isHeic = fileType === 'image/heic' || fileType === 'image/heif' || ext === 'heic' || ext === 'heif'
    const needsConversion = isHeic || !['image/jpeg', 'image/png', 'image/webp'].includes(fileType)

    const arrayBuffer = await file.arrayBuffer()
    let jpegBase64 = Buffer.from(arrayBuffer).toString('base64')
    let jpegMime = fileType || 'image/jpeg'

    // HEIC等はConvertAPIでJPEGに変換してからVision APIへ送る
    if (needsConversion) {
      const convertSecret = process.env.CONVERTAPI_SECRET
      if (!convertSecret) {
        return NextResponse.json({ error: 'CONVERTAPI_SECRET is not configured' }, { status: 500 })
      }

      const sourceExt = isHeic ? 'heic' : (ext || 'jpg')
      console.log(`[vehicle-scan] converting ${sourceExt} -> jpg via ConvertAPI`)

      const convertRes = await fetch(
        `https://v2.convertapi.com/convert/${sourceExt}/to/jpg?Secret=${convertSecret}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            Parameters: [
              { Name: 'File', FileValue: { Name: file.name, Data: jpegBase64 } },
            ],
          }),
        }
      )

      if (convertRes.ok) {
        const convertData = await convertRes.json()
        if (convertData.Files?.[0]?.FileData) {
          jpegBase64 = convertData.Files[0].FileData
          jpegMime = 'image/jpeg'
          console.log('[vehicle-scan] conversion successful')
        }
      } else {
        console.warn('[vehicle-scan] conversion failed, trying with original')
        jpegMime = 'image/jpeg' // try anyway
      }
    }

    console.log(`[vehicle-scan] sending to GPT-4o Vision, mime: ${jpegMime}`)

    const visionRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
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
                text: `この自動車検査証（車検証）の画像から以下の情報を読み取り、JSON形式のみで返してください。
読み取れない項目はnullにしてください。

返すJSONフィールド:
- vehicle_number: 登録番号（例: "岩手 300 あ 1234"）
- vehicle_model: 車名（例: "アルファード"）
- vehicle_year: 初度登録年月（例: "令和3年4月"、"平成30年12月"）
- vehicle_inspection_date: 有効期間の満了する日（YYYY-MM-DD形式、例: "2025-10-31"）
- vehicle_weight: 車両重量の数値のみkg単位なし（例: "1500"）

JSONのみ返してください。`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${jpegMime};base64,${jpegBase64}`,
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

    if (!visionRes.ok) {
      const errText = await visionRes.text()
      console.error('[vehicle-scan] Vision API error:', errText)
      return NextResponse.json({ error: 'Vision API failed', details: errText }, { status: 502 })
    }

    const visionData = await visionRes.json()
    const content = visionData.choices?.[0]?.message?.content
    if (!content) {
      return NextResponse.json({ error: 'No response from Vision API' }, { status: 422 })
    }

    const parsed = JSON.parse(content) as Record<string, string | null>
    const result = {
      vehicle_number: parsed.vehicle_number ?? null,
      vehicle_model: parsed.vehicle_model ?? null,
      vehicle_year: parsed.vehicle_year ?? null,
      vehicle_inspection_date: parsed.vehicle_inspection_date ?? null,
      vehicle_weight: parsed.vehicle_weight ?? null,
    }

    const filled = Object.values(result).filter(Boolean).length
    console.log(`[vehicle-scan] extracted ${filled}/5 fields:`, JSON.stringify(result))
    return NextResponse.json(result)

  } catch (err) {
    console.error('[vehicle-scan] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
