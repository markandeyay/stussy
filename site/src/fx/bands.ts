import { gsap } from 'gsap'
import { prefersReduced } from '../core/motion'
import { onScroll } from '../core/scroll'

/* ═══════════════════════════════════════════════════════════════════
   BANDS — the tilted marquee tape between sections.

   Constant linear travel at a fixed pixels-per-second, so every row
   moves at the same visual speed regardless of how much text it holds.
   Scroll velocity bends the playhead RATE via timeScale, never the
   position — writing position (or WAAPI playbackRate) mid-flight makes
   the compositor re-sync and the type visibly snaps backward.

   Rows are paused while off-screen, so the three bands cost nothing
   for the ~80% of the page where none of them is visible.
   ═══════════════════════════════════════════════════════════════════ */

const PPS = 74 /* pixels per second */

export const initBands = () => {
  const loops: gsap.core.Tween[] = []
  const byBand = new Map<Element, gsap.core.Tween[]>()

  document.querySelectorAll<HTMLElement>('[data-band-row]').forEach((row) => {
    const set = row.querySelector<HTMLElement>('[data-band-set]')
    if (!set) return

    /* clone whole sets until the row covers two viewports — the loop
       travels exactly one set width, so the seam never shows */
    const unit = set.scrollWidth
    if (unit < 8) return
    const need = Math.ceil((window.innerWidth * 2) / unit) + 1
    for (let i = 1; i < need; i++) row.appendChild(set.cloneNode(true))

    const speed = parseFloat(row.dataset.speed || '1')
    const dir = speed < 0 ? -1 : 1
    const dur = unit / (PPS * Math.abs(speed))

    const loop = gsap.fromTo(
      row,
      { x: dir > 0 ? 0 : -unit },
      { x: dir > 0 ? -unit : 0, duration: dur, ease: 'none', repeat: -1, paused: true }
    )
    loops.push(loop)

    const band = row.closest('[data-band]')
    if (band) {
      const list = byBand.get(band) || []
      list.push(loop)
      byBand.set(band, list)
    }
  })

  /* under reduced motion the loops are built but never played, so the
     tape is simply typeset in place rather than blank */
  if (prefersReduced()) return

  /* play only what is on screen */
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const list = byBand.get(entry.target)
        if (!list) continue
        for (const loop of list) entry.isIntersecting ? loop.play() : loop.pause()
      }
    },
    { rootMargin: '20% 0px' }
  )
  byBand.forEach((_, band) => io.observe(band))

  /* one persistent quickTo drives every row's timeScale together */
  const proxy = { rate: 1 }
  const rateTo = gsap.quickTo(proxy, 'rate', {
    duration: 0.4,
    ease: 'power2.out',
    onUpdate: () => {
      for (let i = 0; i < loops.length; i++) loops[i].timeScale(proxy.rate)
    },
  })
  let reset: gsap.core.Tween | null = null

  /* urgent state — guarded so the class only flips on an actual change,
     not on every scroll frame (an unguarded toggle marks style dirty
     every tick even when the value is unchanged) */
  const bands = Array.from(byBand.keys())
  let urgent = false
  let calmCall: gsap.core.Tween | null = null
  const setUrgent = (on: boolean) => {
    if (on === urgent) return
    urgent = on
    for (const b of bands) b.classList.toggle('-urgent', on)
  }

  onScroll(({ velocity }) => {
    const v = Math.min(Math.abs(velocity), 44)
    rateTo(1 + v * 0.34)
    reset?.kill()
    reset = gsap.delayedCall(0.6, () => rateTo(1))

    if (v > 16) {
      setUrgent(true)
      calmCall?.kill()
      calmCall = gsap.delayedCall(0.45, () => setUrgent(false))
    }
  })
}
