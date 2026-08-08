import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { EASE, DUR, onDesktop, prefersReduced } from './core/motion'

/* ═══════════════════════════════════════════════════════════════════
   SCENES — scroll choreography, one scene per section.

   THREE RULES, ENFORCED THROUGHOUT
   1. Transform and opacity only. Nothing here animates a property that
      can trigger layout.
   2. Exactly ONE pin on the page — the lookbook. The previous build
      pinned the story for 1900px and then the lookbook right after it,
      which is both slow to scroll through and the source of the
      double-pin jump that had to be debugged twice. The story now does
      its work in a plain scrub over its own height.
   3. Everything pinned or scrubbed is created inside a single
      matchMedia scope, in document order, so pin spacers exist before
      later triggers measure against them.
   ═══════════════════════════════════════════════════════════════════ */

/* Hidden-by-default states are applied in JS, never in CSS, so a JS
   failure leaves a fully readable page instead of an empty one. */
export const prepareScenes = () => {
  if (prefersReduced()) return
  gsap.set('[data-hero]', { opacity: 0, y: 44 })
  gsap.set('#hero-mark', { opacity: 0, y: 60, rotate: -7, scale: 1.08 })
  gsap.set('[data-hero-fade]', { opacity: 0 })
  gsap.set('.hero__eyebrow .ln', { scaleX: 0, transformOrigin: '0 50%' })
  gsap.set('.hero__mascot .badge', { opacity: 0, scale: 0.4, rotate: -90 })
  gsap.set('.hero__side', { opacity: 0, y: 40 })
}

/* The curtain lifts onto a page that then assembles itself. Beats are
   deliberately overlapped rather than sequential — a strict queue reads
   as a slideshow; overlapping reads as one movement. */
export const heroIntro = () => {
  if (prefersReduced()) return

  const tl = gsap.timeline({ defaults: { ease: EASE.out } })

  tl.to('#hero-mark', { opacity: 1, y: 0, rotate: -2, scale: 1, duration: 1.25 }, 0)
    /* masthead rules draw out from the labels */
    .to('.hero__eyebrow .ln', { scaleX: 1, duration: 1.1, stagger: 0.09 }, 0.18)
    .to('.hero__mascot[data-hero]', { opacity: 1, y: 0, duration: 1.35, ease: EASE.snap }, 0.2)
    /* the badge unwinds into place rather than fading on */
    .to('.hero__mascot .badge', {
      opacity: 1, scale: 1, rotate: 0, duration: 1.1, ease: EASE.snap,
    }, 0.62)
    .to('.hero__tag[data-hero]', { opacity: 1, y: 0, duration: DUR.d4 }, 0.5)
    .to('[data-hero-fade]', { opacity: 1, duration: DUR.d4, stagger: 0.1 }, 0.56)
    .to('.hero__side', { opacity: 0.55, y: 0, duration: DUR.d4 }, 0.9)

  /* the mascot keeps breathing after the intro lands */
  gsap.to('.hero__mascot', {
    y: -14, rotate: 1.2, duration: 3.6,
    ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 2,
  })
}

export const initScenes = () => {
  if (prefersReduced()) return

  /* ── ambient parallax (all breakpoints, all cheap) ──────────── */
  gsap.to('.hero__lockup', {
    yPercent: -14, ease: EASE.linear,
    scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true },
  })
  gsap.to('.hero__mascot', {
    yPercent: 16, ease: EASE.linear,
    scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true },
  })
  gsap.to('.hero__eyebrow', {
    yPercent: -70, opacity: 0, ease: EASE.linear,
    scrollTrigger: { trigger: '#hero', start: 'top top', end: '58% top', scrub: true },
  })

  const ghost = document.querySelector('.story__ghost')
  if (ghost) {
    gsap.fromTo(ghost, { xPercent: 8 }, {
      xPercent: -20, ease: EASE.linear,
      scrollTrigger: { trigger: '#story', start: 'top bottom', end: 'bottom top', scrub: 1.1 },
    })
  }

  const ram = document.querySelector('[data-spin]')
  if (ram) {
    gsap.fromTo(ram, { rotate: -32 }, {
      rotate: 32, ease: EASE.linear,
      scrollTrigger: { trigger: '#store', start: 'top bottom', end: 'bottom top', scrub: 1 },
    })
  }

  /* ── desktop choreography, single scope, document order ─────── */
  onDesktop(() => {
    storyScene()
    lookbookScene()
    dropScene()
    tribeScene()
    storeScene()
  })
}

