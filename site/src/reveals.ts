import { gsap } from 'gsap'

/* Split helpers: letters get .glw>.gl clip-roll spans, words get
   .wdw>.wd stagger spans. Delays carried by --gd/--wd custom props. */

const splitLetters = (el: HTMLElement) => {
  let idx = 0
  const walk = (node: Node) => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent || ''
        const frag = document.createDocumentFragment()
        for (const ch of text) {
          if (ch === ' ') {
            frag.appendChild(document.createTextNode(' '))
            continue
          }
          const w = document.createElement('span')
          w.className = 'glw'
          const g = document.createElement('span')
          g.className = 'gl'
          g.textContent = ch
          g.style.setProperty('--gd', `${idx * 26}ms`)
          idx++
          w.appendChild(g)
          frag.appendChild(w)
        }
        node.replaceChild(frag, child)
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        walk(child)
      }
    })
  }
  walk(el)
}

const splitWords = (el: HTMLElement) => {
  const text = el.textContent || ''
  el.textContent = ''
  text.split(/\s+/).filter(Boolean).forEach((word, i) => {
    const w = document.createElement('span')
    w.className = 'wdw'
    const g = document.createElement('span')
    g.className = 'wd'
    g.textContent = word
    g.style.setProperty('--wd', `${Math.min(i * 30, 600)}ms`)
    w.appendChild(g)
    el.appendChild(w)
    el.appendChild(document.createTextNode(' '))
  })
}

export const initReveals = () => {
  document.querySelectorAll<HTMLElement>('[data-split-letters]').forEach(splitLetters)
  document.querySelectorAll<HTMLElement>('[data-split-words]').forEach(splitWords)

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        const el = entry.target as HTMLElement
        el.classList.add('-inview')
        io.unobserve(el)
        /* will-change only needs to live while the reveal transition runs;
           afterwards -anim-done releases the compositor layers (the glyphs
           are static from then on, so nothing repaints differently). The
           split targets are usually DESCENDANTS of the observed element. */
        const letterHosts: HTMLElement[] = el.hasAttribute('data-split-letters') ? [el] : []
        el.querySelectorAll<HTMLElement>('[data-split-letters]').forEach((sp) => letterHosts.push(sp))
        if (letterHosts.length) {
          let maxN = 0
          letterHosts.forEach((sp) => {
            maxN = Math.max(maxN, sp.querySelectorAll('.gl').length)
          })
          gsap.delayedCall((maxN * 26 + 1100) / 1000 + 0.15, () => el.classList.add('-anim-done'))
        }
        if (el.hasAttribute('data-split-words') || el.querySelector('[data-split-words]')) {
          gsap.delayedCall(0.6 + 0.85 + 0.15, () => el.classList.add('-anim-done'))
        }
      })
    },
    { threshold: 0.15, rootMargin: '0px 0px -6% 0px' }
  )

  document.querySelectorAll<HTMLElement>('[data-inview], [data-inview-head], .p-footer__word').forEach((el) => {
    const parent = el.parentElement
    if (parent && el.hasAttribute('data-inview') && !el.hasAttribute('data-split-words')) {
      const siblings = Array.from(parent.querySelectorAll('[data-inview]'))
      if (siblings.length > 1) {
        const idx = siblings.indexOf(el)
        el.style.transitionDelay = `${Math.min(idx * 90, 450)}ms`
      }
    }
    io.observe(el)
  })

  gsap.set('[data-hero]', { opacity: 0, y: 60 })
  gsap.set('[data-hero-fade]', { opacity: 0 })
}

export const heroIntro = () => {
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
  tl.to('.hero-logo[data-hero]', { opacity: 1, y: 0, duration: 1.1, rotate: -2 }, 0)
  tl.to('.hero-tag[data-hero]', { opacity: 1, y: 0, duration: 0.9 }, 0.5)
  tl.to('.p-hero__mascot[data-hero]', {
    opacity: 1, y: 0, duration: 1.35, ease: 'back.out(1.35)',
  }, 0.3)
  tl.to('[data-hero-fade]', { opacity: 1, duration: 1 }, 0.75)

  gsap.to('.p-hero__mascot', {
    y: -16, rotation: 1.4, duration: 3.4,
    ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1.9,
  })
}
