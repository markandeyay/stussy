import { gsap } from 'gsap'

/* Port of ZOCCON's typo system:
   - p-typo-back canvas text streams (class c3): lane speeds from the
     PC static_movX ranges (3-5 / 4-6 px/frame), with periodic "active"
     bursts (x1.5 / x2.5 / x4, time {start:10, loop:30}) that recolor
     a limited number of streams.
   - chara spawner (class l3): every 8s, shuffled lanes [.1,.3,.5,.7]vh,
     staggered one-shot screen crossings via kf-typo-chara.
   - p-typo-front: 5em flowing strip above content. */

const BACK_TEXTS = [
  '🏀🐏🎱 CHAPEL HILL ☆彡 🏀🐏🎱 CHAPEL HILL ☆彡 ',
  'FRANKLIN ST ☆彡 CAROLINA BLUE ☆彡 FRANKLIN ST ☆彡 ',
  '🎲♠️ 8-BALL NEVER LIES ♠️🎲 🎲♠️ 8-BALL NEVER LIES ♠️🎲 ',
  'TAR HEELS ☆ TAR HEELS ☆ TAR HEELS ☆ TAR HEELS ☆ ',
  '💙🤍 GDTBATH 🤍💙 💙🤍 GDTBATH 🤍💙 ',
  'CHAPEL THRILL ✨ CHAPEL THRILL ✨ CHAPEL THRILL ✨ ',
  '178 E FRANKLIN ⭐️ EST. 2026 ⭐️ 178 E FRANKLIN ⭐️ EST. 2026 ⭐️ ',
  '🐏💨 RAM RAM RAM RAM RAM RAM RAM RAM ',
  '🎱🧢👟 SOUTHERN PART OF HEAVEN 👟🧢🎱 ',
  '▂▃▅▆▇██▇▆▅▃▂ ▂▃▅▆▇██▇▆▅▃▂ ',
]

const FRONT_ITEMS: { t?: string; hand?: boolean; logo?: boolean }[] = [
  { logo: true },
  { t: ' ★ EST. 2026 ★ ', hand: false },
  { t: 'チャペルヒル店', hand: false },
  { t: ' ★ SOLD OUT FOREVER ★ GO HEELS. ★ ', hand: false },
]

/* Trapwhip Chapel Hill two-tone wordmark — drawn into both canvas layers */
const LOGO_AR = 735 / 506
const logoImg = new Image()
let logoReady = false
logoImg.onload = () => { logoReady = true }
logoImg.src = '/assets/trapwhip-script.png'

const DISPLAY = (px: number, weight = 800) =>
  `${weight} ${px}px "futura-pt-condensed", Impact, Haettenschweiler, "Arial Narrow", sans-serif`
const HAND = (px: number) => `${px}px "flood", "Marker Felt", "Bradley Hand", cursive`

const FRONT_COLORS = [
  'rgba(19,41,75,0.88)',   // navy
  'rgba(242,104,42,0.85)', // orange
  'rgba(75,156,211,0.9)',  // carolina
  'rgba(150,110,10,0.85)', // dark gold (readable at small size)
]

const SHADOW_COLOR = 'rgba(170,170,170,0.3)'
const FRONT_LH = 54

const rand = (min: number, max: number) => min + Math.random() * (max - min)
const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/* Faithful port of ZOCCON's back-typo instance system (classes i3/s3
   around static_movX in main.js):
   TWO overlaid layers of independent instances —
   LAYER A "white": rows every 100px, 3 per row, big weighted sizes,
   LAYER B "grad": rows every 65px, 15 per row, small sizes.
   Every instance: y = row*margin + (col/len)*margin*1.4  (staircase —
   rows are diagonal cascades, never parallel lines), x chained with
   OVERLAP (e += width*0.75 / *0.25), row start x random 0-10% vw,
   per-instance speed (80% slow range, 20% fast), ~40% tinted,
   colored ones get a gray shadow copy at (+2,+2), text pulled from a
   shuffled bag. Wrap: x < -width → x = vw (individual churn). */

