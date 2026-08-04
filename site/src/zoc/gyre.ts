import { gsap } from 'gsap'

/* Faithful port of ZOCCON's c-gyre (class jT):
   base img + 3 clones; clones 1/2 rest at 33%/66% of a
   rotate(19.495deg)+scale(.5146) linear tween; clone 3 plays
   the full timeline on hover by tweening its time. Arrow
   appears via clip-path circle after a short delay. */

const SCALE = 0.5146
const ROT = 19.495

export const initGyres = () => {
  document.querySelectorAll<HTMLElement>('[data-gyre]').forEach((el) => {
    const inner = el.querySelector<HTMLElement>('.c-gyre__inner')
    const imgBase = el.querySelector<HTMLElement>('.c-gyre__img')
    const arrow = el.querySelector<HTMLElement>('.c-gyre__arrow')
    if (!inner || !imgBase) return

    const clone1 = imgBase.cloneNode(true) as HTMLElement
    const clone2 = imgBase.cloneNode(true) as HTMLElement
    const clone3 = imgBase.cloneNode(true) as HTMLElement
    ;[clone1, clone2, clone3].forEach((c) => {
      c.setAttribute('aria-hidden', 'true')
      inner.appendChild(c)
    })

    const tw1a = gsap.to(clone1, { duration: 1, ease: 'linear', rotate: ROT, scale: SCALE, paused: true })
    const tw2a = gsap.to(clone2, { duration: 1, ease: 'linear', rotate: ROT, scale: SCALE, paused: true })
    const twHover = gsap
      .timeline({ paused: true })
      .to(clone3, { duration: 1, ease: 'power1.inOut', rotate: ROT })
      .to(clone3, { duration: 1, ease: 'power1.inOut', scale: SCALE }, '<')
    tw1a.progress(0.333)
    tw2a.progress(0.666)

    /* -live promotes the imgs only while a hover tween is actually
       running; at rest they're static so the layers are released.
       The isTweening guard survives rapid enter/leave races. */
    const release = () => {
      if (!gsap.isTweening(twHover)) inner.classList.remove('-live')
    }
    let hoverInt: gsap.core.Tween | null = null
    inner.addEventListener('mouseenter', () => {
      inner.classList.add('-live')
      gsap.to(twHover, { time: twHover.duration(), duration: 0.8, ease: 'power1.out', onComplete: release })
      hoverInt && hoverInt.kill()
      hoverInt = gsap.delayedCall(0.8 * 0.45, () => arrow && arrow.classList.add('-show'))
    })
    inner.addEventListener('mouseleave', () => {
      inner.classList.add('-live')
      gsap.to(twHover, { time: 0, duration: 0.6, ease: 'power1.out', overwrite: true, onComplete: release })
      hoverInt && hoverInt.kill()
      arrow && arrow.classList.remove('-show')
    })
  })
}