/* ── SEC 01 — the manifesto assembles as you pass it ──────────── */
const storyScene = () => {
  const root = document.getElementById('story-pin')
  if (!root) return

  const lines = gsap.utils.toArray<HTMLElement>('[data-ln]')
  const bodies = gsap.utils.toArray<HTMLElement>('[data-body]')
  const facts = gsap.utils.toArray<HTMLElement>('[data-fact]')
  const media = root.querySelector<HTMLElement>('[data-story-media]')
  const badge = root.querySelector<HTMLElement>('[data-badge]')

  const tl = gsap.timeline({
    defaults: { ease: EASE.out },
    scrollTrigger: {
      trigger: root,
      start: 'top 82%',
      end: 'bottom 68%',
      scrub: 0.9,
      invalidateOnRefresh: true,
    },
  })

  lines.forEach((ln, i) => {
    tl.fromTo(ln, { yPercent: 118 }, { yPercent: 0, duration: 0.3 }, i * 0.09)
  })

  /* the highlighter travels across the words */
  if (lines[1]) {
    tl.fromTo(lines[1],
      { backgroundSize: '0% 62%' },
      { backgroundSize: '100% 62%', duration: 0.26, ease: 'power1.inOut' }, 0.3)
  }

  bodies.forEach((b, i) => {
    tl.fromTo(b,
      { x: b.dataset.body === 'l' ? -46 : 46, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.3 }, 0.34 + i * 0.12)
  })

  if (media) {
    tl.fromTo(media,
      { clipPath: 'inset(0 0 100% 0)', rotate: 3.5, transformOrigin: '50% 100%' },
      { clipPath: 'inset(0 0 0% 0)', rotate: 0, duration: 0.46, ease: 'power2.inOut' }, 0.18)
  }
  if (badge) {
    tl.fromTo(badge,
      { opacity: 0, scale: 0.4, y: 26 },
      { opacity: 1, scale: 1, y: 0, duration: 0.24, ease: EASE.snap }, 0.62)
  }

  /* the last fact has to land well before the trigger ends, or the
     bottom row only fills once the section is already leaving */
  facts.forEach((f, i) => {
    tl.fromTo(f,
      { x: f.dataset.fact === 'l' ? -34 : 34, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.14 }, 0.48 + i * 0.06)
  })
}

