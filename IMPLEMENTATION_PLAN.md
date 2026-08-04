# STÜSSY CHAPEL HILL — Implementation Plan

> Living document. Updated after every Q&A round with the user.
> **Status: BUILT v4 (2026-08-02) — running at `http://localhost:5173/` (`Stussy/site/`, `npm run dev`).**

---

## 0. v4 OVERHAUL NOTES (2026-08-02, evening)

User feedback driving v4: (1) background streams must enter from the RIGHT edge and flow left
(they were spawning mid-page), with reference-level density; (2) lookbook-style scroll
choreography must run through EVERY section — the chapter story section was "abysmal";
(3) much more color — site was over-indexed on Carolina blue.

**Shipped in v4:**
- **Stream right-entry fix** (`zoc/typo.ts`): streams now spawn at `x = vw + rand(0, vw)`
  and re-enter at the right edge after leaving the left; single-instance flow (no ghost
  second copy). Active bursts now cycle a 5-color palette (carolina/gold/orange/red/navy).
- **Front strip multi-color**: script word in red, items cycle navy/orange/carolina/dark-gold.
- **Color system**: new tokens `--gold #FFC81A`, `--orange #F2682A`, `--red #F23D00`,
  `--mint #2FD6A8`, `--purple #917AFF`; 5-stop gradient (carolina→mint→gold→orange→navy).
  Per-section accent scoping (`--acc`): hero=carolina, story=gold, lookbook=orange,
  drop=red, tribe=mint, store=purple — drives section-head index, outline stroke,
  fact-table labels, product info rails, store column heads.
- **Component recolors**: header badge red; stickers cycle red/navy/orange/carolina per
  product; tribe hovers cycle navy/carolina/orange/mint with matched text colors;
  page-transition wipes cycle carolina/navy/gold/orange; marquee 3 is gold with ink type;
  footer gets a multi-color gradient bar.
- **Chapter Story rebuilt as pinned manifesto** (desktop): pre-pin lede/body reveals on
  approach, then a 1900px pinned scrub — gold outline "HEAVEN" drifts behind, gold marker
  wipe fills "SOUTHERN PART OF HEAVEN," fact rows cascade from alternating sides, porch
  image clip-reveals with rotation settle, badge pops with back.out.
- **Drop**: scrub cascade — cards fly in from +160px with alternating ±6° rotation,
  stickers stamp with overshoot (scale 2.4→1, back.out).
- **Tribe**: fan-out — cards converge from grid-center stack with fan rotations into place.
- **Store**: columns slide from alternating sides on scrub.
- All new choreography is `matchMedia('(min-width: 901px)')` gated; mobile shows settled
  states (verified via mobile QA).

**QA** (`site/qa/v4.mjs`, `v4m.mjs`): desktop sweep of story pin phases / drop cascade /
tribe fan / store slides / footer + mobile spot-checks. Zero console errors.

### v4.1 error-fix pass (same day, follow-up feedback)

User reported "site is full of visual errors, background has nowhere near enough text."
Diagnostic sweep (`qa/sweep.mjs` + DOM probes) found:
- **Gray product/image boxes**: `loading="lazy"` images hadn't fetched when scrolled to —
  boxes painted empty. Fix: all in-flow images now eager; lookbook pin distance also
  stabilizes (it had been measured against unloaded layout, causing over-scroll + counter
  desync).
- **Sparse streams**: right-entry single-instance streams left lanes empty most of the
  time. Fix: continuous marquee lanes — each lane is a phrase repeated >2.4× viewport,
  seamless wrap by exactly one unit width (`x < -unitW → x += unitW`), 16+ lanes (one
  every ~46px), larger sizes (16–36px), stronger alphas. Text always fills the viewport,
  always enters from the right edge (reference behavior = kf-marquee-motion on canvas).
- **Story pin refresh fragility**: clip/badge/bgword tweens converted to `fromTo` so
  hidden states re-assert on every ScrollTrigger invalidation.
- **Store ram** too small → bumped to `clamp(200px, 22vw, 340px)`.
- **Stray `.CONCEPT` TLD** in footer mail link → `.COM` (both occurrences).
- Verified via `qa/v5.mjs`: dense stream wall, eager images, lookbook end-cap reachable,
  story pin phases, store, footer, mobile — zero console errors.

### v5.1 reference-faithful typo + teleport fix (same day)

User: "the background is just fucking organized… literally just rip the code from the
reference" + "scroll past chapter story into the lookbook… it just teleports."

- **Typo rebuilt as an exact port of the reference instance system** (extracted from
  `main.js` ~682300 static layer + config at 680344): TWO overlaid layers — LAYER A
  (rows every 100px, 3 instances/row, sizes 48–80 in 5 weighted buckets) + LAYER B
  (rows every 65px, 15 instances/row, sizes 15–24). Each instance: staircase y
  (`row*margin + col/len*margin*1.4` — rows are diagonal cascades, never parallel),
  overlapping x chains (`e += width*0.75` / `*0.25`), random row-start x (0–10% vw),
  per-instance speed (80% slow 3–5, 20% fast 4–6 px/frame), ~40% tinted (colored ones
  get gray +2/+2 shadow copy), shuffled text bag, individual right-edge wrap
  (`x < -w → x = vw`), dt frame-factor (min 2×). Marquee-lane experiment deleted.
