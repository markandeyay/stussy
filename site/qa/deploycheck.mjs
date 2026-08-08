import { chromium } from 'playwright'

/* Pre-deploy gate. Runs against the PRODUCTION build served under the
   real `base` path, because that is where the previous build broke:
   Vite rewrites `base` into HTML and CSS but not into strings built at
   runtime, so every JS-constructed "/assets/..." URL 404'd on Pages
   while dev mode looked perfectly fine.

   Fails loudly on any non-200 request, console error, or page error. */

const URL = process.env.URL || 'http://localhost:4173/Stussy/'

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1512, height: 900 } })

const failed = []
const consoleErrors = []
const pageErrors = []

page.on('response', (r) => {
  if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`)
})
page.on('requestfailed', (r) => failed.push(`FAILED ${r.url()} (${r.failure()?.errorText})`))
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
page.on('pageerror', (e) => pageErrors.push(String(e)))

await page.goto(URL, { waitUntil: 'load' })
await page.waitForTimeout(5000)

// walk the whole document so lazy assets and the chara scheduler fire
const H = await page.evaluate(() => document.documentElement.scrollHeight)
for (let y = 0; y < H; y += 600) {
  await page.evaluate((yy) => window.scrollTo(0, yy), y)
  await page.waitForTimeout(160)
}
await page.waitForTimeout(9000) // let the atmosphere doodles schedule in

const audit = await page.evaluate(() => {
  const broken = []
  document.querySelectorAll('img').forEach((i) => {
    if (!i.complete || i.naturalWidth === 0) broken.push(i.currentSrc || i.src)
  })
  const fonts = Array.from(document.fonts).map((f) => `${f.family} ${f.weight} ${f.style} ${f.status}`)
  return {
    brokenImages: broken,
    unloadedFonts: fonts.filter((f) => !f.endsWith('loaded')),
    title: document.title,
    sections: document.querySelectorAll('[data-scene]').length,
    docHeight: document.documentElement.scrollHeight,
  }
})

const problems = [
  ...failed.map((f) => `request: ${f}`),
  ...consoleErrors.map((f) => `console: ${f}`),
  ...pageErrors.map((f) => `pageerror: ${f}`),
  ...audit.brokenImages.map((f) => `broken image: ${f}`),
]

console.log(JSON.stringify({ url: URL, ...audit, problems }, null, 2))
await browser.close()

if (problems.length) {
  console.error(`\n✗ DEPLOY CHECK FAILED — ${problems.length} problem(s)`)
  process.exit(1)
}
console.log('\n✓ deploy check passed')
