/**
 * Prints the /cv route of the built site to public/<Name>_CV.pdf
 * (and into dist/ so the deploy artifact carries it).
 *
 * Per CV_PDF_Layout_Spec.md:
 *  - serves the built dist/ over a small static server, prints /cv with
 *    Puppeteer;
 *  - waits for document.fonts.ready so Carlito metrics are real;
 *  - margins come from @page in the print CSS, not from Puppeteer;
 *  - the phone number comes only from the CV_PHONE env var (a repo secret in
 *    CI), passed as a query parameter — never from committed JSON.
 *
 * Page count is reported, not asserted: the CV legitimately grows and shrinks
 * with the content in resume.json.
 *
 * Every step is bounded by a timeout and logged. An earlier version spawned
 * `npx vite preview` with its output piped nowhere and no timeouts anywhere —
 * when Chrome stalled on CI the job hung silently for as long as the runner
 * allowed, with nothing in the log to say where. Hence: no child process, and
 * nothing here can wait forever.
 *
 * Requires `npm run build` first. Run locally: `CV_PHONE=+91... npm run build:pdf`.
 */
import { createServer } from 'node:http'
import { copyFileSync, existsSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, extname, join, normalize } from 'node:path'
import puppeteer from 'puppeteer'
import { PDFDocument } from 'pdf-lib'
import { cvFileName } from './lib/site-meta.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const PORT = 4173
const STEP_TIMEOUT_MS = 60_000

if (!existsSync(join(dist, 'index.html'))) {
  console.error('✖ dist/index.html not found — run `npm run build` before build:pdf.')
  process.exit(1)
}

const phone = process.env.CV_PHONE ?? ''
if (!phone) console.warn('⚠ CV_PHONE is not set — the PDF will omit the phone number.')

/** Fail loudly instead of hanging, and say which step it was. */
const withTimeout = async (label, promise, ms = STEP_TIMEOUT_MS) => {
  let timer
  const started = Date.now()
  try {
    const result = await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`timed out after ${ms / 1000}s`)), ms)
      }),
    ])
    console.log(`  ✓ ${label} (${((Date.now() - started) / 1000).toFixed(1)}s)`)
    return result
  } catch (err) {
    console.error(`  ✖ ${label}: ${err.message}`)
    throw err
  } finally {
    clearTimeout(timer)
  }
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.pdf': 'application/pdf',
}

// Plain static server over dist/ — no child process, no npx, nothing that can
// block on a pipe. Directory paths resolve to index.html, which is how /cv
// works (the build emits dist/cv/index.html).
const server = createServer((req, res) => {
  const path = decodeURIComponent((req.url ?? '/').split('?')[0])
  let file = join(dist, normalize(path).replace(/^(\.\.[/\\])+/, ''))
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html')
  if (!file.startsWith(dist) || !existsSync(file)) {
    res.statusCode = 404
    return res.end('not found')
  }
  res.setHeader('Content-Type', MIME[extname(file)] ?? 'application/octet-stream')
  res.end(readFileSync(file))
})

const resume = JSON.parse(readFileSync(join(root, 'data/resume.json'), 'utf8'))
const outFile = cvFileName(resume.basics.name)
const outPath = join(root, 'public', outFile)

let browser
try {
  await withTimeout(
    'static server listening',
    new Promise((resolve, reject) => {
      server.once('error', reject)
      server.listen(PORT, '127.0.0.1', resolve)
    }),
    15_000,
  )

  browser = await withTimeout(
    'chrome launched',
    puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        // CI runners give containers a tiny /dev/shm; without this Chrome can
        // stall indefinitely instead of erroring.
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
      timeout: STEP_TIMEOUT_MS,
    }),
  )

  const page = await browser.newPage()
  page.setDefaultTimeout(STEP_TIMEOUT_MS)
  page.setDefaultNavigationTimeout(STEP_TIMEOUT_MS)
  page.on('pageerror', (err) => console.warn(`  ⚠ page error: ${err.message}`))

  const url = `http://127.0.0.1:${PORT}/cv?print=1${phone ? `&phone=${encodeURIComponent(phone)}` : ''}`
  await withTimeout(
    `loaded ${url.replace(/phone=[^&]*/, 'phone=***')}`,
    page.goto(url, { waitUntil: 'networkidle0' }),
  )

  // The self-hosted Carlito must be loaded before printing or metrics shift.
  await withTimeout(
    'fonts ready',
    page.evaluate(() => document.fonts.ready),
    30_000,
  )

  await withTimeout(
    'pdf rendered',
    page.pdf({
      path: outPath,
      preferCSSPageSize: true,
      printBackground: false,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
    }),
  )
} finally {
  if (browser) await browser.close().catch(() => {})
  server.close()
}

const pageCount = (await PDFDocument.load(readFileSync(outPath))).getPageCount()

// The deploy artifact is dist/ — carry the PDF into it.
copyFileSync(outPath, join(dist, outFile))

console.log(
  `✔ public/${outFile} generated from data/resume.json (${pageCount} pages, v${resume.x_meta.version})`,
)
