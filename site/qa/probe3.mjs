import { chromium } from 'playwright'

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2800)

const pinY = await page.evaluate(() => {
  const el = document.getElementById('story-pin')
  return el.getBoundingClientRect().top + window.scrollY
})

for (const [name, off] of [['pre', -620], ['pinA', 200], ['pinB', 800]]) {
  await page.evaluate((yy) => window.scrollTo(0, yy), pinY + off)
  await page.waitForTimeout(3000)
  const st = await page.evaluate(() => {
    const img = document.querySelector('[data-story-img]')
    const ln1 = document.querySelectorAll('[data-ln]')[1]
    const fact = document.querySelector('[data-fact]')
        return {
      scrollY: window.scrollY | 0,
      imgClip: getComputedStyle(img).clipPath,
      markBg: getComputedStyle(ln1).backgroundSize,
      factOp: getComputedStyle(fact).opacity,
      ln1Y: getComputedStyle(ln1).transform.slice(0, 44),
    }
  })
  console.log(name, JSON.stringify(st))
  await page.screenshot({ path: `/tmp/stussy_qa/p3_${name}.png` })
}
await browser.close()
console.log('DONE')
