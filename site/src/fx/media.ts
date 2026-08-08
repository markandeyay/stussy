import { gsap } from 'gsap'
import { EASE, canHover, prefersReduced } from '../core/motion'

/* ═══════════════════════════════════════════════════════════════════
   MEDIA — the fanning image stack.

   Two ghost copies sit exactly behind the photo at rest (identity
   transform = invisible) and fan out on hover, so the still frame is
   completely clean and the motion appears from nowhere.

   The ghosts are built ONLY when the device actually has a fine
   pointer. On touch they would be two extra decoded layers per photo —
   with 11 photos on this page that is 22 layers nobody can ever
   trigger. The old build cloned three copies unconditionally.
   ═══════════════════════════════════════════════════════════════════ */

const ROT = 8.5
const SCALE = 0.86

export const initMedia = () => {
  if (!canHover() || prefersReduced()) return

  document.querySelectorAll<HTMLElement>('[data-media]').forEach((el) => {
    const frame = el.querySelector<HTMLElement>('.media__frame')
    const base = frame?.querySelector<HTMLImageElement>('.media__img')
    if (!frame || !base) return

    const ghosts: HTMLElement[] = []
    for (let i = 0; i < 2; i++) {
      const g = base.cloneNode(true) as HTMLImageElement
      g.setAttribute('aria-hidden', 'true')
      g.removeAttribute('alt')
      g.alt = ''
      g.loading = 'lazy'
      /* inserted BEFORE the base so paint order puts them behind it */
      frame.insertBefore(g, base)
      ghosts.push(g)
    }

    const settle = () => {
      if (!gsap.isTweening(ghosts)) frame.classList.remove('-live')
    }

    const enter = () => {
      frame.classList.add('-live')
      gsap.to(ghosts, {
        rotate: (i: number) => ROT * (i + 1) * (i % 2 ? -1 : 1),
        scale: (i: number) => 1 - (1 - SCALE) * (i + 1),
        duration: 0.7,
        ease: EASE.out,
        stagger: 0.05,
        overwrite: 'auto',
        onComplete: settle,
      })
    }

    const leave = () => {
      frame.classList.add('-live')
      gsap.to(ghosts, {
        rotate: 0,
        scale: 1,
        duration: 0.5,
        ease: EASE.out,
        overwrite: 'auto',
        onComplete: settle,
      })
    }

    frame.addEventListener('pointerenter', enter)
    frame.addEventListener('pointerleave', leave)
  })
}
