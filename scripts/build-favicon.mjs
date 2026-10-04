/**
 * Writes public/favicon.svg from data/cv.json.
 * Run when the name changes: `npm run build:favicon`. Committed, like the OG
 * image — a browser asks for it before any JavaScript runs, so it cannot be
 * derived at render time.
 *
 * The design is the site's own hexagon — the frame around the headshot, in the
 * same cyan-to-green gradient — with the initials knocked out of it. A
 * hexagonal silhouette is the point: the previous favicon was cyan circles in
 * an orbit, which at 16px is indistinguishable from React's atom.
 *
 * The initials come from the résumé, so a fork gets its own mark rather than
 * inheriting one belonging to someone else.
 */
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import puppeteer from 'puppeteer'
import { palette } from './lib/palette.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
// One source of truth: the same --c-* block the site renders from.
const c = palette()
const { basics } = JSON.parse(readFileSync(join(root, 'data/cv.json'), 'utf8'))

const marks = basics.name
  .split(/\s+/)
  .filter(Boolean)
  .map((word) => word[0].toUpperCase())
  .slice(0, 2)
  .join('')

// Same polygon as .hex-frame in src/styles/index.css, at a 64 unit scale.
const hex = '32,1 59.5,16.75 59.5,48.25 32,64 4.5,48.25 4.5,16.75'

writeFileSync(
  join(root, 'public/favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="${marks}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c.accent}"/>
      <stop offset="1" stop-color="${c.accent2}"/>
    </linearGradient>
  </defs>
  <polygon points="${hex}" fill="url(#g)"/>
  <text x="32" y="33" fill="${c.bg}" font-family="ui-sans-serif, system-ui, 'Segoe UI', Helvetica, Arial, sans-serif"
        font-size="30" font-weight="800" letter-spacing="-1.5"
        text-anchor="middle" dominant-baseline="central">${marks}</text>
</svg>
`,
)
// A raster copy for Safari before 16 and for iOS home screens. iOS composites
// a touch icon onto an opaque tile, so this one carries the site's background
// rather than the transparency the tab icon wants.
const svg = readFileSync(join(root, 'public/favicon.svg'), 'utf8')
const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] })
const page = await browser.newPage()
await page.setViewport({ width: 180, height: 180, deviceScaleFactor: 1 })
await page.setContent(
  `<body style="margin:0;width:180px;height:180px;background:${c.bg};display:grid;place-items:center">
     <img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" width="140" height="140">
   </body>`,
)
await page.evaluate(() => document.querySelector('img').decode())
await page.screenshot({ path: join(root, 'public/favicon.png') })
await browser.close()

// Browsers cache favicons in a store of their own that a normal reload does not
// touch, so a changed icon at an unchanged URL keeps showing the old one — for
// every returning visitor, not just whoever regenerated it. Stamping the hrefs
// with a content hash makes a new icon a new URL, which is the only reliable
// way to retire the previous one. Bumped here rather than by hand: the script
// that changes the icon is the one that knows it changed.
const stamp = createHash('sha256')
  .update(svg)
  .update(readFileSync(join(root, 'public/favicon.png')))
  .digest('hex')
  .slice(0, 8)

const htmlPath = join(root, 'index.html')
const html = readFileSync(htmlPath, 'utf8')
const stamped = html.replace(
  /href="\/(favicon\.(?:svg|png))(?:\?v=[0-9a-f]+)?"/g,
  (_m, file) => `href="/${file}?v=${stamp}"`,
)
if (stamped !== html) writeFileSync(htmlPath, stamped)

console.log(`✔ public/favicon.svg + favicon.png generated from data/cv.json ("${marks}")`)
console.log(`✔ index.html icon hrefs stamped ?v=${stamp}`)
