import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)
;(window as unknown as { __ST: typeof ScrollTrigger }).__ST = ScrollTrigger

/* V3 scroll choreography:
   - lookbook pinned horizontal gallery + per-figure parallax + progress
   - hero layered parallax on scroll-out
   - marquee scroll-scrubbed drift (parent, so CSS loop keeps running)
   - store ram rotation scrub */

export const initScrollFX = () => {
  /* ALL pinned/scrub section choreography lives in ONE matchMedia block,
     created in DOCUMENT ORDER (story → lookbook → drop → tribe → store).
     Pin spacers must exist before later triggers are measured — splitting
     this across mm.add blocks left the lookbook pin with a stale start
     (1900px short = story spacer height), making both pins overlap. */
  const mm = gsap.matchMedia()
  mm.add('(min-width: 901px)', () => {
    initStoryPin()
    initLookbookPin()
    initDropCascade()
    initTribeFan()
    initStoreSlides()
  })

  /* ── HERO: layered parallax on scroll-out ── */
  gsap.to('.p-hero__title', {
    yPercent: -16, ease: 'none',
    scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true },
  })
  gsap.to('.p-hero__mascot', {
    yPercent: 14, rotate: 2, ease: 'none',
    scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true },
  })
  gsap.to('.p-hero__eyebrow', {
    yPercent: -60, opacity: 0, ease: 'none',
    scrollTrigger: { trigger: '#hero', start: 'top top', end: '55% top', scrub: true },
  })

  /* ── MARQUEES: scroll-scrubbed drift on the inner (CSS anim owns the set) ── */
  document.querySelectorAll<HTMLElement>('.c-marquee').forEach((el, i) => {
    const inner = el.querySelector<HTMLElement>('.c-marquee__inner')
    if (!inner) return
    gsap.fromTo(
      inner,
      { x: i % 2 === 0 ? -90 : 90 },
      {
        x: i % 2 === 0 ? 90 : -90,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 1.2 },
      }
    )
  })

  /* ── STORE RAM: rotation scrub ── */
  const ram = document.querySelector('[data-scrub-rotate]')
  if (ram) {
    gsap.fromTo(ram, { rotate: -40 }, {
      rotate: 40, ease: 'none',
      scrollTrigger: { trigger: '#store', start: 'top bottom', end: 'bottom top', scrub: 1 },
    })
  }

  /* ── SECTION HEADS: slight drift so pages never sit still ── */
  gsap.utils.toArray<HTMLElement>('.sec-head__title .tt').forEach((tt) => {
    gsap.fromTo(tt, { y: 26 }, {
      y: -26, ease: 'none',
      scrollTrigger: { trigger: tt.closest('.p-section') || tt, start: 'top bottom', end: 'bottom top', scrub: 1.3 },
    })
  })

}

/* ── STORY: pinned manifesto — lines, marker wipe, fact cascade,
      porch clip-reveal, drifting outline word ── */
const initStoryPin = () => {
  const storyPin = document.getElementById('story-pin')
  if (!storyPin) return
  const lines = gsap.utils.toArray<HTMLElement>('[data-ln]')
  const bodies = gsap.utils.toArray<HTMLElement>('[data-body]')
  const facts = gsap.utils.toArray<HTMLElement>('[data-fact]')
  const img = storyPin.querySelector<HTMLElement>('[data-story-img]')
  const badge = storyPin.querySelector<HTMLElement>('[data-badge]')
  const bgword = storyPin.querySelector<HTMLElement>('.story-bgword')

  gsap.set(lines, { yPercent: 120 })
  gsap.set(bodies, { opacity: 0 })
  gsap.set(facts, { opacity: 0 })
  if (img) gsap.set(img, { clipPath: 'inset(0 0 100% 0)', rotate: 5 })
  if (badge) gsap.set(badge, { opacity: 0, y: 40, scale: 0.5 })
  if (bgword) gsap.set(bgword, { xPercent: 10 })

  /* pre-pin: lede + bodies reveal while the section approaches,
     so there's no dead zone before the pin engages */
  const pre = gsap.timeline({
    defaults: { ease: 'power2.out' },
    scrollTrigger: { trigger: storyPin, start: 'top 88%', end: 'top 30%', scrub: 1 },
  })
  if (lines[0]) pre.fromTo(lines[0], { yPercent: 120 }, { yPercent: 0, duration: 0.3 }, 0)
  if (lines[1]) pre.fromTo(lines[1], { yPercent: 120 }, { yPercent: 0, duration: 0.3 }, 0.12)
  bodies.forEach((b, i) => {
    pre.fromTo(b,
      { x: b.dataset.body === 'l' ? -80 : 80, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.35 }, 0.25 + i * 0.2)
  })

  /* pinned: marker wipe, fact cascade, porch clip-reveal, badge pop, bgword drift */
  const tl = gsap.timeline({
    defaults: { ease: 'power2.out' },
    scrollTrigger: {
      trigger: storyPin,
      start: 'top top',
      end: '+=1900',
      pin: true,
      anticipatePin: 1,
      scrub: 1,
      invalidateOnRefresh: true,
    },
  })

  if (lines[1]) tl.fromTo(lines[1], { backgroundSize: '0% 66%' }, { backgroundSize: '100% 66%', duration: 0.18, ease: 'power1.inOut' }, 0)

  facts.forEach((f, i) => {
    tl.fromTo(f,
      { x: f.dataset.fact === 'l' ? -60 : 60, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.12 }, 0.14 + i * 0.07)
  })

  if (img) {
    tl.fromTo(img,
      { clipPath: 'inset(0 0 100% 0)', rotate: 5 },
      { clipPath: 'inset(0 0 0% 0)', rotate: 0, duration: 0.42, ease: 'power1.inOut' }, 0.1)
  }
  if (badge) tl.fromTo(badge,
    { opacity: 0, y: 40, scale: 0.5 },
    { opacity: 1, y: 0, scale: 1, duration: 0.18, ease: 'back.out(1.7)' }, 0.55)
  if (bgword) tl.fromTo(bgword, { xPercent: 10 }, { xPercent: -16, duration: 1, ease: 'none' }, 0)
}

