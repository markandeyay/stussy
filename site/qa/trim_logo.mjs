import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'fs'

/* crop ONLY the wordmark band (source has watermark rows below) */

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage()
const b64 = readFileSync('/tmp/stussy_1000.png').toString('base64')

const out = await page.evaluate(async (data) => {
  const img = new Image()
  await new Promise((res) => { img.onload = res; img.src = 'data:image/png;base64,' + data })
  const c = document.createElement('canvas')
  c.width = img.width; c.height = img.height
  const x = c.getContext('2d')
  x.drawImage(img, 0, 0)
  const px = x.getImageData(0, 0, c.width, c.height).data

  // per-row alpha content
  const rows = []
  for (let yy = 0; yy < c.height; yy++) {
    let n = 0
    for (let xx = 0; xx < c.width; xx += 2) if (px[(yy * c.width + xx) * 4 + 3] > 12) n++
    rows.push(n)
  }
  // bands with gap tolerance 10px
  const bands = []
  let start = -1, gap = 0
  for (let yy = 0; yy < c.height; yy++) {
    if (rows[yy] > 0) {
      if (start < 0) start = yy
      gap = 0
    } else if (start >= 0) {
      gap++
      if (gap > 10) { bands.push([start, yy - gap]); start = -1; gap = 0 }
    }
  }
  if (start >= 0) bands.push([start, c.height - 1])
  // wordmark = the TALLEST band (script towers over watermark text)
  bands.sort((a, b2) => (b2[1] - b2[0]) - (a[1] - a[0]))
  const [y0, y1] = bands[0]

  // x-bbox within that band
  let minX = c.width, maxX = 0
  for (let yy = y0; yy <= y1; yy += 2) {
    for (let xx = 0; xx < c.width; xx += 2) {
      if (px[(yy * c.width + xx) * 4 + 3] > 12) {
        if (xx < minX) minX = xx
        if (xx > maxX) maxX = xx
      }
    }
  }
  const padX = Math.round((maxX - minX) * 0.03)
  const padY = Math.round((y1 - y0) * 0.05)
  const cx0 = Math.max(0, minX - padX), cy0 = Math.max(0, y0 - padY)
  const w = Math.min(c.width, maxX + padX) - cx0
  const h = Math.min(c.height, y1 + padY) - cy0

  const mk = (color) => {
    const cc = document.createElement('canvas')
    cc.width = w; cc.height = h
    const cx = cc.getContext('2d')
    cx.drawImage(img, cx0, cy0, w, h, 0, 0, w, h)
    if (color) {
      cx.globalCompositeOperation = 'source-in'
      cx.fillStyle = color
      cx.fillRect(0, 0, w, h)
    }
    return cc.toDataURL('image/png')
  }
  return { black: mk(null), white: mk('#ffffff'), w, h, bandCount: bands.length }
}, b64)

console.log('bands found:', out.bandCount, '| wordmark crop:', out.w, 'x', out.h)
writeFileSync('/Users/williamkeffer/NerdsInc/Personal_Projects/Stussy/site/public/assets/stussy-script.png', Buffer.from(out.black.split(',')[1], 'base64'))
writeFileSync('/Users/williamkeffer/NerdsInc/Personal_Projects/Stussy/site/public/assets/stussy-script-white.png', Buffer.from(out.white.split(',')[1], 'base64'))
await browser.close()
console.log('SAVED')