interface Inst {
  txt: string
  w: number
  x: number
  y: number
  movX: number
  font: string      // precomputed at creation — never rebuilt per frame
  color: string
  shadow: boolean
  logo?: boolean
  h?: number
}

/* precomputed front-strip piece: everything the frame loop needs */
interface FrontPiece {
  txt: string
  font: string
  fill: string
  w: number
  logo?: boolean
}

export const initTypo = () => {
  const back = document.getElementById('typo-back') as HTMLElement
  const backCanvas = document.getElementById('typo-back-canvas') as HTMLCanvasElement
  const front = document.getElementById('typo-front') as HTMLElement
  const frontStrip = document.getElementById('typo-front-strip') as HTMLElement
  const frontCanvas = document.getElementById('typo-front-canvas') as HTMLCanvasElement
  if (!back || !backCanvas || !front || !frontCanvas) return

  const ctx = backCanvas.getContext('2d')!
  const fctx = frontCanvas.getContext('2d')!
  let insts: Inst[] = []
  let frontPieces: FrontPiece[] = []
  let frontX = 0
  let frontWidth = 0

  /* cached dimensions — updated by fit() only, never re-read per frame */
  let vw = 0
  let vh = 0
  let dpr = 1
  let lastW = -1
  let lastH = -1
  const FH = 5 * 16

  const fit = (force = false) => {
    const w = window.innerWidth
    const h = window.innerHeight
    if (!force && w === lastW && h === lastH) return
    lastW = w
    lastH = h
    vw = w
    vh = h
    dpr = Math.min(window.devicePixelRatio || 1, 2)

    backCanvas.width = w * dpr
    backCanvas.height = h * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    frontCanvas.width = w * dpr
    frontCanvas.height = FH * dpr
    fctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    frontStrip.style.transform = `translate3d(0, ${Math.round(Math.min(Math.max(h * 0.16, 96), 180))}px, 0)`

    /* shuffled text bag (ae.getBackTxt: every phrase used once per cycle) */
    let bag: string[] = []
    const pull = () => {
      if (!bag.length) bag = shuffle([...BACK_TEXTS])
      return bag.shift()!
    }

    /* tint buckets — ~40% colored (10% each), rest neutral ink/navy */
    const tintA = (m: number): [string, boolean] => {
      if (m < 0.1) return ['rgba(75,156,211,0.42)', true]
      if (m < 0.2) return ['rgba(242,104,42,0.4)', true]
      if (m < 0.3) return ['rgba(242,61,0,0.38)', true]
      if (m < 0.4) return ['rgba(150,110,10,0.42)', true]
      return ['rgba(19,41,75,0.3)', false]
    }
    const tintB = (m: number): [string, boolean] => {
      if (m < 0.1) return ['rgba(75,156,211,0.34)', true]
      if (m < 0.2) return ['rgba(242,104,42,0.32)', true]
      if (m < 0.3) return ['rgba(242,61,0,0.3)', true]
      if (m < 0.4) return ['rgba(47,214,168,0.36)', true]
      return ['rgba(10,10,10,0.13)', false]
    }
    /* 5 weighted size buckets — m<.2/.4/.6/.8 thresholds like the reference */
    const bucket = (sizes: number[]) => {
      const m = Math.random()
      return m < 0.2 ? sizes[0] : m < 0.4 ? sizes[1] : m < 0.6 ? sizes[2] : m < 0.8 ? sizes[3] : sizes[4]
    }
    /* per-instance speed — 80% slow range, 20% fast range (static_movX pc) */
    const speed = () => (Math.random() > 0.8 ? rand(4, 6) : rand(3, 5))

    insts = []

    /* ── LAYER A "white": big + sparse (rows 100px, 3 per row) ── */
    const MARGIN_A = 100
    const rowsA = Math.ceil(h / MARGIN_A) + 2
    for (let r = 0; r < rowsA; r++) {
      let e = rand(0, 0.1) * w
      for (let c = 0; c < 3; c++) {
        /* every few rows, the middle instance is the real wordmark */
        if (r % 6 === 2 && c === 1) {
          const lh = rand(64, 84)
          const lw = lh * LOGO_AR
          insts.push({
            txt: '', w: lw, x: e,
            y: r * MARGIN_A + (c / 3) * MARGIN_A * 1.4,
            movX: speed(), font: '', color: '', shadow: false,
            logo: true, h: lh,
          })
          e += lw * 0.75
          continue
        }
        const txt = pull()
        const size = bucket([48, 56, 64, 72, 80])
        const weight = Math.random() < 0.25 ? 500 : 800
        const font = DISPLAY(size, weight)
        ctx.font = font
        const tw = ctx.measureText(txt).width
        const [color, shadow] = tintA(Math.random())
        insts.push({
          txt, w: tw, x: e,
          y: r * MARGIN_A + (c / 3) * MARGIN_A * 1.4,
          movX: speed(), font, color, shadow,
        })
        e += tw * 0.75   /* overlap: next starts before this one ends */
      }
    }

    /* ── LAYER B "grad": small + dense (rows 65px, 15 per row) ── */
    const MARGIN_B = 65
    const rowsB = Math.ceil(h / MARGIN_B) + 2
    for (let r = 0; r < rowsB; r++) {
      let e = rand(0, 0.1) * w
      for (let c = 0; c < 15; c++) {
        const txt = pull()
        const size = bucket([15, 17, 19, 21, 24])
        const weight = Math.random() < 0.5 ? 500 : 800
        const font = DISPLAY(size, weight)
        ctx.font = font
        const tw = ctx.measureText(txt).width
        const [color, shadow] = tintB(Math.random())
        insts.push({
          txt, w: tw, x: e,
          y: r * MARGIN_B + (c / 15) * MARGIN_B * 1.5,
          movX: speed(), font, color, shadow,
        })
        e += tw * 0.25
      }
    }

    /* front strip: measure + resolve fonts/colors ONCE (widths never change) */
    const handFont = HAND(46)
    const dispFont = DISPLAY(34, 800)
    const handFill = 'rgba(242,61,0,0.9)'
    frontPieces = FRONT_ITEMS.map((item, i) => {
      if (item.logo) return { txt: '', font: '', fill: '', w: FRONT_LH * LOGO_AR, logo: true }
      const font = item.hand ? handFont : dispFont
      fctx.font = font
      return {
        txt: item.t || '',
        font,
        fill: item.hand ? handFill : FRONT_COLORS[i % FRONT_COLORS.length],
        w: fctx.measureText(item.t || '').width,
      }
    })
    frontWidth = frontPieces.reduce((acc, p) => acc + p.w, 0)
    frontX = w
  }
  fit(true)

  /* ── chara spawner (port of l3) ── */
  const charas = shuffle(Array.from(back.querySelectorAll<HTMLElement>('.chara')))
  charas.forEach((c) => {
    const img = c.querySelector('img')!
    img.style.transform = `scale(${rand(0.55, 0.85)})`
  })
  let charaTimer: gsap.core.Tween | null = null
  const launchCharas = (first = false) => {
    const wait = first ? 4 : 8
    charaTimer = gsap.delayedCall(wait, () => {
      const lanes = shuffle([0.1, 0.3, 0.5, 0.7])
      shuffle(charas)
      charas.forEach((c, n) => {
        c.classList.remove('-run')
        c.style.top = `${lanes[n] * 100}vh`
        gsap.delayedCall(2 * n + rand(0, 1), () => {
          c.classList.add('-run')
          c.style.animationDuration = `${rand(3, 5)}s`
        })
      })
      launchCharas(false)
    })
  }

  /* ── active burst cycle (time {start:10, loop:30}) ── */
  let active = false
  const burstLoop = () => {
    gsap.delayedCall(10, () => {
      active = true
      gsap.delayedCall(6, () => {
        active = false
        burstLoop()
      })
    })
  }

  /* scroll-velocity multiplier (lerped, decays to 1) */
  let velMul = 1
  let velTarget = 1

  let running = true
  let lastT = 0
  /* single-chain invariant: a stale chain (visibility toggle races) dies
     on the id check instead of doubling the loop */
  let chainId = 0

  const step = (id: number) => {
    if (id !== chainId || !running) return
    /* frame-factor like the reference ticker: min(2, elapsed/16.67ms) */
    const now = performance.now()
    const ff = lastT ? Math.min(2, (now - lastT) / (1000 / 60)) : 1
    lastT = now
    velTarget += (1 - velTarget) * 0.06
    velMul += (velTarget - velMul) * 0.1
    ctx.clearRect(0, 0, vw, vh)

    /* per-frame canvas-state caches: identical strings are never
       re-assigned (assignment = re-parse), order preserved exactly */
    let curFont = ''
    let curFill = ''

    for (let i = 0; i < insts.length; i++) {
      const s = insts[i]
      /* active bursts: rotating third of instances surges x1.5/x2.5/x4 */
      const mul = active ? (i % 3 === 0 ? 1.5 : i % 3 === 1 ? 2.5 : 4) : 1
      s.x -= s.movX * mul * velMul * ff
      if (s.x < -s.w) s.x = vw   /* individual churn: back to right edge */
      if (s.logo) {
        if (logoReady) {
          ctx.drawImage(logoImg, s.x, s.y - (s.h || 70) * 0.82, s.w, s.h || 70)
        }
        continue
      }
      if (s.font !== curFont) {
        ctx.font = s.font
        curFont = s.font
      }
      if (s.shadow) {
        if (SHADOW_COLOR !== curFill) {
          ctx.fillStyle = SHADOW_COLOR
          curFill = SHADOW_COLOR
        }
        ctx.fillText(s.txt, s.x + 2, s.y + 2)
      }
      if (s.color !== curFill) {
        ctx.fillStyle = s.color
        curFill = s.color
      }
      ctx.fillText(s.txt, s.x, s.y)
    }

    /* front strip — all fonts/colors/widths precomputed in fit() */
    fctx.clearRect(0, 0, vw, FH)
    frontX -= 2.2 * velMul
    if (frontX < -frontWidth) frontX += frontWidth + vw * 0.2
    const gap = frontWidth + vw * 0.2
    let fFont = ''
    let fFill = ''
    for (let copy = 0; copy < 2; copy++) {
      let cx = frontX + copy * gap
      for (let i = 0; i < frontPieces.length; i++) {
        const p = frontPieces[i]
        if (p.logo) {
          if (logoReady) {
            fctx.drawImage(logoImg, cx, FH * 0.62 - FRONT_LH * 0.84, p.w, FRONT_LH)
          }
          cx += p.w
          continue
        }
        if (p.font !== fFont) {
          fctx.font = p.font
          fFont = p.font
        }
        if (p.fill !== fFill) {
          fctx.fillStyle = p.fill
          fFill = p.fill
        }
        fctx.fillText(p.txt, cx, FH * 0.62)
        cx += p.w
      }
    }

    requestAnimationFrame(() => step(id))
  }

  const kick = () => {
    chainId++
    lastT = 0
    step(chainId)
  }

  /* resize: rAF-throttled + ignored when dimensions didn't actually change
     (mobile chrome address-bar collapse fires resize on scroll) */
  let resizeRaf = 0
  window.addEventListener('resize', () => {
    if (resizeRaf) return
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = 0
      fit()
    })
  })

  document.addEventListener('visibilitychange', () => {
    running = !document.hidden
    if (running) kick()   /* stale chain self-terminates via id check */
  })

  return {
    start: () => {
      fit(true)   /* refit with final webfont metrics (loader awaits fonts.ready) */
      back.classList.add('-ready')
      front.classList.add('-ready')
      kick()
      launchCharas(true)
      burstLoop()
    },
    velocity: (v: number) => {
      velTarget = 1 + Math.min(Math.abs(v) * 0.09, 3.2)
    },
    stop: () => {
      running = false
      charaTimer && charaTimer.kill()
      charas.forEach((c) => c.classList.remove('-run'))
    },
  }
}
