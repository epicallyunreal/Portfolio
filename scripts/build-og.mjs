/**
 * Renders public/images/og.png (1200×630) from data/resume.json via Puppeteer.
 * Run manually when name/headline changes: `npm run build:og`. The output is
 * committed — link scrapers need it at a stable URL.
 */
import { readFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import puppeteer from 'puppeteer'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const resume = JSON.parse(readFileSync(join(root, 'data/resume.json'), 'utf8'))
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; box-sizing: border-box; }
  body {
    width: 1200px; height: 630px; overflow: hidden;
    background: #0a0f14; color: #e6edf3;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    display: flex; flex-direction: column; justify-content: center;
    padding: 0 90px; position: relative;
  }
  svg.topo { position: absolute; right: 60px; top: 90px; opacity: 0.9; }
  h1 { font-size: 84px; font-weight: 900; letter-spacing: -2px; line-height: 1.0; }
  .label { font-size: 30px; color: #94a3b1; margin-top: 22px; }
  .headline { font-size: 26px; color: #22d3ee; margin-top: 34px; font-family: Menlo, monospace; }
  .url { position: absolute; bottom: 48px; left: 90px; font-size: 22px; color: #7b8a97; font-family: Menlo, monospace; }
</style></head><body>
  <svg class="topo" width="300" height="300" viewBox="0 0 300 300" fill="none">
    <line x1="150" y1="60" x2="70" y2="170" stroke="#1d2b36" stroke-width="2"/>
    <line x1="150" y1="60" x2="230" y2="170" stroke="#1d2b36" stroke-width="2"/>
    <line x1="70" y1="170" x2="150" y2="250" stroke="#1d2b36" stroke-width="2"/>
    <line x1="230" y1="170" x2="150" y2="250" stroke="#1d2b36" stroke-width="2"/>
    <line x1="70" y1="170" x2="230" y2="170" stroke="#22d3ee" stroke-width="2" stroke-opacity="0.5"/>
    <circle cx="150" cy="60" r="14" fill="#22d3ee"/>
    <circle cx="70" cy="170" r="11" fill="#34d399"/>
    <circle cx="230" cy="170" r="11" fill="#101820" stroke="#94a3b1" stroke-width="2"/>
    <circle cx="150" cy="250" r="11" fill="#101820" stroke="#94a3b1" stroke-width="2"/>
  </svg>
  <h1>${esc(resume.basics.name)}</h1>
  <p class="label">${esc(resume.basics.label)}</p>
  <p class="headline">${esc(resume.x_meta.headlines[0].text)}</p>
  <p class="url">${esc(resume.basics.url.replace(/^https?:\/\//, ''))}</p>
</body></html>`

mkdirSync(join(root, 'public/images'), { recursive: true })
const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] })
try {
  const page = await browser.newPage()
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 })
  await page.setContent(html, { waitUntil: 'networkidle0' })
  await page.screenshot({ path: join(root, 'public/images/og.png') })
} finally {
  await browser.close()
}
console.log('✔ public/images/og.png generated from data/resume.json')
