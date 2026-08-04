import { gsap } from 'gsap'

/* Faithful port of ZOCCON's p-transition (class MT):
   24 gooey rects, shuffled widths from [1,1,1,1,1,2,2,3]x3,
   randomized power eases, durations [.3,.4,.5], delay 0-.15,
   random color mode per change. */

const RECT_COUNT = 24

const r = (min: number, max: number) => min + Math.random() * (max - min)
const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export class Transition {
  el: HTMLElement
  g: SVGGElement
  rects: SVGRectElement[] = []

  constructor(id: string) {
    this.el = document.getElementById(id)!
    this.g = document.getElementById('transition-g') as unknown as SVGGElement
    for (let i = 0; i < RECT_COUNT; i++) {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      rect.setAttribute('y', '-103%')
      rect.setAttribute('height', '103%')
      this.g.appendChild(rect)
      this.rects.push(rect)
    }
  }

  private layout() {
    let weights = shuffle([1, 1, 1, 1, 1, 2, 2, 3])
    weights = weights.concat(weights).concat(weights)
    let total = 0
    weights.forEach((w) => (total += w))
    const unit = 100 / total
    let x = 0
    this.rects.forEach((rect, i) => {
      const w = weights[i] * unit
      rect.setAttribute('width', `${w + 0.03}%`)
      rect.setAttribute('x', `${x}%`)
      x += w
    })
  }

  show(onCovered?: () => void) {
    this.el.classList.add('-is-changing')
    this.el.dataset.colorMode = String(1 + Math.floor(r(0, 4)))
    this.layout()
    const durations = shuffle([0.3, 0.4, 0.5, 0.3, 0.4, 0.5, 0.3, 0.4])
    let covered = false
    this.rects.forEach((rect, i) => {
      gsap.killTweensOf(rect)
      const roll = r(0, 1)
      const ease = roll < 0.333 ? 'power2.in' : roll < 0.666 ? 'power3.in' : 'power4.in'
      gsap.fromTo(
        rect,
        { attr: { y: '103%' } },
        {
          duration: durations[i % durations.length],
          delay: r(0, 0.15),
          ease,
          attr: { y: '0%' },
          onComplete: () => {
            if (!covered) {
              covered = true
              onCovered && onCovered()
            }
          },
        }
      )
    })
  }

  hide(onDone?: () => void) {
    const durations = shuffle([0.3, 0.4, 0.5, 0.3, 0.4, 0.5, 0.3, 0.4])
    let done = 0
    this.rects.forEach((rect, i) => {
      gsap.killTweensOf(rect)
      const roll = r(0, 1)
      const ease = roll < 0.333 ? 'power3.out' : roll < 0.666 ? 'power4.out' : 'expo.out'
      gsap.to(rect, {
        duration: durations[i % durations.length],
        delay: r(0, 0.15),
        ease,
        attr: { y: '-103%' },
        onComplete: () => {
          done++
          if (done === this.rects.length) {
            this.el.classList.remove('-is-changing')
            onDone && onDone()
          }
        },
      })
    })
  }

  /* full wipe cycle with a callback while the screen is covered */
  wipe(mid: () => void) {
    this.show(() => {
      mid()
      gsap.delayedCall(0.08, () => this.hide())
    })
  }
}
