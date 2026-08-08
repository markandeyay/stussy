import { gsap } from 'gsap'
import { EASE, DUR, prefersReduced } from '../core/motion'

/* ═══════════════════════════════════════════════════════════════════
   LOADER — ink field, mark, a counter that means something.

   The count is tied to real readiness (fonts + the two hero images),
   not to a fixed timer pretending to load. It eases to 100 as assets
   land, holds a beat, then the field clips away upward.
   ═══════════════════════════════════════════════════════════════════ */

const waitFor = (img: HTMLImageElement | null) =>
  new Promise<void>((res) => {
    if (!img || img.complete) return res()
    img.addEventListener('load', () => res(), { once: true })
    img.addEventListener('error', () => res(), { once: true })
  })

/* The hero mark is a CSS mask on a <span>, not an <img>, so it has no
   DOM node to await — decode it directly instead. */
const waitForUrl = (url: string) => waitFor(Object.assign(new Image(), { src: url }))

export const runLoader = (onReveal: () => void) => {
  const loader = document.getElementById('loader')
  const count = document.getElementById('loader-count')
  const fill = document.getElementById('loader-fill')
  const mark = document.getElementById('loader-mark')

  if (!loader) {
    onReveal()
    return
  }

  const finish = () => {
    loader.classList.add('-out')
    gsap.delayedCall(0.35, onReveal)
    gsap.delayedCall(DUR.d5 + 0.2, () => {
      loader.classList.add('-gone')
      loader.remove()
    })
  }

  if (prefersReduced()) {
    loader.remove()
    onReveal()
    return
  }

  gsap.set(mark, { opacity: 0, y: 24 })
  gsap.to(mark, { opacity: 1, y: 0, duration: DUR.d4, ease: EASE.out })

  const p = { v: 0 }
  const paint = () => {
    if (count) count.textContent = String(Math.round(p.v)).padStart(3, '0')
    if (fill) fill.style.transform = `scaleX(${p.v / 100})`
  }

  /* crawl toward 90 while things are still in flight, so the bar is
     always moving but never lies about being finished */
  const crawl = gsap.to(p, { v: 88, duration: 2.6, ease: 'power2.out', onUpdate: paint })

  const markUrl = `${import.meta.env.BASE_URL}assets/trapwhip-script.png`.replace(/\/{2,}/g, '/')

  const ready = Promise.all([
    document.fonts ? document.fonts.ready : Promise.resolve(),
    waitForUrl(markUrl),
    waitFor(document.querySelector('.hero__mascot img')),
    new Promise<void>((res) => gsap.delayedCall(1.1, res)),
  ])

  ready.then(() => {
    crawl.kill()
    gsap.to(p, {
      v: 100,
      duration: 0.5,
      ease: EASE.soft,
      onUpdate: paint,
      onComplete: () => gsap.delayedCall(0.22, finish),
    })
  })
}
