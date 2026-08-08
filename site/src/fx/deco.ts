import { gsap } from 'gsap'
import { EASE, prefersReduced } from '../core/motion'

/* ═══════════════════════════════════════════════════════════════════
   SECTION DECO — background life inside the opaque sections.

   The atmosphere layer sits behind the page, which means the three
   sections that own a solid colour field — lookbook (navy), tribe
   (carolina), store (ink) — were completely flat behind their content.
   Half the page had a world behind it and half had nothing.

   These are big, low-contrast marks scattered inside the section
   itself, parallaxing against the scroll so they sit *in* the field
   rather than on it. Scale and placement are deliberately uneven; a
   mark landing dead-centre or at a tidy interval reads as a pattern.
   ═══════════════════════════════════════════════════════════════════ */

/* Real Stüssy print artwork (see qa/extract_marks.mjs). Aspect ratios
   differ enormously, so each entry carries its own. */
const AR: Record<string, number> = {
  ball: 620 / 528, crown: 534 / 206, dice: 322 / 670,
  skull: 272 / 302, sheet: 768 / 1038,
}

/* Per-section casts. Each section draws from its own set so the three
   solid fields stay distinguishable rather than sharing one soup. The
   full skulls composition appears once per section as the large piece. */
const CASTS: Record<string, string[]> = {
  lookbook: ['sheet', 'ball', 'skull', 'crown', 'dice'],
  tribe: ['crown', 'sheet', 'dice', 'ball', 'skull'],
  store: ['ball', 'dice', 'sheet', 'crown', 'skull'],
}

/* x/y in %, size in vw, rotation in deg — hand-placed so nothing lands
   on the display type or the reading column */
const SPOTS: Array<[number, number, number, number]> = [
  [76, 12, 13, -14],
  [8, 62, 17, 11],
  [58, 74, 10, -8],
  [90, 46, 9, 19],
  [33, 20, 8, -21],
]

const rand = (a: number, b: number) => a + Math.random() * (b - a)

export const initDeco = () => {
  if (prefersReduced()) return

  for (const [id, cast] of Object.entries(CASTS)) {
    const sec = document.getElementById(id)
    if (!sec) continue

    const layer = document.createElement('div')
    layer.className = 'sec__deco'
    layer.setAttribute('aria-hidden', 'true')

    cast.forEach((name, i) => {
      const [x, y, w, rot] = SPOTS[i % SPOTS.length]
      const el = document.createElement('div')
      el.className = 'sec__deco-mark'
      el.style.setProperty('--x', `${x + rand(-4, 4)}%`)
      el.style.setProperty('--y', `${y + rand(-5, 5)}%`)
      el.style.setProperty('--w', `${(w * rand(0.85, 1.2)).toFixed(1)}vw`)
      el.style.setProperty('--rot', `${rot + rand(-8, 8)}deg`)

      el.dataset.mark = name
      el.style.setProperty('--ar', String(AR[name] ?? 1))
      /* the sheet is the hero piece — give it real presence */
      if (name === 'sheet') el.style.setProperty('--w', `${(w * 2.4).toFixed(1)}vw`)

      const img = document.createElement('img')
      img.src = `${import.meta.env.BASE_URL}assets/marks/${name}.webp`.replace(/\/{2,}/g, '/')
      img.alt = ''
      img.loading = 'lazy'
      img.decoding = 'async'
      el.appendChild(img)
      layer.appendChild(el)
    })

    /* prepend so the marks sit behind the section's own content */
    sec.insertBefore(layer, sec.firstChild)

    /* Alternating parallax rates pull the field apart as it passes —
       one transform per mark, no layout, no paint. */
    gsap.utils.toArray<HTMLElement>(layer.children).forEach((mark, i) => {
      gsap.fromTo(mark,
        { yPercent: (i % 2 ? 1 : -1) * rand(14, 30) },
        {
          yPercent: (i % 2 ? -1 : 1) * rand(14, 30),
          ease: EASE.linear,
          scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: 1.15 },
        })
    })
  }
}
