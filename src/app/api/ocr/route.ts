import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const secret = process.env.CONVERTAPI_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CONVERTAPI_SECRET is not configured' }, { status: 500 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Determine source format from file type
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const sourceFormat = ext === 'png' ? 'jpg' : ext === 'heic' ? 'jpg' : ext === 'webp' ? 'jpg' : 'jpg'

    // Convert image to JPG first if not already JPG, then OCR
    // ConvertAPI supports jpg -> txt for OCR
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    // Step 1: If not JPG, convert to JPG first
    let jpgBase64 = base64
    let jpgFileName = file.name

    if (ext !== 'jpg' && ext !== 'jpeg') {
      const convertRes = await fetch(
        `https://v2.convertapi.com/convert/${ext}/to/jpg?Secret=${secret}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            Parameters: [
              { Name: 'File', FileValue: { Name: file.name, Data: base64 } },
            ],
          }),
        }
      )
      if (convertRes.ok) {
        const convertData = await convertRes.json()
        if (convertData.Files?.[0]?.FileData) {
          jpgBase64 = convertData.Files[0].FileData
          jpgFileName = convertData.Files[0].FileName || 'image.jpg'
        }
      }
      // If conversion fails, try with original as jpg anyway
    }

    // Step 2: JPG -> TXT (OCR)
    const ocrRes = await fetch(
      `https://v2.convertapi.com/convert/jpg/to/txt?Secret=${secret}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Parameters: [
            { Name: 'File', FileValue: { Name: jpgFileName.replace(/\.[^.]+$/, '.jpg'), Data: jpgBase64 } },
            { Name: 'OcrLanguage', Value: 'jpn' },
          ],
        }),
      }
    )

    if (!ocrRes.ok) {
      const errText = await ocrRes.text()
      console.error('ConvertAPI OCR error:', errText)
      return NextResponse.json({ error: 'OCR processing failed', details: errText }, { status: 502 })
    }

    const ocrData = await ocrRes.json()
    const ocrText = ocrData.Files?.[0]?.FileData
      ? Buffer.from(ocrData.Files[0].FileData, 'base64').toString('utf-8')
      : ''

    if (!ocrText.trim()) {
      return NextResponse.json({ error: 'No text could be extracted from the image' }, { status: 422 })
    }

    return NextResponse.json({ text: ocrText, sourceFormat: ext })
  } catch (err) {
    console.error('OCR route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
