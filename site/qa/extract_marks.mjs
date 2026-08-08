import { chromium } from 'playwright'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'

/* ═══════════════════════════════════════════════════════════════════
   MARK EXTRACTOR — isolate printed artwork from a garment photo.

   Screen-printed graphics photographed flat are ink over a near-uniform
   cloth field, which makes them separable without any manual masking:

     1. Sample the cloth colour (median of the whole frame — the print
        is a small minority of pixels, so the median IS the garment).
     2. Alpha = how far each pixel is driven away from that colour.
        Colour is then un-premultiplied back out of the cloth, so a red
        print stays red instead of turning muddy.
     3. Label connected components on a DOWNSAMPLED mask. Downsampling
        is what makes this work on hand-drawn art: separate strokes of
        one doodle merge into a single blob at 1/N scale, while genuinely
        separate doodles stay apart. Bridging the gaps with a real
        dilation pass would cost far more and do the same job.
     4. Export each component tight-cropped at full resolution.

   Usage:
     node qa/extract_marks.mjs <src> <outDir> <prefix> [opts]
       --gain=2.4      contrast applied to the alpha ramp
       --floor=0.06    alpha below this is cloth texture, drop it
       --scale=6       mask downsample factor for component grouping
       --min=0.0008    min component area as a fraction of the frame
       --pad=12        padding in source px around each crop
   ═══════════════════════════════════════════════════════════════════ */

const [, , SRC, OUT_DIR, PREFIX, ...rest] = process.argv
if (!SRC || !OUT_DIR || !PREFIX) {
  console.error('usage: node qa/extract_marks.mjs <src> <outDir> <prefix> [--gain=] [--floor=] [--scale=] [--min=] [--pad=]')
  process.exit(1)
}
const opt = (name, def) => {
  const hit = rest.find((a) => a.startsWith(`--${name}=`))
  return hit ? parseFloat(hit.split('=')[1]) : def
}
const GAIN = opt('gain', 2.4)
const FLOOR = opt('floor', 0.06)
const SCALE = opt('scale', 6)
const MIN = opt('min', 0.0008)
const PAD = opt('pad', 12)
/* --crop=x0,y0,x1,y1 in 0..1 — restrict the search to one region, for
   artwork that physically overlaps its neighbours in the print.
   --single merges everything found into one export, for marks whose
   parts are separated by white gaps (the box crown). */
const cropArg = rest.find((a) => a.startsWith('--crop='))
const CROP = cropArg ? cropArg.split('=')[1].split(',').map(Number) : null
const SINGLE = rest.includes('--single')
const REL = opt('rel', 0.12)
/* --trim=top,right,bottom,left in output px. Last resort for fragments
   that physically TOUCH the mark in the print (the handstyle running
   under the dice) — those share a connected component, so neither a
   size filter nor a source crop can separate them. */
const trimArg = rest.find((a) => a.startsWith('--trim='))
const TRIM = trimArg ? trimArg.split('=')[1].split(',').map(Number) : [0, 0, 0, 0]

mkdirSync(OUT_DIR, { recursive: true })
const dataUrl = `data:image/jpeg;base64,${readFileSync(SRC).toString('base64')}`

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage()

