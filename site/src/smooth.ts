import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

let lenis: Lenis
const velocityFns: Array<(v: number) => void> = []

export const initSmooth = () => {
  lenis = new Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  })

  lenis.on('scroll', (e: { velocity: number }) => {
    ScrollTrigger.update()
    velocityFns.forEach((fn) => fn(e.velocity))
  })

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000)
  })
  gsap.ticker.lagSmoothing(0)

  const header = document.getElementById('header')
  const pagetop = document.getElementById('pagetop')
  let lastY = 0
  let headerHidden = false
  let pagetopShown = false
  lenis.on('scroll', (e: { scroll: number }) => {
    const y = e.scroll
    /* touch classList only on actual state flips — add/remove with the
       class already present/absent still marks style dirty each frame */
    if (header) {
      const hide = y > lastY && y > 140
      if (hide !== headerHidden) {
        headerHidden = hide
        header.classList.toggle('-hidden', hide)
      }
    }
    if (pagetop) {
      const show = y > window.innerHeight * 0.9
      if (show !== pagetopShown) {
        pagetopShown = show
        pagetop.classList.toggle('-show', show)
      }
    }
    lastY = y
  })
}

export const scrollToTarget = (target: string | number, immediate = false) => {
  if (!lenis) return
  if (immediate) {
    lenis.scrollTo(target as never, { immediate: true })
  } else {
    lenis.scrollTo(target as never, { offset: target === 0 ? 0 : -20, duration: 1.6 })
  }
}

export const onVelocity = (fn: (v: number) => void) => {
  velocityFns.push(fn)
}
