import { gsap } from 'gsap'

/* Port of ZOCCON's p-top-loading sequence:
   black screen + catch, kf-loading rotateY letters (CSS),
   exit via clip-path inset(0 0 100% 0) with cubic-bezier(.77,0,.175,1). */

export const runLoader = (onDone: () => void) => {
  const loader = document.getElementById('loader')
  if (!loader) {
    onDone()
    return
  }

  const minTime = new Promise<void>((res) => gsap.delayedCall(1.5, res))
  const fonts = document.fonts ? document.fonts.ready : Promise.resolve()

  Promise.all([minTime, fonts]).then(() => {
    loader.classList.add('-loading-end')
    gsap.delayedCall(0.45, onDone)
    gsap.delayedCall(1.1, () => {
      loader.classList.add('-hide')
      gsap.delayedCall(0.3, () => loader.remove())
    })
  })
}