/* ── SEC 02 — the one pin on the page ─────────────────────────── */
const lookbookScene = () => {
  const pin = document.getElementById('lookbook-pin')
  const track = document.getElementById('lookbook-track')
  if (!pin || !track) return

  const cur = document.getElementById('lb-cur')
  const fill = document.getElementById('lb-fill')
  const shots = gsap.utils.toArray<HTMLElement>('[data-drift]')
  const total = shots.length

  const distance = () => Math.max(0, track.scrollWidth - window.innerWidth + 40)

  /* Entrance: the roll deals itself out before the pin takes over.
     Shots arrive from a loose stack — falling, rotating and scaling
     into place — so the gallery assembles rather than simply being
     there. Fires once, on approach, well before the pin engages. */
  gsap.fromTo(shots,
    {
      y: (i: number) => 70 + i * 28,
      rotate: (i: number) => (i % 2 ? 8 : -8) - i * 0.7,
      scale: 0.84,
      opacity: 0,
    },
    {
      y: 0, rotate: 0, scale: 1, opacity: 1,
      duration: 0.95, ease: EASE.out, stagger: 0.08,
      scrollTrigger: { trigger: pin, start: 'top 90%', once: true },
    })

  /* textContent writes force a re-layout even when the value is
     unchanged, so the counter only writes on an actual step */
  let lastIdx = -1

  gsap.to(track, {
    x: () => -distance(),
    ease: EASE.linear,
    scrollTrigger: {
      trigger: pin,
      start: 'top top',
      end: () => `+=${distance()}`,
      pin: true,
      anticipatePin: 1,
      scrub: 0.8,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const p = self.progress
        const idx = Math.min(total, Math.floor(p * (total - 0.001)) + 1)
        if (cur && idx !== lastIdx) {
          lastIdx = idx
          cur.textContent = String(idx).padStart(2, '0')
        }
        if (fill) fill.style.transform = `scaleX(${p.toFixed(4)})`
      },
    },
  })

  /* The drift shares y/rotate with the entrance above, so it declares
     its own start explicitly and defers rendering. Without
     immediateRender:false a scrubbed fromTo paints its start state the
     moment it is created, which would flatten the entrance's stack
     before the user ever reaches the section. */
  shots.forEach((fig) => {
    const amt = parseFloat(fig.dataset.drift || '0')
    gsap.fromTo(fig,
      { y: 0, rotate: 0 },
      {
        y: amt * 5.5,
        rotate: amt * 0.1,
        ease: EASE.linear,
        immediateRender: false,
        scrollTrigger: {
          trigger: pin,
          start: 'top top',
          end: () => `+=${distance()}`,
          scrub: 1.2,
        },
      })
  })
}

/* ── SEC 03 — the rack fills, then the stamps land ────────────── */
const dropScene = () => {
  const cards = gsap.utils.toArray<HTMLElement>('[data-product]')
  if (!cards.length) return

  const tl = gsap.timeline({
    defaults: { ease: EASE.out },
    scrollTrigger: { trigger: '#drop', start: 'top 76%', end: 'top 14%', scrub: 0.9 },
  })

  cards.forEach((card, i) => {
    tl.fromTo(card,
      { y: 110, rotate: i % 2 === 0 ? -4 : 4, opacity: 0 },
      { y: 0, rotate: 0, opacity: 1, duration: 0.46 }, i * 0.1)

    const stamp = card.querySelector<HTMLElement>('[data-stamp]')
    if (stamp) {
      tl.fromTo(stamp,
        { scale: 2.2, rotate: -34, opacity: 0 },
        { scale: 1, rotate: -11, opacity: 1, duration: 0.26, ease: EASE.snap }, i * 0.1 + 0.3)
    }
  })
}

/* ── SEC 04 — cards deal in from the deck ─────────────────────── */
const tribeScene = () => {
  const cards = gsap.utils.toArray<HTMLElement>('[data-tribe]')
  if (!cards.length) return

  gsap.fromTo(cards,
    { y: 90, rotate: (i: number) => (i - 1.5) * 3.2, opacity: 0 },
    {
      y: 0, rotate: 0, opacity: 1, duration: 0.5, ease: EASE.out, stagger: 0.09,
      scrollTrigger: { trigger: '#tribe', start: 'top 78%', end: 'top 26%', scrub: 0.9 },
    })
}

/* ── SEC 05 — columns slide in from alternating sides ─────────── */
const storeScene = () => {
  const cols = gsap.utils.toArray<HTMLElement>('[data-store]')
  if (!cols.length) return

  gsap.fromTo(cols,
    { x: (i: number) => (i % 2 === 0 ? -80 : 80), opacity: 0 },
    {
      x: 0, opacity: 1, duration: 0.5, ease: EASE.out, stagger: 0.09,
      scrollTrigger: { trigger: '#store', start: 'top 76%', end: 'top 20%', scrub: 0.9 },
    })
}

export const refreshScenes = () => ScrollTrigger.refresh()
