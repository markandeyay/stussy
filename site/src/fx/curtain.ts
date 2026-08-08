import { gsap } from 'gsap'
import { EASE, prefersReduced } from '../core/motion'

/* ═══════════════════════════════════════════════════════════════════
   CURTAIN — the gooey stripe wipe.

   Ported from the reference's transition rather than simplified away
   from it. What makes it read as one liquid front instead of a row of
   sliding bars is the combination of three things:

     1. Widths come from a weighted bag (mostly 1, some 2, one 3), so
        the stripe rhythm is irregular — even widths look like a chart.
     2. Every rect gets its OWN random in-ease (power2/3/4) and its own
        0–150ms delay, so the leading edge is ragged, never a diagonal.
     3. A blur + high-contrast colour matrix fuses neighbouring edges
        where they overlap — the "goo" — which only works because the
        edges are ragged in the first place.

   The wordmark stamps while the screen is covered, so the transition
   carries the brand instead of just hiding the jump.

   Cost is deliberate: a full-viewport SVG filter is expensive, but it
   runs for ~1.1s on an explicit user action, a handful of times per
   session. That is a very different budget from something that runs on
   every scroll frame.
   ═══════════════════════════════════════════════════════════════════ */

const RECTS = 26
const TONES = ['flare', 'carolina', 'navy', 'ink']
const IN_EASES = ['power2.in', 'power3.in', 'power4.in']
const OUT_EASES = ['power3.out', 'power4.out', 'expo.out']

const rnd = (min: number, max: number) => min + Math.random() * (max - min)
const shuffle = <T>(arr: T[]): T[] => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export class Curtain {
  private el: HTMLElement
  private g: SVGGElement
  private stamp: HTMLElement | null
  private rects: SVGRectElement[] = []
  private busy = false

  constructor(id: string) {
    this.el = document.getElementById(id)!
    this.g = document.getElementById('curtain-g') as unknown as SVGGElement
    this.stamp = document.getElementById('curtain-stamp')

    for (let i = 0; i < RECTS; i++) {
      const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      r.setAttribute('y', '103')
      r.setAttribute('height', '103')
      this.g.appendChild(r)
      this.rects.push(r)
    }
    this.layout()
  }

  /* Re-rolled on every wipe so no two transitions share a rhythm. */
  private layout() {
    let weights = shuffle([1, 1, 1, 1, 1, 1, 2, 2, 3])
    while (weights.length < RECTS) weights = weights.concat(shuffle(weights))
    weights = weights.slice(0, RECTS)

    const total = weights.reduce((a, b) => a + b, 0)
    const unit = 100 / total
    let x = 0
    this.rects.forEach((rect, i) => {
      const w = weights[i] * unit
      rect.setAttribute('x', `${x}`)
      rect.setAttribute('width', `${w + 0.4}`)
      x += w
    })
  }

  wipe(mid: () => void) {
    if (prefersReduced()) {
      mid()
      return
    }
    if (this.busy) return
    this.busy = true

    this.el.dataset.tone = TONES[Math.floor(Math.random() * TONES.length)]
    this.el.classList.add('-active')
    this.layout()

    const tl = gsap.timeline({
      onComplete: () => {
        this.el.classList.remove('-active')
        this.busy = false
      },
    })

    /* cover — ragged leading edge */
    this.rects.forEach((rect) => {
      tl.fromTo(rect,
        { attr: { y: 103 } },
        {
          attr: { y: 0 },
          duration: rnd(0.34, 0.52),
          delay: rnd(0, 0.15),
          ease: IN_EASES[Math.floor(Math.random() * IN_EASES.length)],
        }, 0)
    })

    if (this.stamp) {
      tl.fromTo(this.stamp,
        { opacity: 0, scale: 2.1, rotate: rnd(-16, -4) },
        { opacity: 1, scale: 1, rotate: rnd(-4, 4), duration: 0.42, ease: EASE.snap }, 0.42)
        .to(this.stamp, { opacity: 0, scale: 0.94, duration: 0.26, ease: 'power2.in' }, 0.96)
    }

    tl.add(mid, 0.66)

    /* uncover — retracts through the ceiling, ragged again */
    this.rects.forEach((rect) => {
      tl.to(rect, {
        attr: { y: -103 },
        duration: rnd(0.36, 0.54),
        delay: rnd(0, 0.16),
        ease: OUT_EASES[Math.floor(Math.random() * OUT_EASES.length)],
      }, 0.84)
    })
  }
}
