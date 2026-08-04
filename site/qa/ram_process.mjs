import { chromium } from 'playwright'
import { writeFileSync, readFileSync } from 'fs'

/* Ram mascot pipeline:
   1. background removal — BFS flood-fill from the border over near-pure-white
      (>=252 all channels), so cream/white wool inside the subject survives
   2. ordered dither — Bayer 8x8, 4 levels/channel, 2x2 blocks, subject pixels only
   3. wrap-around sticker border — alpha mask dilated ~22px, painted white,
      composited under the subject, tight crop */

const SRC = process.argv[2]
const OUT = process.argv[3] || 'public/assets/mascot/ramsey-dither.png'
if (!SRC) { console.error('usage: node qa/ram_process.mjs <src.png> [out.png]'); process.exit(1) }

const LEVELS = 3
const BLOCK = 2
const BORDER_PX = 22

const dataUrl = `data:image/png;base64,${readFileSync(SRC).toString('base64')}`
const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage()

const result = await page.evaluate(async ({ src, LEVELS, BLOCK, BORDER_PX }) => {
  const img = new Image()
  img.src = src
  await img.decode()
  const W = img.naturalWidth, H = img.naturalHeight
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const ctx = c.getContext('2d')
  ctx.drawImage(img, 0, 0)
  const d = ctx.getImageData(0, 0, W, H)
  const px = d.data

  /* ── 1. flood-fill background from the border ── */
  const bg = new Uint8Array(W * H)
  const queue = []
  const isWhite = (i) => px[i] >= 252 && px[i + 1] >= 252 && px[i + 2] >= 252
  for (let x = 0; x < W; x++) { queue.push(x); queue.push((H - 1) * W + x) }
  for (let y = 0; y < H; y++) { queue.push(y * W); queue.push(y * W + W - 1) }
  while (queue.length) {
    const p = queue.pop()
    if (bg[p]) continue
    const i = p * 4
    if (!isWhite(i)) continue
    bg[p] = 1
    const x = p % W, y = (p / W) | 0
    if (x > 0) queue.push(p - 1)
    if (x < W - 1) queue.push(p + 1)
    if (y > 0) queue.push(p - W)
    if (y < H - 1) queue.push(p + W)
  }
  for (let p = 0; p < W * H; p++) {
    if (bg[p]) px[p * 4 + 3] = 0
  }

  /* feather the cut edge once (3x3 alpha average) */
  const a0 = new Uint8Array(W * H)
  for (let p = 0; p < W * H; p++) a0[p] = px[p * 4 + 3]
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = y * W + x
      if (a0[p] === 255 || a0[p] === 0) {
        let sum = 0
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy
            sum += (nx < 0 || ny < 0 || nx >= W || ny >= H) ? 0 : a0[ny * W + nx]
          }
        }
        const avg = sum / 9
        if (avg !== a0[p]) px[p * 4 + 3] = avg
      }
    }
  }

  /* ── 2. ordered dither (Bayer 8x8) on subject pixels ── */
  const B = [
    0, 32, 8, 40, 2, 34, 10, 42,
    48, 16, 56, 24, 50, 18, 58, 26,
    12, 44, 4, 36, 14, 46, 6, 38,
    60, 28, 52, 20, 62, 30, 54, 22,
    3, 35, 11, 43, 1, 33, 9, 41,
    51, 19, 59, 27, 49, 17, 57, 25,
    15, 47, 7, 39, 13, 45, 5, 37,
    63, 31, 55, 23, 61, 29, 53, 21,
  ]
  const steps = LEVELS - 1
  for (let y = 0; y < H; y += BLOCK) {
    for (let x = 0; x < W; x += BLOCK) {
      const t = (B[(y % 8) * 8 + (x % 8)] + 0.5) / 64 - 0.5
      for (let by = 0; by < BLOCK && y + by < H; by++) {
        for (let bx = 0; bx < BLOCK && x + bx < W; bx++) {
          const i = ((y + by) * W + (x + bx)) * 4
          if (px[i + 3] === 0) continue
          for (let ch = 0; ch < 3; ch++) {
            const v = px[i + ch] / 255 * steps
            px[i + ch] = Math.max(0, Math.min(255, Math.round(Math.round(v + t) / steps * 255)))
          }
        }
      }
    }
  }
  ctx.putImageData(d, 0, 0)

  /* ── 3. wrap-around white border ── */
  const sil = document.createElement('canvas')
  sil.width = W; sil.height = H
  const sctx = sil.getContext('2d')
  sctx.drawImage(c, 0, 0)
  sctx.globalCompositeOperation = 'source-in'
  sctx.fillStyle = '#FFFFFF'
  sctx.fillRect(0, 0, W, H)

  const out = document.createElement('canvas')
  out.width = W + BORDER_PX * 2
  out.height = H + BORDER_PX * 2
  const octx = out.getContext('2d')
  const STEPS = 40
  for (let k = 0; k < STEPS; k++) {
    const a = (k / STEPS) * Math.PI * 2
    octx.drawImage(sil, BORDER_PX + Math.cos(a) * BORDER_PX, BORDER_PX + Math.sin(a) * BORDER_PX)
  }
  octx.drawImage(c, BORDER_PX, BORDER_PX)

  /* tight crop */
  const fd = octx.getImageData(0, 0, out.width, out.height).data
  let minX = out.width, minY = out.height, maxX = 0, maxY = 0
  for (let p = 0; p < out.width * out.height; p++) {
    if (fd[p * 4 + 3] > 8) {
      const x = p % out.width, y = (p / out.width) | 0
      if (x < minX) minX = x; if (x > maxX) maxX = x
      if (y < minY) minY = y; if (y > maxY) maxY = y
    }
  }
  const cw = maxX - minX + 1, ch = maxY - minY + 1
  const crop = document.createElement('canvas')
  crop.width = cw; crop.height = ch
  crop.getContext('2d').drawImage(out, minX, minY, cw, ch, 0, 0, cw, ch)
  return { dataUrl: crop.toDataURL('image/png'), w: cw, h: ch, ar: +(cw / ch).toFixed(4) }
}, { src: dataUrl, LEVELS, BLOCK, BORDER_PX })

writeFileSync(OUT, Buffer.from(result.dataUrl.split(',')[1], 'base64'))
console.log(JSON.stringify({ out: OUT, w: result.w, h: result.h, ar: result.ar }))
await browser.close()
