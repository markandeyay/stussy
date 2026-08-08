import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { prefersReduced } from './motion'

/* ═══════════════════════════════════════════════════════════════════
   SCROLL — one Lenis instance, one broadcast.

   Everything that reacts to scrolling (header, rail, bands, atmosphere)
   subscribes here instead of attaching its own listener, so the page
   has exactly one scroll handler no matter how many features read it.
   ═══════════════════════════════════════════════════════════════════ */

export interface ScrollInfo {
  y: number
  velocity: number
  direction: number
  progress: number
}

let lenis: Lenis | null = null
const subs: Array<(s: ScrollInfo) => void> = []

const emit = (info: ScrollInfo) => {
  for (let i = 0; i < subs.length; i++) subs[i](info)
}

export const onScroll = (fn: (s: ScrollInfo) => void) => {
  subs.push(fn)
}

export const initScroll = () => {
  /* Reduced motion means native scrolling — smooth-scroll hijacking is
     exactly the kind of thing the preference exists to switch off. */
  if (prefersReduced()) {
    let last = 0
    let ticking = false
    const read = () => {
      ticking = false
      const y = window.scrollY
      const max = document.documentElement.scrollHeight - window.innerHeight
      emit({ y, velocity: 0, direction: y > last ? 1 : -1, progress: max > 0 ? y / max : 0 })
      last = y
    }
    window.addEventListener('scroll', () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(read)
    }, { passive: true })
    read()
    return
  }

  lenis = new Lenis({
    duration: 1.05,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    touchMultiplier: 1.6,
  })

  lenis.on('scroll', (e: { scroll: number; velocity: number; direction: number; progress: number }) => {
    ScrollTrigger.update()
    emit({ y: e.scroll, velocity: e.velocity, direction: e.direction, progress: e.progress })
  })

  gsap.ticker.add((time) => lenis!.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)
}

export const scrollTo = (target: string | number, immediate = false) => {
  if (lenis) {
    lenis.scrollTo(target as never, immediate ? { immediate: true } : { duration: 1.4, offset: target === 0 ? 0 : -8 })
    return
  }
  const el = typeof target === 'string' ? document.querySelector(target) : null
  const y = typeof target === 'number' ? target : el ? el.getBoundingClientRect().top + window.scrollY : 0
  window.scrollTo({ top: y, behavior: immediate ? 'auto' : 'smooth' })
}
