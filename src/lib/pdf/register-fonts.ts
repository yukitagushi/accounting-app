import { Font } from '@react-pdf/renderer'

let registered = false

export function registerJapaneseFonts() {
  if (registered) return
  registered = true

  // Noto Sans JP from Google Fonts CDN
  const base = 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-jp@5.0.1/files'

  Font.register({
    family: 'NotoSansJP',
    fonts: [
      { src: `${base}/noto-sans-jp-japanese-400-normal.woff`, fontWeight: 400 },
      { src: `${base}/noto-sans-jp-japanese-700-normal.woff`, fontWeight: 700 },
    ],
  })
}