const result = await page.evaluate(async ({ src, GAIN, FLOOR, SCALE, MIN, PAD, CROP, SINGLE, REL, TRIM }) => {
  const img = new Image()
  img.src = src
  await img.decode()

  /* The cloth colour is sampled from the frame median, so the crop must
     still contain mostly cloth — crop to a region, not to the ink. */
  const fullW = img.naturalWidth
  const fullH = img.naturalHeight
  const cx = CROP ? Math.round(CROP[0] * fullW) : 0
  const cy = CROP ? Math.round(CROP[1] * fullH) : 0
  const W = CROP ? Math.round((CROP[2] - CROP[0]) * fullW) : fullW
  const H = CROP ? Math.round((CROP[3] - CROP[1]) * fullH) : fullH

  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, cx, cy, W, H, 0, 0, W, H)
  const src32 = ctx.getImageData(0, 0, W, H)
  const px = src32.data

  const lumOf = (i) => 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]

  /* ── 1. cloth colour = median of the frame ───────────────────── */
  const hist = new Uint32Array(256)
  const rSum = new Float64Array(256)
  const gSum = new Float64Array(256)
  const bSum = new Float64Array(256)
  for (let i = 0; i < px.length; i += 4) {
    const l = Math.round(lumOf(i))
    hist[l]++
    rSum[l] += px[i]; gSum[l] += px[i + 1]; bSum[l] += px[i + 2]
  }
  const total = (px.length / 4) | 0
  let acc = 0
  let medL = 255
  for (let l = 0; l < 256; l++) { acc += hist[l]; if (acc >= total * 0.5) { medL = l; break } }
  const bg = {
    r: rSum[medL] / hist[medL], g: gSum[medL] / hist[medL], b: bSum[medL] / hist[medL], l: medL,
  }

  /* ── 2. alpha + un-premultiply ───────────────────────────────── */
  const alpha = new Float32Array(W * H)
  for (let p = 0, i = 0; p < W * H; p++, i += 4) {
    let a = ((bg.l - lumOf(i)) / Math.max(bg.l, 1)) * GAIN
    if (a < FLOOR) a = 0
    if (a > 1) a = 1
    alpha[p] = a
  }

  /* ── 3. components on a downsampled mask ─────────────────────── */
  const mw = Math.ceil(W / SCALE)
  const mh = Math.ceil(H / SCALE)
  const mask = new Uint8Array(mw * mh)
  for (let p = 0; p < W * H; p++) {
    if (alpha[p] <= 0) continue
    const x = p % W
    const y = (p / W) | 0
    mask[((y / SCALE) | 0) * mw + ((x / SCALE) | 0)] = 1
  }

  const label = new Int32Array(mw * mh).fill(-1)
  const boxes = []
  const stack = new Int32Array(mw * mh)
  for (let s = 0; s < mw * mh; s++) {
    if (!mask[s] || label[s] !== -1) continue
    const id = boxes.length
    let top = 0
    stack[top++] = s
    label[s] = id
    let minX = mw, minY = mh, maxX = 0, maxY = 0, area = 0
    while (top > 0) {
      const q = stack[--top]
      const qx = q % mw
      const qy = (q / mw) | 0
      area++
      if (qx < minX) minX = qx
      if (qx > maxX) maxX = qx
      if (qy < minY) minY = qy
      if (qy > maxY) maxY = qy
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = qx + dx
          const ny = qy + dy
          if (nx < 0 || ny < 0 || nx >= mw || ny >= mh) continue
          const n = ny * mw + nx
          if (mask[n] && label[n] === -1) { label[n] = id; stack[top++] = n }
        }
      }
    }
    boxes.push({ id, minX, minY, maxX, maxY, area })
  }

  const minArea = MIN * mw * mh
  let keep = boxes
    .filter((b) => b.area >= minArea)
    .sort((a, b) => b.area - a.area)

  /* Interior detail is its own component: the "8" inside the 8-ball,
     pips inside a die, eye sockets inside a skull. Any component whose
     box sits wholly inside a larger one belongs to that one — fold it
     in and drop it as a standalone export. */
  const contains = (a, b) =>
    b.minX >= a.minX && b.maxX <= a.maxX && b.minY >= a.minY && b.maxY <= a.maxY
  const family = new Map(keep.map((b) => [b.id, new Set([b.id])]))
  const absorbed = new Set()
  for (const big of keep) {
    if (absorbed.has(big.id)) continue
    for (const small of keep) {
      if (small.id === big.id || absorbed.has(small.id)) continue
      if (small.area < big.area && contains(big, small)) {
        family.get(big.id).add(small.id)
        absorbed.add(small.id)
      }
    }
  }
  keep = keep.filter((b) => !absorbed.has(b.id))

  /* --single: everything surviving in the crop is one mark.
     REL drops fragments that are tiny next to the main mark — the
     clipped ascenders of neighbouring type, a stray bit of the
     handstyle — which is far more robust than hunting for a crop
     rectangle that happens to miss them by a pixel. */
  if (SINGLE && keep.length) {
    const largest = keep[0].area
    keep = keep.filter((b) => b.area >= largest * REL)
    const all = new Set()
    let minX = mw, minY = mh, maxX = 0, maxY = 0, area = 0
    for (const b of keep) {
      for (const id of family.get(b.id)) all.add(id)
      minX = Math.min(minX, b.minX); minY = Math.min(minY, b.minY)
      maxX = Math.max(maxX, b.maxX); maxY = Math.max(maxY, b.maxY)
      area += b.area
    }
    const merged = { id: keep[0].id, minX, minY, maxX, maxY, area }
    family.set(merged.id, all)
    keep = [merged]
  }

  /* ── 4. export each component at full resolution ─────────────── */
  const out = []
  const c2 = document.createElement('canvas')
  const ctx2 = c2.getContext('2d')

  for (const b of keep) {
    const kin = family.get(b.id)
    const x0 = Math.max(0, b.minX * SCALE - PAD + TRIM[3])
    const y0 = Math.max(0, b.minY * SCALE - PAD + TRIM[0])
    const x1 = Math.min(W, (b.maxX + 1) * SCALE + PAD - TRIM[1])
    const y1 = Math.min(H, (b.maxY + 1) * SCALE + PAD - TRIM[2])
    const w = x1 - x0
    const h = y1 - y0
    if (w < 8 || h < 8) continue

    c2.width = w
    c2.height = h
    const outImg = ctx2.createImageData(w, h)
    const o = outImg.data

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const sp = (y0 + y) * W + (x0 + x)
        /* only pixels belonging to THIS component — otherwise a
           neighbouring doodle bleeds into the crop rectangle */
        const ml = label[(((y0 + y) / SCALE) | 0) * mw + (((x0 + x) / SCALE) | 0)]
        const a = kin.has(ml) ? alpha[sp] : 0
        const di = (y * w + x) * 4
        if (a <= 0) { o[di + 3] = 0; continue }
        const si = sp * 4
        o[di]     = Math.max(0, Math.min(255, (px[si]     - bg.r * (1 - a)) / a))
        o[di + 1] = Math.max(0, Math.min(255, (px[si + 1] - bg.g * (1 - a)) / a))
        o[di + 2] = Math.max(0, Math.min(255, (px[si + 2] - bg.b * (1 - a)) / a))
        o[di + 3] = Math.round(a * 255)
      }
    }
    ctx2.putImageData(outImg, 0, 0)
    out.push({ w, h, area: b.area, x: x0, y: y0, dataUrl: c2.toDataURL('image/png') })
  }

  return { W, H, bg, components: boxes.length, kept: out.length, out }
}, { src: dataUrl, GAIN, FLOOR, SCALE, MIN, PAD, CROP, SINGLE, REL, TRIM })

const manifest = []
result.out.forEach((o, i) => {
  const name = `${PREFIX}-${String(i + 1).padStart(2, '0')}.png`
  writeFileSync(path.join(OUT_DIR, name), Buffer.from(o.dataUrl.split(',')[1], 'base64'))
  manifest.push({ name, w: o.w, h: o.h, at: [o.x, o.y] })
})

console.log(JSON.stringify({
  src: path.basename(SRC),
  size: [result.W, result.H],
  cloth: { r: Math.round(result.bg.r), g: Math.round(result.bg.g), b: Math.round(result.bg.b) },
  componentsFound: result.components,
  exported: manifest,
}, null, 2))

await browser.close()
