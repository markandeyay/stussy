import './style.css'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { initSmooth, scrollToTarget, onVelocity } from './smooth'
import { runLoader } from './loader'
import { initMarquees } from './marquee'
import { initReveals, heroIntro } from './reveals'
import { Transition } from './zoc/transition'
import { initTypo } from './zoc/typo'
import { initGyres } from './zoc/gyre'
import { initScrollFX } from './scrollfx'

gsap.registerPlugin(ScrollTrigger)

const boot = () => {
  initSmooth()

  const transition = new Transition('transition')
  const typo = initTypo()

  const marqueeApi = initMarquees()
  onVelocity((v) => {
    marqueeApi.push(v)
    typo && typo.velocity(v)
  })

  initGyres()
  initReveals()
  initScrollFX()

  /* nav: stripe wipe over, jump to anchor while covered, wipe away */
  document.querySelectorAll<HTMLAnchorElement>('[data-nav-link]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href')
      if (!href || !href.startsWith('#')) return
      e.preventDefault()
      transition.wipe(() => {
        scrollToTarget(href === '#top' ? 0 : href, true)
      })
    })
  })

  const pagetop = document.getElementById('pagetop')
  pagetop && pagetop.addEventListener('click', () => {
    transition.wipe(() => scrollToTarget(0, true))
  })

  runLoader(() => {
    heroIntro()
    typo && typo.start()
    ScrollTrigger.refresh()
  })
  window.addEventListener('load', () => ScrollTrigger.refresh())
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot)
} else {
  boot()
}