/* ── LOOKBOOK: pinned horizontal gallery + per-figure parallax + progress ── */
const initLookbookPin = () => {
  const pin = document.getElementById('lookbook-pin')
  const track = document.getElementById('lookbook-track')
  if (!pin || !track) return

  const dist = () => track.scrollWidth - window.innerWidth + 40
  const count = document.getElementById('lb-count')
  const bar = document.getElementById('lb-bar-fill')

  /* textContent writes force re-layout even when the value didn't change —
     cache it. The bar fill is a composite-only scaleX (see .lb-bar i CSS). */
  let lastIdx = -1

  gsap.to(track, {
    x: () => -dist(),
    ease: 'none',
    scrollTrigger: {
      trigger: pin,
      start: 'top top',
      end: () => `+=${dist()}`,
      pin: true,
      anticipatePin: 1,
      scrub: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const p = self.progress
        const idx = Math.min(6, Math.max(1, Math.floor(p * 5.999) + 1))
        if (count && idx !== lastIdx) {
          lastIdx = idx
          count.textContent = String(idx).padStart(2, '0')
        }
        if (bar) bar.style.transform = `scaleX(${p})`
      },
    },
  })

  gsap.utils.toArray<HTMLElement>('[data-lb-parallax]').forEach((fig) => {
    const amt = parseFloat(fig.dataset.lbParallax || '0')
    gsap.to(fig, {
      y: amt * 6,
      rotate: amt * 0.14,
      ease: 'none',
      scrollTrigger: {
        trigger: pin,
        start: 'top top',
        end: () => `+=${dist()}`,
        scrub: 1.4,
      },
    })
  })
}

/* ── DROP: scrub cascade — cards fly in with alternating rotation,
      stickers stamp on with overshoot ── */
const initDropCascade = () => {
  const drop = document.getElementById('drop')
  const cards = gsap.utils.toArray<HTMLElement>('[data-product-card]')
  if (!drop || !cards.length) return
  cards.forEach((c, i) => {
    gsap.set(c, { y: 160, rotate: i % 2 === 0 ? -6 : 6, opacity: 0 })
    const sticker = c.querySelector<HTMLElement>('.product__sticker')
    if (sticker) gsap.set(sticker, { scale: 2.4, rotate: -20, opacity: 0 })
  })
  const tl = gsap.timeline({
    defaults: { ease: 'power2.out' },
    scrollTrigger: { trigger: drop, start: 'top 78%', end: 'top 18%', scrub: 1 },
  })
  cards.forEach((c, i) => {
    tl.to(c, { y: 0, rotate: 0, opacity: 1, duration: 0.5 }, i * 0.12)
    const sticker = c.querySelector<HTMLElement>('.product__sticker')
    if (sticker) tl.to(sticker, { scale: 1, rotate: 12, opacity: 1, duration: 0.28, ease: 'back.out(2.2)' }, i * 0.12 + 0.34)
  })
}

/* ── TRIBE: fan-out from stacked center ── */
const initTribeFan = () => {
  const tribe = document.getElementById('tribe')
  const grid = tribe?.querySelector<HTMLElement>('.p-tribe__grid')
  const tcards = gsap.utils.toArray<HTMLElement>('.tribe-card')
  if (!tribe || !grid || !tcards.length) return
  const tl = gsap.timeline({
    defaults: { ease: 'power2.out' },
    scrollTrigger: { trigger: tribe, start: 'top 80%', end: 'top 25%', scrub: 1, invalidateOnRefresh: true },
  })
  tcards.forEach((c, i) => {
    tl.fromTo(c,
      {
        x: () => {
          const gr = grid.getBoundingClientRect()
          const cr = c.getBoundingClientRect()
          return gr.left + gr.width / 2 - (cr.left + cr.width / 2)
        },
        y: 100,
        rotate: (i - 1.5) * 5,
        opacity: 0,
      },
      { x: 0, y: 0, rotate: 0, opacity: 1, duration: 0.55 }, i * 0.1)
  })
}

/* ── STORE: alternating side slides ── */
const initStoreSlides = () => {
  const store = document.getElementById('store')
  const cols = gsap.utils.toArray<HTMLElement>('[data-store-col]')
  if (!store || !cols.length) return
  const tl = gsap.timeline({
    defaults: { ease: 'power2.out' },
    scrollTrigger: { trigger: store, start: 'top 78%', end: 'top 22%', scrub: 1 },
  })
  cols.forEach((c, i) => {
    tl.fromTo(c,
      { x: i % 2 === 0 ? -130 : 130, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.5 }, i * 0.11)
  })
}
