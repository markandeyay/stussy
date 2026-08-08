import { canHover, prefersReduced } from '../core/motion'

/* ═══════════════════════════════════════════════════════════════════
   CURSOR — a ring that lags the pointer and names what it is over.

   The rAF loop only runs while the ring is actually catching up. Once
   it lands within half a pixel of the pointer the loop stops dead, so
   an idle cursor costs literally nothing. Colour inverts over dark
   surfaces via the [data-cursor-invert] hook on the section.
   ═══════════════════════════════════════════════════════════════════ */

const LERP = 0.19

export const initCursor = () => {
  const el = document.getElementById('cursor')
  const label = document.getElementById('cursor-label')
  if (!el || !label || !canHover() || prefersReduced()) return

  let tx = window.innerWidth / 2
  let ty = window.innerHeight / 2
  let x = tx
  let y = ty
  let raf = 0

  const frame = () => {
    x += (tx - x) * LERP
    y += (ty - y) * LERP
    el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`
    if (Math.abs(tx - x) < 0.5 && Math.abs(ty - y) < 0.5) {
      x = tx
      y = ty
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`
      raf = 0
      return
    }
    raf = requestAnimationFrame(frame)
  }

  const wake = () => {
    if (!raf) raf = requestAnimationFrame(frame)
  }

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return
    tx = e.clientX
    ty = e.clientY
    el.classList.add('-on')
    wake()
  }, { passive: true })

  document.addEventListener('pointerleave', () => el.classList.remove('-on'))

  /* Delegated: one listener for the whole document instead of two per
     target, and it keeps working for anything added later. */
  document.addEventListener('pointerover', (e) => {
    const t = (e.target as HTMLElement)?.closest<HTMLElement>('[data-cursor], a, button')
    if (!t) return
    const text = t.dataset.cursor
    el.classList.add('-hot')
    label.textContent = text || ''
    el.classList.toggle('-invert', !!t.closest('.t-navy, .t-ink, .footer'))
  })

  document.addEventListener('pointerout', (e) => {
    const t = (e.target as HTMLElement)?.closest<HTMLElement>('[data-cursor], a, button')
    if (!t) return
    const to = (e.relatedTarget as HTMLElement)?.closest?.('[data-cursor], a, button')
    if (to === t) return
    el.classList.remove('-hot')
    label.textContent = ''
  })
}
