import { chromium } from 'playwright'
import { readFileSync, writeFileSync, renameSync, existsSync, unlinkSync } from 'node:fs'
import path from 'node:path'

/* Downscale the extracted marks to sane delivery sizes. The extractor
   works at source resolution (1600px garment photos) so the alpha ramp
   stays smooth; nothing on the page renders one larger than ~1000px. */

const DIR = process.argv[2] || 'public/assets/marks'
const JOBS = [
  ['ball-01.png',  'ball.png',  620],
  ['crown-01.png', 'crown.png', 760],
  ['dice-01.png',  'dice.png',  520],
  ['spade-01.png', 'skull.png', 460],
  ['sheet-01.png', 'sheet.png', 1000],
]

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage()
const report = []

for (const [from, to, maxW] of JOBS) {
  const src = path.join(DIR, from)
  if (!existsSync(src)) { report.push({ from, status: 'missing' }); continue }
  const dataUrl = `data:image/png;base64,${readFileSync(src).toString('base64')}`

  const out = await page.evaluate(async ({ src, maxW }) => {
    const img = new Image()
    img.src = src
    await img.decode()
    const scale = Math.min(1, maxW / img.naturalWidth)
    const w = Math.round(img.naturalWidth * scale)
    const h = Math.round(img.naturalHeight * scale)
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const ctx = c.getContext('2d')
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, w, h)
    return { w, h, dataUrl: c.toDataURL('image/png') }
  }, { src: dataUrl, maxW })

  const buf = Buffer.from(out.dataUrl.split(',')[1], 'base64')
  writeFileSync(path.join(DIR, to), buf)
  unlinkSync(src)
  report.push({ to, size: `${out.w}x${out.h}`, kb: Math.round(buf.length / 1024) })
}

console.log(JSON.stringify(report, null, 2))
await browser.close()