- **Teleport root cause found** (via `__ST.getAll()` dump): lookbook pin start was
  stale at 2976 = true position 4876 − story spacer 1900. The lookbook `mm.add` block
  ran before the story `mm.add` block, so its start was measured before the story
  spacer existed → LB pin engaged while story pin still active → double-pin jump.
  Fix: all pinned/scrub choreography now created in ONE `matchMedia` block in
  document order (`initStoryPin → initLookbookPin → initDropCascade → initTribeFan →
  initStoreSlides`). Verified pins: story 1541–3441, lookbook 4876–6989.
- Layout-shift hardening: `.p-story__img .c-gyre__inner` gets `aspect-ratio: 1400/933`
  (porch had no height reserve — the other layout-shift source); ram gets
  `aspect-ratio: 1`; porch img gets width/height attrs. `documentElement.scrollHeight`
  sampled stable across 6s.
- `window.__ST` debug handle exposed in scrollfx.ts for trigger dumps.
- Verified: hero chaos, boundary approach/pin engagement, mobile — zero page errors.

---

---

## 1. Project Concept

A website for **Stüssy Chapel Hill** — a fictional/new Stüssy Chapter store in Chapel Hill, NC —
following the naming convention of real chapter stores (Stüssy Shibuya Chapter, Stüssy LA, Stüssy Seoul).
The site transplants the **ZOCCON recruitment site's maximalist, playful, Japanese-street-culture energy**
onto a Stüssy × UNC Chapel Hill identity.

**The creative collision:**
- ZOCCON = the *format* (danmaku comment streams, mascots, marquees, gyre image stacks, loading screen, pinned scroll sections)
- Stüssy = the *soul* (handstyle signature, 8-ball/crown/dice iconography, International Stüssy Tribe, surf-skate-hiphop-reggae mashup)
- UNC Chapel Hill = the *place* (Carolina Blue, argyle, Old Well, Franklin St, Tar Heel culture, collegiate sportswear)

---

## 2. Reference Site Analysis — ZOCCON (recruit.zoccon.me)

Saved copy lives in `ZOCCON_ref/`. Confirmed stack and inventory:

### Tech stack (confirmed from `main.js` / HTML)
| Layer | Tech | Reuse plan |
|---|---|---|
| Animation | GSAP 3.12.5 + ScrollTrigger + ScrollToPlugin | Reuse patterns; reinstall fresh via npm |
| Smooth scroll | Lenis | Same |
| Page transitions | Swup (+ striped SVG rect wipe) | Same technique |
| Canvas FX | PixiJS (WebGLRenderer modulepreloads) — renders the danmaku type layers | Same, or Canvas2D if perf allows |
| Build | Vite bundle | TBD by stack question |
| Fonts | **Futura PT Condensed** (Adobe Fonts/Typekit, paid) + **Noto Sans JP** (Google Fonts) | Swap — see §5 |

### Signature elements to remap
1. **Danmaku streams** — NicoNico-style emoji/phrase streams floating behind + in front of content (`window.danmaku` config in HTML: back/front/emoji arrays). → Remap phrases to Chapel Hill × Stüssy voice.
2. **Mascot characters** — ZOCC/DO/MORE/NEO capsule characters that float across the page (`chara_*.webp`). → Replace with Stüssy-flavored Chapel Hill characters (8-ball, ram, dice, crown...).
3. **Marquees** — bold + outline alternating section marquees with arrows ("OUR IDENTITY", "CREATORS", "CULTURES"). → "CHAPEL HILL CHAPTER", "LOOKBOOK", "TRIBE", etc.
4. **Gyre stacks** — spinning, rotating, scaling layered image stacks on links/thumbs (`c-gyre`). → Product/lookbook thumbnails.
5. **Loading screen** — "NOW LOADING" letter animation + catch SVG. → Stüssy CH catch.
6. **Striped page transition** — SVG rects wipe in brand color. → Carolina Blue wipe.
7. **Slit-glass WebGL image cycler** — `data-slit-glass` portrait slideshows. → Lookbook/product portraits.
8. **Animated gradient SVG wordmark** — 3-color gradient scrolling through the logo (`#3457F3 → #41DAC6 → #FA348D`). → UNC-gradient (Carolina Blue → white → navy) through the chapter wordmark.
9. **Gooey SVG filters** on line decorations.
10. **Mixed-glyph display type** — headline letters randomly swap weights/italics (done via canvas letterforms). → Use on hero headline.
11. **Environment cards** — hover swaps normal/dark character cards (`environment*_pc.webp` / `*b_pc.webp`). → Store info cards (Hours / Location / Drops / Community).

### ZOCCON design tokens (from `main.css`)
```
--bg: #EBEBEB   --gray: #D0D0D0   --black: #000   --white: #fff
--zocc: #00E3BB  --neo: #FFD816  --do: #917AFF  --more: #FF6300  --tsuru: #F23D00
gradient: #3457F3 → #41DAC6 → #FA348D
```

---

## 3. Brand Research — Stüssy

