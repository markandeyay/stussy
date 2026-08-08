import { onScroll } from '../core/scroll'

/* ═══════════════════════════════════════════════════════════════════
   CHROME — header auto-hide, chapter rail, page-top, active nav.

   All four read from the single scroll broadcast. Every class write is
   guarded by a state flip: calling classList.toggle with the class
   already in its target state still marks the element style-dirty, so
   an unguarded toggle in a scroll handler costs a style recalc on
   every frame of every scroll.
   ═══════════════════════════════════════════════════════════════════ */

export const initChrome = () => {
  const header = document.getElementById('header')
  const pagetop = document.getElementById('pagetop')
  const railFill = document.getElementById('rail-fill')
  const railIdx = document.getElementById('rail-idx')
  const railName = document.getElementById('rail-name')

  let hidden = false
  let topShown = false
  let lastY = 0

  onScroll(({ y, progress }) => {
    if (header) {
      const hide = y > lastY && y > 180
      if (hide !== hidden) {
        hidden = hide
        header.classList.toggle('-hidden', hide)
      }
    }
    if (pagetop) {
      const show = y > window.innerHeight * 1.1
      if (show !== topShown) {
        topShown = show
        pagetop.classList.toggle('-show', show)
      }
    }
    if (railFill) railFill.style.transform = `scaleY(${progress.toFixed(4)})`
    lastY = y
  })

  /* Active scene: an observer beats measuring every section on every
     scroll frame, and the 45%-band root margin makes the handoff land
     when a section actually owns the screen. */
  const scenes = Array.from(document.querySelectorAll<HTMLElement>('[data-scene]'))
  const navLinks = new Map<string, HTMLElement>()
  document.querySelectorAll<HTMLElement>('[data-navlink]').forEach((a) => {
    navLinks.set(a.dataset.navlink!, a)
  })

  let current = ''
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const el = entry.target as HTMLElement
        const id = el.id
        if (id === current) continue
        current = id
        if (railIdx) railIdx.textContent = el.dataset.idx || '00'
        if (railName) railName.textContent = el.dataset.name || ''
        navLinks.forEach((a, key) => a.classList.toggle('-active', key === id))
      }
    },
    { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
  )
  scenes.forEach((s) => io.observe(s))
}
