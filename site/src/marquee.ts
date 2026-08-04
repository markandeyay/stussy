import { gsap } from 'gsap'

/* ZOCCON marquees: constant linear loop + scroll-velocity bend.
   The loop is GSAP-driven (not the CSS keyframe): per-frame WAAPI
   playbackRate writes forced the compositor to re-sync the animation
   every tick, teleporting the rendered position backward mid-flight —
   visible stutter at high rates. GSAP timeScale bends the playhead
   rate on the main-thread clock, which is position-continuous.
   Singles are cloned until the set covers 2x viewport AND the count
   is EVEN, so the -50%-width loop wrap lands on an exact single
   boundary (odd counts made the wrap jump by half a single). */

const BASE_DURATION = 18

export const initMarquees = () => {
  const marquees: HTMLElement[] = []
  const loops: gsap.core.Tween[] = []

  document.querySelectorAll<HTMLElement>('[data-marquee]').forEach((el) => {
    const set = el.querySelector<HTMLElement>('.marquee-set')
    const single = el.querySelector<HTMLElement>('.marquee-single')
    if (!set || !single) return

    while (set.scrollWidth < window.innerWidth * 2) {
      set.appendChild(single.cloneNode(true))
    }
    set.appendChild(single.cloneNode(true))
    if (set.children.length % 2 === 1) {
      set.appendChild(single.cloneNode(true))
    }
    marquees.push(el)

    /* infinite leftward loop over exactly half the set (an integer number
       of singles). repeatRefresh re-measures the width each cycle, so
       webfont metric shifts and resizes self-correct on the next lap. */
    const loop = gsap.to(set, {
      x: () => -(set.scrollWidth / 2),
      duration: BASE_DURATION,
      ease: 'none',
      repeat: -1,
      repeatRefresh: true,
      paused: true,
    })
    loops.push(loop)
  })

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        const i = marquees.indexOf(entry.target as HTMLElement)
        entry.target.classList.add('-inview')
        if (i > -1) loops[i].play()
      })
    },
    { threshold: 0 }
  )
  marquees.forEach((el) => io.observe(el))

  /* velocity bend: ONE persistent quickTo eases the rate (whips to ~17x
     under hard scroll, glides back to 1x 0.7s after scrolling stops);
     timeScale writes are playhead-rate changes — never position jumps. */
  const proxy = { rate: 1 }
  const rateTo = gsap.quickTo(proxy, 'rate', {
    duration: 0.35,
    ease: 'power2.out',
    onUpdate: () => {
      for (let i = 0; i < loops.length; i++) loops[i].timeScale(proxy.rate)
    },
  })
  let resetTw: gsap.core.Tween | null = null

  return {
    push: (velocity: number) => {
      const v = Math.min(Math.abs(velocity), 40)
      rateTo(1 + v * 0.4)
      resetTw && resetTw.kill()
      resetTw = gsap.delayedCall(0.7, () => rateTo(1))
    },
  }
}
