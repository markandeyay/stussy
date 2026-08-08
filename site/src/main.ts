import './style.css'
import { initMotion } from './core/motion'
import { initScroll, scrollTo } from './core/scroll'
import { runLoader } from './fx/loader'
import { Curtain } from './fx/curtain'
import { initAtmosphere } from './fx/atmosphere'
import { initDeco } from './fx/deco'
import { initBands } from './fx/bands'
import { initMedia } from './fx/media'
import { initCursor } from './fx/cursor'
import { initChrome } from './fx/chrome'
import { initReveals } from './reveals'
import { prepareScenes, heroIntro, initScenes, refreshScenes } from './scenes'

/* ═══════════════════════════════════════════════════════════════════
   STÜSSY CHAPEL HILL CHAPTER
   Boot order matters: motion prefs decide what everything else builds,
   scroll must exist before anything subscribes to it, and the hidden
   pre-intro states must be set before the loader can uncover them.
   ═══════════════════════════════════════════════════════════════════ */

const boot = () => {
  initMotion()
  initScroll()

  prepareScenes()

  const curtain = new Curtain('curtain')
  const atmosphere = initAtmosphere()

  initChrome()
  initDeco()
  initBands()
  initMedia()
  initCursor()
  initReveals()
  initScenes()

  /* anchor nav: cover, jump, uncover */
  const jump = (href: string) => {
    curtain.wipe(() => scrollTo(href === '#hero' ? 0 : href, true))
  }

  document.querySelectorAll<HTMLAnchorElement>('[data-nav]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href')
      if (!href?.startsWith('#')) return
      e.preventDefault()
      jump(href)
    })
  })

  document.getElementById('pagetop')?.addEventListener('click', () => jump('#hero'))

  runLoader(() => {
    heroIntro()
    atmosphere?.start()
    refreshScenes()
  })

  /* late-loading images change the document height; one refresh on load
     re-measures every trigger against the final layout */
  window.addEventListener('load', () => refreshScenes(), { once: true })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot)
} else {
  boot()
}
