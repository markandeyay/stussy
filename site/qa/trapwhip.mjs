import { chromium } from 'playwright'

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' })

// loader (early capture)
await page.waitForTimeout(600)
await page.screenshot({ path: 'qa/shots/tw-00-loader.png' })
await page.waitForTimeout(3600)

// hero + front strip + header badge
await page.screenshot({ path: 'qa/shots/tw-01-hero.png' })

// story inline logo
await page.evaluate(() => {
  const st = window.__ST.getAll().find((t) => t.trigger && t.trigger.id === 'story-pin')
  window.scrollTo(0, st ? st.start + 200 : 2000)
})
await page.waitForTimeout(1600)
await page.screenshot({ path: 'qa/shots/tw-02-story.png' })

// tribe meta inline
await page.evaluate(() => {
  const el = document.getElementById('tribe')
  window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top - 200)
})
await page.waitForTimeout(1500)
await page.screenshot({ path: 'qa/shots/tw-03-tribe.png' })

// footer word + meta on navy
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
await page.waitForTimeout(2200)
await page.screenshot({ path: 'qa/shots/tw-04-footer.png' })

await browser.close()
console.log('done')
