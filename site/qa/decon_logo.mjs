import { chromium } from 'playwright'
import { writeFileSync, readFileSync } from 'fs'

/* White-background decontamination for the Trapwhip logo.
   Each pixel is treated as ink over white: alpha = 255 - min(r,g,b),
   color un-premultiplied from white. Works for black AND colored ink,
   keeps anti-aliased edges smooth, then tight-crops to content. */

const SRC = process.argv[2]
const OUT = process.argv[3] || 'public/assets/trapwhip-script.png'
if (!SRC) { console.error('usage: node qa/decon_logo.mjs <src.png> [out.png]'); process.exit(1) }

const dataUrl = `data:image/png;base64,${readFileSync(SRC).toString('base64')}`

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage()
const result = await page.evaluate(async (src) => {
  const img = new Image()
  img.src = src
  await img.decode()
  const c = document.createElement('canvas')
  c.width = img.naturalWidth
  c.height = img.naturalHeight
  const ctx = c.getContext('2d')
  ctx.drawImage(img, 0, 0)
  const d = ctx.getImageData(0, 0, c.width, c.height)
  const px = d.data
  let minX = c.width, minY = c.height, maxX = 0, maxY = 0
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i], g = px[i + 1], b = px[i + 2]
    let a = 255 - Math.min(r, g, b)
    if (a < 10) { px[i + 3] = 0; continue }         // pure white / noise → gone
    const back = 255 - a                             // white contribution
    px[i] = Math.max(0, Math.min(255, ((r - back) * 255) / a))
    px[i + 1] = Math.max(0, Math.min(255, ((g - back) * 255) / a))
    px[i + 2] = Math.max(0, Math.min(255, ((b - back) * 255) / a))
    px[i + 3] = a
    const p = i / 4, x = p % c.width, y = (p / c.width) | 0
    if (x < minX) minX = x; if (x > maxX) maxX = x
    if (y < minY) minY = y; if (y > maxY) maxY = y
  }
  // tight crop with a small pad
  const pad = 4
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad)
  maxX = Math.min(c.width - 1, maxX + pad); maxY = Math.min(c.height - 1, maxY + pad)
  const w = maxX - minX + 1, h = maxY - minY + 1
  const c2 = document.createElement('canvas')
  c2.width = w; c2.height = h
  const ctx2 = c2.getContext('2d')
  ctx2.putImageData(d, -minX, -minY)
  return { dataUrl: c2.toDataURL('image/png'), w, h, ar: +(w / h).toFixed(4) }
}, dataUrl)

writeFileSync(OUT, Buffer.from(result.dataUrl.split(',')[1], 'base64'))
console.log(JSON.stringify({ out: OUT, w: result.w, h: result.h, ar: result.ar }))
await browser.close()
