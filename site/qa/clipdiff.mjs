import { chromium } from 'playwright'
import fs from 'node:fs'

/* ═══════════════════════════════════════════════════════════════════
   CLIPDIFF — prove (and later, disprove) text clipping.

   For every split-text host and the story ghost, capture the region
   twice in one session: as rendered (A) and with the clipping wrapper
   disabled (B). Any pixel that differs is ink the wrapper cut off.
   Diff heatmaps land next to the pairs in qa/out/clip.
   ═══════════════════════════════════════════════════════════════════ */

const URL = process.env.URL || 'http://localhost:5199/Stussy/'
const OUT = process.env.OUT || './qa/out/clip'
const TAG = process.env.TAG || 'run'
fs.mkdirSync(OUT, { recursive: true })

const NOCLIP_SPLIT = '.glw { overflow: visible !important; }'
const NOCLIP_GHOST = '.story__pin { overflow: visible !important; }'

const TARGETS = [
  { id: 'story-title',  sel: '#story .sec__tt',    unclip: NOCLIP_SPLIT },
  { id: 'story-lede',   sel: '.story__lede',       unclip: NOCLIP_SPLIT, scrubTo: '#story-pin' },
  { id: 'story-ghost',  sel: '.story__ghost',      unclip: NOCLIP_GHOST },
  { id: 'lookbook-tt',  sel: '#lookbook .sec__tt', unclip: NOCLIP_SPLIT },
  { id: 'drop-title',   sel: '#drop .sec__tt',     unclip: NOCLIP_SPLIT },
  { id: 'tribe-title',  sel: '#tribe .sec__tt',    unclip: NOCLIP_SPLIT },
  { id: 'store-title',  sel: '#store .sec__tt',    unclip: NOCLIP_SPLIT },
  { id: 'footer-big',   sel: '.footer__word .big', unclip: NOCLIP_SPLIT },
]

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
page.on('pageerror', (e) => console.log('PAGEERROR', String(e)))

await page.goto(URL, { waitUntil: 'load' })
await page.waitForTimeout(4200) /* loader out, fonts ready */

/* freeze every ambient animation so A and B differ only by the clip */
await page.addStyleTag({ content: '*, *::before, *::after { animation-play-state: paused !important; }' })

const diffInPage = (aB64, bB64) => page.evaluate(async ([a, b]) => {
  const load = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src })
  const [ia, ib] = await Promise.all([load(a), load(b)])
  const w = ia.width, h = ia.height
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h
  const cx = cv.getContext('2d', { willReadFrequently: true })
  cx.drawImage(ia, 0, 0); const da = cx.getImageData(0, 0, w, h).data
  cx.clearRect(0, 0, w, h); cx.drawImage(ib, 0, 0); const db = cx.getImageData(0, 0, w, h).data
  const heat = cx.createImageData(w, h)
  let n = 0, minX = w, minY = h, maxX = -1, maxY = -1
  const side = { left: 0, right: 0, top: 0, bottom: 0 }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const k = (y * w + x) * 4
      const d = Math.abs(da[k] - db[k]) + Math.abs(da[k + 1] - db[k + 1]) + Math.abs(da[k + 2] - db[k + 2]) + Math.abs(da[k + 3] - db[k + 3])
      const o = k
      heat.data[o] = db[k]; heat.data[o + 1] = db[k + 1]; heat.data[o + 2] = db[k + 2]; heat.data[o + 3] = 255
      if (d > 30) {
        n++
        heat.data[o] = 255; heat.data[o + 1] = 0; heat.data[o + 2] = 0; heat.data[o + 3] = 255
        if (x < minX) minX = x; if (x > maxX) maxX = x
        if (y < minY) minY = y; if (y > maxY) maxY = y
        if (x < w * 0.18) side.left++; if (x > w * 0.82) side.right++
        if (y < h * 0.18) side.top++; if (y > h * 0.82) side.bottom++
      }
    }
  }
  cx.clearRect(0, 0, w, h); cx.putImageData(heat, 0, 0)
  return { n, bbox: n ? { minX, minY, maxX, maxY, w, h } : null, side, heat: cv.toDataURL('image/png') }
}, [aB64, bB64])

const results = []
for (const t of TARGETS) {
  const found = await page.evaluate(({ sel, scrubTo }) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const anchor = scrubTo ? document.querySelector(scrubTo) : el
    const r = anchor.getBoundingClientRect()
    /* deep enough that scrub reveals complete, target still on screen */
    const y = r.bottom + window.scrollY - window.innerHeight * 0.62
    window.scrollTo({ top: Math.max(0, y), behavior: 'instant' })
    return true
  }, { sel: t.sel, scrubTo: t.scrubTo || null })
  if (!found) { results.push({ id: t.id, error: 'not found' }); continue }

  await page.waitForTimeout(2600) /* reveals settle, scrubs finish */

  const clip = await page.evaluate((sel) => {
    const el = document.querySelector(sel)
    const r = el.getBoundingClientRect()
    const m = 36
    const x = Math.max(0, r.left - m), y = Math.max(0, r.top - m)
    return {
      x, y,
      width: Math.min(window.innerWidth - x, r.width + m * 2),
      height: Math.min(window.innerHeight - y, r.height + m * 2),
    }
  }, t.sel)

  const shotA = await page.screenshot({ clip })
  await page.addStyleTag({ content: t.unclip })
  await page.waitForTimeout(160)
  const shotB = await page.screenshot({ clip })

  fs.writeFileSync(`${OUT}/${TAG}-${t.id}-A-clipped.png`, shotA)
  fs.writeFileSync(`${OUT}/${TAG}-${t.id}-B-truth.png`, shotB)

  const diff = await diffInPage('data:image/png;base64,' + shotA.toString('base64'), 'data:image/png;base64,' + shotB.toString('base64'))
  if (diff.heat) fs.writeFileSync(`${OUT}/${TAG}-${t.id}-diff.png`, Buffer.from(diff.heat.split(',')[1], 'base64'))
  results.push({ id: t.id, diffPx: diff.n, bbox: diff.bbox, side: diff.side })

  /* restore for the next target */
  await page.evaluate((css) => {
    for (const s of Array.from(document.querySelectorAll('style'))) {
      if (s.textContent.includes('overflow: visible !important') && s.textContent.includes(css.includes('story__pin') ? 'story__pin' : '.glw')) s.remove()
    }
  }, t.unclip)
  await page.waitForTimeout(80)
}

console.log(JSON.stringify(results, null, 1))
await browser.close()