- **Chapter stores**: real-world retail network ("Stüssy [City] Chapter"), each opening with an **exclusive Chapter tee**. Interiors by Perron-Roettinger / WP&A: deconstructed industrial-organic, timber frames, mirrors, tiki totems, postmodern geometry, surf roots.
  - Refs: [Dezeen — Shibuya Chapter](https://www.dezeen.com/2021/07/25/stu%CC%88ssys-shibuya-perron-roettinger-interior/) · [Stüssy — Shanghai Chapter Opening](https://www.stussy.com/blogs/features/stussy-shanghai-chapter-opening) · [Highsnobiety — Shibuya inside](https://www.highsnobiety.com/p/stussy-shibuya-chapter-store-inside/)
- **Visual language**: Shawn Stüssy's hand-drawn signature (handstyle), SS-link monogram, 8-ball, crown, dice, playing cards, skulls, tribe flags; reggae/punk/surf/skate mash; Xerox/zine/newsprint texture; International Stüssy Tribe (IST) crew identity; black-and-white lookbook photography.
- Official site: [stussy.com](https://www.stussy.com/) (chapter tee drops, store list, lookbooks)

## 4. Brand Research — UNC Chapel Hill

Official identity refs: [identity.unc.edu/color](https://identity.unc.edu/brand/color/) · [shapes & patterns](https://identity.unc.edu/brand/shapes-and-patterns/) · [asset downloads](https://identity.unc.edu/resources/downloads/) · [Athletics brand guide PDF](https://unc_ftp.sidearmsports.com/15athgen/carolinaathletics_brandingguidelines-final.pdf)

- **Carolina Blue** `#4B9CD3` (digital/PMS 542C; athletics print uses `#7BAFD4`) — "should be used as much as possible"
- **Navy** `#13294B`, **White** `#FFFFFF`; athletics secondary: black, metallic silver
- **Argyle** — Alexander Julian, 1991–92 basketball uniforms under Dean Smith; 2:3 ratio, linear format; downloadable as official zip: [Argyle.zip](https://identity.unc.edu/wp-content/uploads/sites/885/2025/11/Argyle.zip) (23MB) · [Patterns.zip](https://identity.unc.edu/wp-content/uploads/sites/885/2026/03/Patterns.zip) · [Textures.zip](https://identity.unc.edu/wp-content/uploads/sites/885/2026/03/Textures.zip)
- **Icons**: interlocking NC, Tar Heel foot, Old Well, Morehead–Patterson Bell Tower, Rameses (ram), Franklin Street, "Tar Heels" (two words), GDTBATH ("Good Day To Be A Tar Heel")
- Streetwear crossover angle: vintage Carolina tees/argyle are already grails in the vintage/collegiate market — the mashup is culturally credible.

---

## 5. Proposed Design System (PENDING user decisions)

### Color (proposal A — "Carolina ZOCCON")
Map ZOCCON's token structure onto UNC:
```
--bg:        #EBEBEB  (keep — ZOCCON gray works like newsprint)
--carolina:  #4B9CD3  (replaces --zocc teal as THE accent)
--navy:      #13294B
--white:     #FFFFFF
--ram-gold:  #FFD816  (keep ZOCCON neo-yellow as energy pop — optional)
--black:     #000000
gradient:    #4B9CD3 → #FFFFFF → #13294B  (replaces blue→teal→pink)
```

### Typography (proposal — pending)
| Role | ZOCCON used | Proposal | Link |
|---|---|---|---|
| Display (EN) | Futura PT Condensed (Adobe, paid) | **Anton** or **Archivo Black** (free), or keep Futura PT Cond if user has Adobe Fonts | [Anton](https://fonts.google.com/specimen/Anton) · [Archivo](https://fonts.google.com/specimen/Archivo) · [Futura PT Condensed](https://fonts.adobe.com/fonts/futura-pt-condensed) |
| Handstyle accent | — (ZOCCON used mascots) | Stüssy-style handscript for "Chapel Hill" accents: **Caveat**, **Permanent Marker**, or custom SVG trace | [Permanent Marker](https://fonts.google.com/specimen/Permanent+Marker) · [Caveat](https://fonts.google.com/specimen/Caveat) |
| Body/UI | Noto Sans JP | **Inter** / **Space Grotesk** / Noto Sans | [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) |
| Outline marquee | same Futura (stroked) | same family, `-webkit-text-stroke` | — |

### Danmaku content (remap example)
- back: `🏀🐏🎱 CHAPEL HILL ☆彡`, `FRANKLIN ST ☆彡 CAROLINA BLUE ☆彡`, `TAR HEELS TAR HEELS TAR HEELS`
- front: `GO HEELS.`, `STÜSSY CHAPEL HILL CHAPTER`, `INTERNATIONAL STÜSSY TRIBE`, `EST. 2026`, `8-BALL NEVER LIES`
- emoji: 🎱🐏🏀👟🧢🎲♠️🌩️💙🤍

---

## 6. Candidate assets to source (pending approval)

| Asset | Source | Notes |
|---|---|---|
| Stüssy signature logo (SVG/PNG) | [seeklogo Stüssy](https://seeklogo.com/vector-logo/84231/stussy) · [Wikimedia](https://commons.wikimedia.org/wiki/File:Stussy_Logo.svg) | trademark — concept use only (Q1) |
| 8-ball / crown / dice Stüssy graphics | stussy.com press/tee imagery | recreate as original hand-drawn SVGs instead? |
| UNC argyle pattern (official) | [Argyle.zip](https://identity.unc.edu/wp-content/uploads/sites/885/2025/11/Argyle.zip) | official brand zip |
| UNC campus/Old Well photography | [UNC textures/patterns zips](https://identity.unc.edu/resources/downloads/) · Unsplash "chapel hill" | licensing TBD |
| Stüssy lookbook-style photography | Unsplash/Pexels streetwear sets, or AI-generated | decision needed |
| Mascot/character art | AI-generate (built-in image gen) in ZOCCON mascot style, Stüssy flavor | rounds of review |
| Interlocking NC / Tar Heel marks | [Interlocking_NC.zip](https://identity.unc.edu/wp-content/uploads/sites/885/2025/11/Interlocking_NC.zip) | official — trademark care |

## 7. Tools / MCPs / Skills (proposed — will confirm before use)

- **Figma MCP** — already in your MCP catalog as `plugin-figma-figma` (needs auth via its `mcp_auth` tool). Only needed if we design in Figma first. [Figma MCP docs](https://www.figma.com/blog/introducing-figma-mcp-server/)
- **Playwright MCP** — for screenshotting/testing the site as we build (`.playwright-mcp/` already exists in your projects dir). [Playwright MCP](https://github.com/microsoft/playwright-mcp)
- **Shopify Dev MCP** — already installed; only if we do real commerce. [Shopify dev MCP](https://shopify.dev/docs/api/mcp)
- **Built-in image generation** — mascot art, textures, chapter tee mockups.
- Available local skills if wanted: logo-design skills, `japanese-brand-design`, `frontend-design`, `emil-design-eng` (motion polish).

---

## 8. Open Questions Log

*(Newest rounds on top)*

### Round 2 — DESIGN DIRECTION (answered 2026-08-02)
- Q5 Color → **carolina_zoccon** ✅
- Q6 Type → **Adobe Fonts only, tasteful.** User has Adobe access. No Google Fonts.
- Q7 Mascots → **both** ✅ (icon floaters + one hero mascot)
- Q8 Imagery → **ai_editorial** ✅ (full custom AI lookbook)

### Round 3 — TYPE SYSTEM + MASCOT + SECTIONS (answered 2026-08-02)
- Q9 Display → **Acumin Pro** (ExtraCondensed Black + family) ✅
- Q10 Handstyle → **Flood** ✅
- Q11 Hero mascot → **Ram in a bucket hat** ✅
- Q12 Sections → **Core set** ✅

### Round 4 — CONTENT (answered 2026-08-02)
- Q13 Products → **fictional drop list** ✅ (invented Chapter exclusives w/ AI product shots)
- Q14 Links → **no links, pure showcase** ✅
- Q15 Store → **invent identity** ✅ (178 E Franklin St, 11–8, chapelhill@stussy.concept, @stussychapelhill)
- Q16 Danmaku → **full chaos** ✅ (dense emoji streams, front+back layers, ZOCCON energy)
- Addendum (user, 12:18PM): **ALL products marked OUT OF STOCK** — concept piece; sold-out stickers/labels on every item (very chapter-drop authentic).

### Round 6 — ASSET REVIEW 1 (answered 2026-08-02)
- Q21 Mascot → **iterate**: v1 was underspecified. Rule going forward: verbose prompts with exact texture/shape/structure/hex/style. Base on **ZOCCON vinyl capsule characters** + more Stüssy.
- Q22 Lookbook → **iterate**: needs visibly Stüssy garments; use real Stüssy reference images (downloaded to `assets/ref/` from official CDN).
- Q23 Figma → **new file in Drafts** ✅ — created: [Stüssy Chapel Hill — Site](https://www.figma.com/design/PKev8UIRR1dIsPMWsFjGAE) (`file_key: PKev8UIRR1dIsPMWsFjGAE`)

### Round 7 — ASSET REVIEW 2 (answered 2026-08-02)
- Q24 Mascot v2 → **rejected**. New rule: ALWAYS submit ZOCCON character images as `reference_image_paths` + verbose prompts.
- Q25 Lookbook 03 → **approved style**; future shots need more experimental/unique Stüssy outfits (not just tees) — knits, work jackets, nylon, rugby, argyle, layering, accessories.
- Q26 Floaters → **stickers in ZOCCON aesthetic**, same ref-image workflow.

### Round 8 — ASSET REVIEW 3 (answered 2026-08-02)
- Q27 Mascot v3 → **rejected**. CRITICAL CORRECTION: ZOCCON's characters are **3D anime figure renders** (anime humans in oversized matching streetwear — chara1/chara2), NOT capsule creatures. The capsules are only minor typo decorations.
- Q28 Floater v1s → **rejected** (same reason). New floater rule: faceless designer-toy objects in anime-figure vinyl finish.
- Lookbook batch → **GO** confirmed.

### Round 9 — ASSET REVIEW 4 (answered 2026-08-02)
- Q29 Mascot v4 → **rejected**. Style still off. FINAL STYLE LOCK discovered via deep study of ZOCCON assets — the site runs TWO visual layers:
  1. **3D anime character renders** (gacha-figure/scale-figure look: detailed glossy anime eyes, airbrushed skin+blush, gradient streetwear sets) → mascot lane
  2. **Xerox-punk halftone doodles** (hand-drawn black marker, heavy photocopy dither — fx images) → floaters lane (= classic Stüssy tribe doodle energy)
- Q30 Floaters → NO 3D objects at all. Floaters = black Xerox doodles only.
- Q31 Lookbook → **approved**, batch 2 ran.

### Round 10 — ASSET REVIEW 5 (asked 2026-08-02)
- `mascot_ramsey_v5.png` — anime guy (amber star-highlight eyes, blush, messy black hair), cream horns under navy bucket hat, gradient Carolina hoodie set, peace sign; refs chara1/chara2/nav_chara
- Doodle floaters (refs fx2_7): `doodle_8ball_v1.png` `doodle_crown_v1.png` `doodle_dice_v1.png` `doodle_ram_v1.png`
- Lookbook batch 2: `lookbook_07_court.png` (mesh jersey dusk jumpshot) `lookbook_08_rooftop.png` (8-ball knit rooftop trio) `lookbook_09_franklin_night.png` (overcoat + blue scarf, storefront flash)
- Q32 Mascot v5: approve / iterate?
- Q33 Doodle floaters: approve / iterate (need CH handstyle tag doodle too?)
- Q34 Lookbook complete set (6): approve / iterate?

### Round 5 — PRODUCTION (answered 2026-08-02)
- Q17 Editorial → **start now** ✅ — mascot first, then 6–8 lookbook batch for approval before building
- Q18 Products → **generate everything** ✅ — full fictional drop w/ original AI garment graphics; ALL OUT OF STOCK
- Q19 QA → **install Playwright MCP** ✅ — user to add to Cursor MCP config (see Action Items)
- Q20 Figma → **use Figma MCP** ✅ — mock key frames in Figma first, then implement (needs auth flow)

### Production pipeline (locked order)
1. **Assets**: ram mascot → lookbook batch (6–8, style: 35mm grain, B&W + Carolina duotone pops, Franklin St/campus) → fictional drop product shots (all SOLD OUT) → icon floaters (8-ball, crown, dice, ram, SS-link as hand-drawn SVGs)
2. **Figma key frames** (Figma MCP): hero, marquee→story transition, lookbook gyre, drop grid, store info
3. **Build** (Vite + TS): tokens → core systems (Lenis/GSAP/danmaku/loader/marquee) → sections → assets → polish
4. **QA**: Playwright MCP screenshot loop (desktop + mobile)

## 9. Decision Log
- **R1/Q1 → Concept/fan project.** Real Stüssy + UNC marks usable as homage; still prefer recreating icon art as original SVGs where easy.
- **R1/Q2 → Vite + vanilla TS.** Max reuse of ZOCCON patterns (GSAP/Lenis/Swup/PixiJS via npm).
- **R1/Q3 → Single immersive scroll page.** Section list TBD (Round 3).
- **R1/Q4 → Product showcase, no cart.** Product cards link out (target URL TBD Round 3).
- **R2/Q5 → "Carolina ZOCCON" palette** — `#EBEBEB` canvas, Carolina Blue `#4B9CD3` primary accent, navy `#13294B` depth, black/white; gradient `#4B9CD3 → #FFFFFF → #13294B`.
- **R2/Q6 → Adobe Fonts (Typekit) only.** User has Adobe access; wants tasteful. Kit needed — see Action Items.
- **R2/Q7 → Mascots: BOTH** — floating hand-drawn Stüssy icons (8-ball, crown, dice, ram, SS-link) as ZOCCON-style charas + ONE hero mascot character.
- **R2/Q8 → AI-generated editorial lookbook** — custom models-in-gear-on-Franklin-St imagery, film grain, Carolina Blue accents.

### LOCKED Type system
| Role | Face | Use |
|---|---|---|
| Display | [Acumin Pro](https://fonts.adobe.com/fonts/acumin) — ExtraCondensed Black/Bold | Headlines, marquees, mixed-glyph hero, stroked outline type |
| Handstyle | [Flood](https://fonts.adobe.com/fonts/flood) | "Chapel Hill" script, stickers, graffiti accents |
| Body/UI | Acumin Pro (standard width, regular/medium) | Paragraphs, UI, captions |

### LOCKED Page structure (Core set)
`Loader → Hero (wordmark + ram mascot + danmaku) → Marquee → Chapter Story → Lookbook → The Drop → Tribe/Community → Store Info → Footer`

### LOCKED Mascots
- Hero: **ram in a bucket hat** (hand-drawn Stüssy-zine style, AI-generated + refined)
- Floaters: hand-drawn **8-ball, crown, dice, ram head, SS-link** drifting like ZOCCON's chara system

### Type shortlist (Adobe Fonts — verified links)
| Role | Candidates |
|---|---|
| Display | [ATF Franklin Gothic](https://fonts.adobe.com/fonts/atf-franklin-gothic) (Heavy/Ultra — collegiate Americana, *literally named like Franklin Street*) · [Acumin Pro](https://fonts.adobe.com/fonts/acumin) (XC Black — closest to ZOCCON's Futura PT Cond) · [Trade Gothic Next](https://fonts.adobe.com/fonts/trade-gothic-next) (Heavy Compressed — industrial Americana) · [Neue Haas Grotesk](https://fonts.adobe.com/fonts/neue-haas-grotesk) (true Helvetica, most authentic to real stussy.com) |
| Handstyle | [Flood](https://fonts.adobe.com/fonts/flood) (felt-tip marker, closest to Shawn Stüssy's hand) · [TT Disruptors](https://fonts.adobe.com/fonts/tt-disruptors) (marker w/ alternates) · [Tomasa](https://fonts.adobe.com/fonts/tomasa) (graffiti-tag, hip-hop) |
| Body | Neue Haas Grotesk Text or Acumin standard (decided w/ display pick) |
| Wildcard | [SMOR](https://fonts.adobe.com/fonts/smor) (graffiti throwup bubbles — sticker/danmaku accents) |

### Action items for user
- [ ] **Adobe Fonts kit**: create a Web Project at [fonts.adobe.com/my_fonts](https://fonts.adobe.com/my_fonts#web_projects-section) with **Acumin Pro** (incl. ExtraCondensed Black/Bold + standard regular/medium) and **Flood** → paste the kit CSS URL (`https://use.typekit.net/xxxxxxx.css`)
- [ ] **Playwright MCP**: add to Cursor MCP config (`~/.cursor/mcp.json` or project `.cursor/mcp.json`), then restart:
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```
- [ ] **Figma MCP**: when we hit the Figma phase I'll trigger auth — you'll need to approve in Figma/desktop app ([Figma MCP guide](https://www.figma.com/blog/introducing-figma-mcp-server/))

## 10. Build Phases (LOCKED until GO)
1. Scaffold + design tokens + fonts
2. Core systems: Lenis, GSAP, marquee, danmaku canvas, loader, page transition
3. Hero (chapter wordmark + gradient + mascot)
4. Sections per chosen scope
5. Asset integration (argyle, photography, mascots)
6. Polish pass (motion, mobile, perf) + Playwright screenshot QA

## 11. Build Notes — v1 (2026-08-02, user said GO)

### What shipped
- **Stack**: Vite 6 + vanilla TS, GSAP 3.12 (+ScrollTrigger), Lenis 1.1. Canvas2D danmaku (no PixiJS needed — perf fine).
- **Location**: `Stussy/site/` — `npm run dev` → `http://localhost:5173/`. Prod build clean (`npm run build`, 54KB gzip JS).
- **Sections (as LOCKED)**: Loader (% counter + bobbing ram doodle + Carolina striped wipe) → Hero (Flood-style script + mixed-glyph CHAPEL HILL [solid/outline/italic] + RAMSEY mascot + grad bar + danmaku) → black marquee → Chapter Story (copy + porch gyre stack) → Lookbook (6-shot staggered grid, FW26 "Southern Part of Heaven") → navy marquee → The Drop (4 fictional products, all SOLD OUT stickers, struck prices, "GONE") → Tribe (4 hover-invert cards w/ JA labels) → Store Info (invented: 178 E Franklin St, above the record shop) → Footer (navy, giant script + outline block, concept disclaimer).
- **Systems**: Lenis smooth scroll + velocity-reactive marquees; 2-layer canvas danmaku (back: 10 ZOCCON-style gibberish/emoji streams; front: Flood-script "Stüssy Chapel Hill" + chapter phrases); 4 drifting doodle floaters (mix-blend-multiply, scroll parallax via data-speed); IntersectionObserver reveals w/ stagger; hide-on-scroll header; anchor nav via Lenis.
- **Assets**: all AI-generated, optimized 31MB → 4MB (lookbook 1400px JPG82, products 1000px JPG82, mascot 1100px JPG85, doodles 420px PNG for multiply blend).
- **QA**: headless Chrome screenshots @1440×900/2400/7000 — all sections verified, no console errors. Playwright MCP still pending (see action items); used raw headless Chrome instead.

### Deferred / pending
- **Adobe Fonts kit** — HTML has commented `<link>` placeholder in `<head>`; CSS stacks already reference `acumin-pro-extra-condensed` + `flood`, falls back to Impact/Marker Felt meanwhile. Paste kit URL → instant upgrade.
- **Figma design phase** — skipped by user GO (file was created in drafts earlier; can revisit).
- **Remaining doodles** (handstyle "CHAPEL HILL" tag floater, SS-link) — v2.1.
- **Playwright MCP server** — not in `~/.cursor/mcp.json`; using Playwright directly via Node scripts instead (same browsers).

## 12. v2 Overhaul — "actually reuse the reference" (2026-08-02)

User feedback: v1 was too lacy/one-shot; must properly reuse ZOCCON code and raise detail density.

### Systems now ported 1:1 from `ZOCCON_ref/main.js` / `main.css`
| ZOCCON source | Port | File |
|---|---|---|
| `p-transition` (class MT) — 24 gooey rects, shuffled widths from `[1,1,1,1,1,2,2,3]×3`, random power2/3/4.in eases, durations `[.3,.4,.5]`, delay 0–.15s, random color-mode, `#top-lines-gooey` filter (feGaussianBlur 3 + feColorMatrix 19 -9) | `Transition` class, runs on **every nav click + pagetop** (wipe → jump → wipe) | `src/zoc/transition.ts` |
| `p-top-loading` — black, catch, `clip-path: inset(0 0 100% 0)` exit w/ `cubic-bezier(.77,0,.175,1)`, `kf-loading` rotateY(-360deg) letters @ .04s stagger | loader rebuild (no fake % — ZOCCON has none) | `src/loader.ts` + CSS |
| `p-typo-back` (class c3) — canvas streams w/ PC `static_movX` ranges (3–5 / 4–6 px/frame), periodic active bursts (×1.5/×2.5/×4, `time {start:10, loop:30}`) recoloring limited streams | `initTypo` back canvas | `src/zoc/typo.ts` |
| chara spawner (class l3) — every 8s, shuffled lanes `[.1,.3,.5,.7]vh`, 2s+rand stagger, `kf-typo-chara` one-shot crossings 3–5s | doodle charas (8ball/crown/dice/ram) | `src/zoc/typo.ts` |
| `p-typo-front` — 5em flowing strip, translate3d positioned | front strip: Flood script + chapter phrases | `src/zoc/typo.ts` |
| `c-gyre` (class jT) — base + 3 clones, rest states @ progress .333/.666 of rotate(19.495°)+scale(.5146), hover tweens timeline `time` (.8s power1.out), arrow clip-path circle @ .36s delay | `initGyres` on hero mascot, story, 6 lookbook, 4 products | `src/zoc/gyre.ts` |
| `c-marquee` — kf-marquee-motion CSS loop, bold/normal italic condensed pairs, circle-arrow icons, `-inview` gating | structure + CSS port; JS clones to 2× width, velocity bends duration | `src/marquee.ts` + CSS |
| `kf-hover-underbar` — scaleX wipe-through (in-quad then out-expo) | nav + footer link hovers | CSS |
| `kf-entry-rotate` — 14s linear rotation | rotating circular-text badge on story image + loader ram | CSS |
| ZOCCON easing set (.77,0,.175,1 / .455,.03,.515,.955 / .19,1,.22,1 / .165,.84,.44,1 / .47,0,.745,.715) | `--ez-*` tokens used across all transitions | CSS |

### Density additions (the "de-lacy" pass)
SEC.0x index labels + meta blocks w/ coordinates on every section head · hairline rules · fact table (address/floor/opened/fixtures) · product spec rows + item codes (03-01…) · lookbook captions w/ location coords + "SHOT ON 35MM" · rotating circular-text badge · fixed hairline grid · animated noise overlay (feTurbulence, steps(3)) · hero side vertical text + footer meta row · pagetop button · footer link columns · JA accents (チャペルヒル店 / 店舗 / コート / クルー / タウン / 章).

### QA loop (Playwright, system Chrome channel)
- `site/qa/shot.mjs` — full page + 7 section shots + scroll-through to fire IO/lazy
- `site/qa/hover.mjs` — gyre spin, tribe invert, nav wipe mid/after, console errors
- Verified: zero console errors; gooey wipe renders; gyre spin + navy arrow on hover; tribe invert; mobile 375px (nav hides, grids collapse, typo still runs).

## 13. v3 — real fonts + scroll choreography (2026-08-02)

User feedback v2: still too lazy — normal-website sections, not enough simultaneous motion, "concept" references unwanted, fallback fonts unacceptable.

### Fonts — REAL Futura PT Condensed
- Extracted all 8 woff2 URLs from the reference kit CSS (`ZOCCON_ref/.../bsp8jfo.css`): weights 400/500/700/800 × normal/italic.
- Downloaded to `site/public/fonts/` (375KB total) — self-hosted `@font-face`, no Typekit dependency, no domain lock. `--font-display` now `"futura-pt-condensed"` everywhere incl. canvas typo stacks. Preloads in `<head>`.
- The Acumin/Flood kit plan is DEAD — display type now matches ZOCCON exactly. Script accents still Flood→Marker Felt fallback (no kit needed for real use).

### "Concept" scrubbed
Eyebrow → "CHAPTER EXCLUSIVE" · fact table "FALL 2026" · footer meta → "INTERNATIONAL STÜSSY TRIBE ★ WORLDWIDE / EVERYTHING IS SOLD OUT. FOREVER." · `<title>` and description cleaned.

### Scroll choreography (`src/scrollfx.ts`)
- **Lookbook = pinned horizontal gallery** (ScrollTrigger pin+scrub, desktop ≥901px; vertical stack on mobile): track slides 6 gyre frames + "fin." end card, per-figure y/rotate parallax (`data-lb-parallax`), live counter "01/06" + progress bar.
- Hero layered parallax on scroll-out (title −16%, mascot +14%/rotate, eyebrow fades).
- Marquees: scroll-scrubbed drift on `.c-marquee__inner` (CSS loop untouched on child set).
- Store ram: −40°→+40° rotation scrub.
- Every sec-head .tt drifts 26px on scrub — no static sections.

### Split-text reveals (`src/reveals.ts`)
- `data-split-letters` → `.glw>.gl` clip-roll per glyph (26ms stagger) on all 5 sec-head titles + footer wordmark.
- `data-split-words` → `.wdw>.wd` stagger on story lede + body paragraphs.

### Typo density (`src/zoc/typo.ts`)
- Lanes 12+ (every ~54px), **two depths** (far: 60% speed, 15–22px, half alpha / near: full speed, 22–34px).
- **Scroll-velocity multiplier** (lerped, ×1→×4.2, decays) — streams and front strip surge while scrolling.
- Futura on canvas; active bursts retained.

### Tribe environment swap (port of ZOCCON environment cards)
Cards hold lookbook imgs; hover clips env image in (`inset(100%→0)`, inout-quint) + scale 1.12→1 while text goes Carolina over navy.

### QA v3
`site/qa/v3.mjs` — hero (Futura verified), story split reveal, lookbook pin at 0/mid/end (progress bar + fin card), tribe env swap hover, drop + footer. **Zero console errors.** Build: 55.7KB gzip JS, 6.6KB gzip CSS + 375KB fonts.

---

## STATUS: OPTIMIZATION AUDIT COMPLETE (v6) — zero visual change

Constraint: no optimization may alter the visual display in any way — no simplified movement, no reduced counts. Pure work-elimination only. Baseline (M-series Chrome, 120Hz): 119fps idle, ~182fps scroll, 0 longtasks — already at display cap, so gains are per-frame work, allocation churn, DOM writes, and GPU layer memory (battery/thermal/lower-end headroom). Post-change profile identical FPS with the same visuals (Playwright sweep `qa/verify_opt.mjs`).

### Background rendering (`src/zoc/typo.ts`) — biggest wins
1. **Per-frame string allocation eliminated**: every instance's font string was rebuilt via template literal every frame (~285/frame ≈ 34k/sec). Fonts are now precomputed once at creation (`Inst.font`). Front-strip fonts/widths/colors were re-measured and re-built every frame — now precomputed once in `fit()` into `frontPieces` (no `measureText` in the frame loop at all).
2. **Canvas state-assignment caching**: `ctx.font`/`fillStyle` assignments re-parse strings even when unchanged — per-frame `curFont`/`curFill` caches now skip identical assignments (draw order untouched, overlap z-order preserved).
3. **Viewport reads cached**: `window.innerWidth/innerHeight` and `canvas.width/dpr` were re-read every frame — now cached in `fit()` locals.
4. **Resize guard**: `fit()` (full rebuild of ~285 instances + 2 canvas reallocs) fired on every raw resize event — mobile chrome address-bar collapse fires resize on scroll. Now rAF-throttled and skipped entirely when dimensions didn't actually change.
5. **Single-rAF-chain invariant**: visibility toggles could stack a second rAF loop (double-speed bug) — chains now carry an id; stale chains self-terminate.
6. `logoImg.complete && naturalWidth` per-draw checks → single `logoReady` flag set on load.

### Animations (`scrollfx.ts`, `marquee.ts`, `smooth.ts`, `reveals.ts`, `gyre.ts`)
7. **Lookbook progress bar: layout → composite**: was `style.width = %` per scrub frame (layout thrash) — now `transform: scaleX()` with `transform-origin: left` (`.lb-bar i` is full-width, origin left: pixel-identical fill). Counter `textContent` was rewritten every frame (re-layout even when unchanged) — now written only when the index actually changes.
8. **Marquee velocity push**: fired per scroll frame — did 3 `querySelector`s per event and allocated a NEW `gsap.delayedCall(0.7)` per event (dozens/sec, all later re-writing). Sets are cached once, duration writes deduped by string, and a single reset timer is killed/re-armed.
9. **Header/pagetop classList churn**: `classList.add/remove/toggle` ran every scroll frame even when the state was unchanged — now only touched on actual state flips.
10. **will-change lifecycle**: `.gl`/`.wd` split glyphs held `will-change: transform` forever (hundreds of promoted compositor layers for text that animates once). JS now adds `-anim-done` after the reveal transition completes (delay = max glyph delay + duration + margin), releasing the layers while glyphs are static — identical pixels during and after. Gyre imgs held `will-change: transform, opacity` on ~28 full-size images permanently though they only move on hover — now promoted via `-live` only while a hover tween is actually running (`gsap.isTweening` guard survives enter/leave races).

### Transitions (`zoc/transition.ts`, `loader.ts`) — audited clean
Rects are created once and reused (no per-wipe DOM churn), `killTweensOf` prevents tween leaks, per-wipe relayout is required for the randomized stripe widths, and the loader removes its own node after exit. Nothing wasteful that could be removed without changing the randomized visual.

### Verification
`npx tsc --noEmit` clean. Profile re-run: same 118fps idle / ~182fps scroll / 0 longtasks. Sweep `qa/verify_opt.mjs`: hero streams+strip identical, lookbook bar `scaleX(0.500)` with counter `04` at mid-pin, `-anim-done` applied with revealed text pixel-crisp, gyre `-live` on during hover / released after, striped nav wipe + footer reveals intact.

---

## v6.1: TRAPWHIP logo swap
Source: SMS attachment (saved to repo root `trapwhip-src.png`, 1448x1086). White bg removed via white-decontamination keying (`site/qa/decon_logo.mjs`: alpha = 255-min(rgb), un-premultiplied from white, tight crop) → `site/public/assets/trapwhip-script.png` (735x506, AR 1.4526). Swapped at ALL logo points: loader catch-logo, header logo-mark, hero-logo, footer foot-logo, all stussy-inline instances, canvas back streams + front strip (`typo.ts` src + LOGO_AR). Invert filters removed — natural two-tone (red Trapwhip / carolina Chapel Hill) on every background incl. loader black + footer navy. Redundant "Chapel Hill (Chapter)" text removed where the logo now carries it: loader catch-block, hero CHAPEL HILL block (hero-logo enlarged to clamp(160px,23vw,380px) as sole display), hero side rail, front-strip item (now ★ EST. 2026 ★), footer © line. Marquee/banner "CHAPEL HILL CHAPTER" text kept (not logo-adjacent). hero-block CSS/JS animation targets removed.

## v6.2: RAMSEY mascot swap — photoreal dithered ram
Generated photorealistic ram head (side profile, Carolina blue #4B9CD3 curled horns, cream wool, seamless white bg). Pipeline `site/qa/ram_process.mjs`: (1) bg removal via BFS flood-fill from border over near-pure-white (>=252) so cream wool survives + 1px alpha feather, (2) ordered dither — Bayer 8x8, 4 levels/channel, 2x2 blocks, subject pixels only, (3) wrap-around white sticker border — silhouette dilated 22px, white, composited under subject, tight crop → `site/public/assets/mascot/ramsey-dither.png` (1048x1029). Hero gyre img swapped (old anime ramsey.jpg retired on disk). Store/loader ram doodles untouched (Xerox-punk style, not the anime character).
